// Variables from Configuration file
var config = require("../config.js");

var gamepediaAPI = config.gamepediaAPI;
var exileBot = config.exileBot;
var htmlparser = config.htmlparser;
var request = config.request;

// Checks if this unique item exists on Path of Exile wiki
function checkIfItemExists(itemName, msg){
  request.get(gamepediaAPI+itemName, function(err,res,body){
    if(err){
      exileBot.sendMessage(msg.chat.id, "I'm sorry, but something went wrong when fetching your item. Try again, maybe?");
    }
    if(res.statusCode == 200 ){
      var data = JSON.parse(res.body);

      if(data[1].length === 0){
        exileBot.sendMessage(msg.chat.id, "I couldn't find it. Are you sure the item name is correct?");
      }else{

        var itemName;
        var url;
        var multipleOcurrences = false;

        // Checks if there are more than ony of that item.
        // Vessel of Vinktar is infamous for that. Thanks, GGG.
        // What do? I choose to inform the user and let him decide.
        // Trying with greater than two to see if solves for items like
        // The Scourge unique claw. Freaking talisman league fml.
        if(data[1].length == 2){
          itemName = data[1][0].toString();
          url = data[3][0].toString();

        }else if(data[1].length > 2){
          itemName = data[1][1].toString();
          url = data[3][1].toString();

          multipleOcurrences = true;
        }else{
           itemName = data[1].toString();
           url = data[3].toString();
        }

        getUniqueItem(itemName, url, msg, multipleOcurrences)
      }

    }
  });
}

// Retrieves item info. Sends image to user.
// It's quite low quality and takes a while to load.
// TODO: calculate box size before generating image!
// This was deemed too slow to be used, but it might be useful
// for someone, for some reason.
function getUniqueItemImage(itemName, wikiPage, msg){

    // I was having isseus with the window size. Yes, this is a workaround. No, this ain't pretty.
    var options = {
      siteType: 'url',
      windowSize: { width: 1024, height: 920 },
      shotSize: { width: 800, height: 920 },
      shotOffset: {left: 709, right:470, top: 326, bottom: 448},
      streamType: 'jpg',
      quality: 100
    }

    var name = itemName + '__' + msg.chat.id + '.jpg';

    webshot(wikiPage, name, options, function(err) {
      exileBot.sendPhoto(msg.chat.id, name).then(function(){
         fs.unlink(name, function(e){
         })
      });

    });

}


// Retrieves item info. Sends image to user.
function getUniqueItem(itemName, wikiPage, msg, multipleOcurrences){

  var url = `https://pathofexile.gamepedia.com/api.php?action=parse&page=${itemName}&format=json`;

  request.get(url, function(err,res,body){
    if(err){
      console.log("Something went very, very wrong.");
      exileBot.sendMessage(msg.chat.id, "I'm sorry, but something went wrong when fetching your item. Try again, maybe?");
    }

    if(res.statusCode == 200 ){
      var data = JSON.parse(res.body);
      var filter = '/></a></span></span>';
      var uniqueFilter = '<span class=\\"infobox-page-container\\"><span class=\\"item-box -unique\\">';
      var dom = data.parse.text["*"];
      var begin = dom.search(filter);
      dom = dom.substring(0,begin + filter.length);

      // Searches to see if the infobox has the -unique class.
      // If it doesn't, the item isn't unique, so...
      var isUnique = dom.search(uniqueFilter);

      if(isUnique < 0){
        exileBot.sendMessage(msg.chat.id, "The item you searched for isn't Unique.");
        return;
      }


      var output = "";
      var currentAtt = "";

      // Parse HTML to search for tags
      var parser = new htmlparser.Parser({
          onopentag: function(name, attribs){
              currentAtt = attribs.class;

              // Checking some specific html tags
              if(name === "span" && attribs.class === "group"){
                output += "\n";
              }

              if(name === "br"){
                output += "\n";
              }

              // Formatting for some classes...
              switch(attribs.class){
                case "header -double":
                output += "<b>";
                break;

                case "group -textwrap tc -flavour":
                output += "\n\n<i>";
                break;

                case "header -double":
                output += "\n";
                break;

                case "group -textwrap tc -mod":
                output += "\n";
                break;

                case "group -textwrap tc -help":
                output += "\n( ";
                break;
              }

          },
          ontext: function(text){

              if(currentAtt === "group"){
                output += "\n\n";
              }

              output += text;

              // Closing bold for the item name
              if(currentAtt === "header -double"){
                output += "</b>";
              }

              if(currentAtt === "group -textwrap tc -help"){
                output += " )";
              }


          },
          onclosetag: function(tagname){
              if(tagname === "span"){
                output += "\n";
              }

          }
      }, {decodeEntities: true});
      parser.write(dom);
      parser.end();

      output += "</i>";
      //console.log(output);

      var wikiMessage = "";

      if(multipleOcurrences){
        wikiMessage = "There is more than one version of the item you are searching for.\n" +
        "This is one of them, but you should check wiki for others.\n\n"
      }

      // Sends wiki link back to chat
      exileBot.sendMessage(msg.chat.id, `${wikiMessage}${wikiPage}`).then(function(){
        // Sends formatted item info back to chat
        exileBot.sendMessage(msg.chat.id, output , { parse_mode: "HTML" });
      });

    }
  });
}

exports.Unique = checkIfItemExists;
