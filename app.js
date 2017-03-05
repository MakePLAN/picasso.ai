const restify = require('restify')
const builder = require('botbuilder')
const config = require('./config.js')
var Q = require('q');
var request = require('request')
//
//    Bot stuff
//

var concepts = ['Car', 'Campfire', 'Windmill', 'Hammer'];
var imgRes = Q.defer();
var objRes = Q.defer();
var fbRes = Q.defer();

var fbToken = 'EAACEdEose0cBALlDqbXAan78ZBp8ReRKH2naOTOAUCuZBHPauj7euJVAUbv5frUajbWZAWGFsVxhNaJHVOoENNYZAKWaCEjOqHnLBR6Ua9FHpLHeIVPiZBoZBWTrPwTFHwxWezwrnVXDfzm1EgKgZCCBiFIyiEZCyMjIivofYvHE4LiJhVN9bTBsn6nHeXbvD9cZD';

//promise for firebase
var picReady = Q.defer(); //promise to wait for picture to be uploaded

//Firebase stuff
var admin = require('firebase-admin');
var serviceAccount = require("./secret.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://holosketch-a7db7.firebaseio.com/"
});

// Get a database reference to our posts
var db = admin.database();
var ref = db.ref("storage");

// Attach an asynchronous callback to read the data at our posts reference
ref.on("child_changed", function(snapshot) {

  if (snapshot.key == "picTaken" && snapshot.val() == 0){
    picReady.resolve(true)
  //call api 
  }
  //console.log(snapshot.key);
  //console.log(snapshot.val());

}, function (errorObject) {
  console.log("The read failed: " + errorObject.code);
});

// Connection to Microsoft Bot Framework
const connector = new builder.ChatConnector({
  appId: config.appId,
  appPassword: config.appPassword,
})
const bot = new builder.UniversalBot(connector)
// Event when Message received
bot.dialog('/', (session) => {
  //console.log(session.message.text)
  
  
  var card = createImageCard(session, "Welcome back, Ben!", 'https://s-media-cache-ak0.pinimg.com/originals/e6/b7/33/e6b733e17b68a922253ca0f0428a569e.gif');
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);
  


  session.replaceDialog('/greeting');
})

bot.dialog('/greeting', (session) => {
	//session.send("Welcome back, Ben!");
	session.send("How do you like to start today?");
	var card = createChoiceCard(session);
	var msg = new builder.Message(session).addAttachment(card);
	session.send(msg);
	session.endDialog();
  	//console.log(session.message.text)
})

bot.beginDialogAction('choice', '/choice');
bot.dialog('/choice', (session, data) => {
  //console.log(session.message.text)
  session.send("Pick from following: ");
  var card = createConceptCard(session);
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);
  session.endDialog();
})



bot.beginDialogAction('suggest', '/suggest');
bot.dialog('/suggest', (session) => {
  //console.log(session.message.text)
  session.send("Theme of the day:");
  var words = session.message.text.split("=");
  var target = words[1];
  console.log("target: ", target)
  //session.userData.target = target;
  session.send(target);
  

  //recommendation image reference here

  callImageAPI(target, 3);

  imgRes.promise.done(
    function(result){
      imgRes = Q.defer()
      //console.log('result: ', result);
      for (var i = 0; i < result.length; i++ ){
        //console.log('Name: ', result[i].name);
        //console.log('Url: ', result[i].url);
        var card = createImageCard(session, result[i].name, result[i].url);
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
      }

      session.replaceDialog('/waiting');
    }
  );

  //var result = callImageAPI(target);
  
})

bot.beginDialogAction('ready', '/ready');
bot.dialog('/ready', (session) => {
  //console.log(session.message.text)
  session.send("Great.");
  session.send("Go ahead and start your sketch. :)");
  session.replaceDialog('/waiting');
})

bot.dialog('/waiting', (session) => {
  //console.log('target: ', session.userData.target)
  session.send("Waiting for sktech....");
  var card = createSketchCard(session);
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);
  session.endDialog();
})

bot.beginDialogAction('result', '/result');
bot.dialog('/result', (session) => {
  updatePicTaken();
  //console.log(session.message.text)
  var card = createImageCard(session, "Analyzing...", 'https://media.giphy.com/media/9fbYYzdf6BbQA/giphy.gif');
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);

  

  //analyzing the image
  
  picReady.promise.done(function(){
    picLink = 'https://prescribe.blob.core.windows.net/sketches/sketch.png'; //link for the picture 
    //picLink = 'https://firebasestorage.googleapis.com/v0/b/holosketch-a7db7.appspot.com/o/sketch%20(9).png?alt=media&token=feb33f50-ea20-4ecb-8399-19ddfdc6dc66';
    session.userData.picLink = picLink;
    session.send("I see that you draw...");
    var card = createWordCard(session, "Click here to view", picLink);
    var msg = new builder.Message(session).addAttachment(card);
    session.send(msg);

    picReady = Q.defer();
    imageVisionAPI(picLink);
    
    objRes.promise.done(function(res){
      objRes = Q.defer()
      session.send(res + "!");
      session.replaceDialog('/social');
    });
  })

  
})

bot.dialog('/social', (session) => {
  //console.log('target: ', session.userData.target)
  var card = createSocialCard(session);
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);
  session.endDialog();
})

bot.beginDialogAction('postFB', '/postFB');
bot.dialog('/postFB', (session) => {
  //console.log(session.message.text)
  var card = createImageCard(session, "Posting to your Social Media...", "https://d13yacurqjgara.cloudfront.net/users/12755/screenshots/1037374/hex-loader2.gif");
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);
  console.log("Link: ", picLink);
  fbPostAPI(session.userData.picLink);
  fbRes.promise.done(function(){
    fbRes = Q.defer();
    session.send("Succesfully posted to Social Media!");
    session.replaceDialog('/finish');
  })
  
})

bot.beginDialogAction('finish', '/finish');
bot.dialog('/finish', (session) => {
  //console.log(session.message.text)
  var card = createImageCard(session, "Congratulation! You created an artwork today!", "https://bestanimations.com/Holidays/Fireworks/fireworks/ba-blue-red-fireworks-colorful-pretty-gif-pic.gif");
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);
  session.send("See you again.");
  session.endDialog();
})

function createChoiceCard(session){
	return new builder.HeroCard(session)
        .buttons([
            builder.CardAction.dialogAction(session, 'ready', '', 'I have an idea!'),
            builder.CardAction.dialogAction(session, 'choice', '', 'Suggest me one!')
        ]);
}

function createSocialCard(session){
  return new builder.HeroCard(session)
        .title("Do you want to post your work to your Social Media?")
        .buttons([
            builder.CardAction.dialogAction(session, 'postFB', '', 'Of Course!'),
            builder.CardAction.dialogAction(session, 'finish', '', 'Not Today!')
        ]);
}

function createSketchCard(session){
	return new builder.HeroCard(session)
        .buttons([
            builder.CardAction.dialogAction(session, 'result', '', 'Done Sketch!')
        ]);
}

function createImageCard(session, title, url){
  return new builder.HeroCard(session)
        .title(title)
        .images([
            builder.CardImage.create(session, url)
        ]);
}

function createConceptCard(session){
	var choices = [];
	for (var i = 0; i < concepts.length; i++){
		choices.push( builder.CardAction.dialogAction(session, 'suggest', concepts[i] , concepts[i]) );
	}

	return new builder.HeroCard(session)
        .buttons( choices );
}

//example
function createHeroCard(session) {
    return new builder.HeroCard(session)
        .title('BotFramework Hero Card')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.')
        .images([
            builder.CardImage.create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started')
        ]);
}

function createAnimationCard(session) {
    return new builder.AnimationCard(session)
        .title('Microsoft Bot Framework')
        .subtitle('Animation Card')
        .image(builder.CardImage.create(session, 'https://docs.botframework.com/en-us/images/faq-overview/botframework_overview_july.png'))
        .media([
            { url: 'http://i.giphy.com/Ki55RUbOV5njy.gif' }
        ]);
}

function createVideoCard(session) {
    return new builder.VideoCard(session)
        .title('Big Buck Bunny')
        .subtitle('by the Blender Institute')
        .text('Big Buck Bunny (code-named Peach) is a short computer-animated comedy film by the Blender Institute, part of the Blender Foundation. Like the foundation\'s previous film Elephants Dream, the film was made using Blender, a free software application for animation made by the same foundation. It was released as an open-source film under Creative Commons License Attribution 3.0.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg'))
        .media([
            { url: 'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://peach.blender.org/', 'Learn More')
        ]);
}

function createWordCard(session, title, pictureLink) {
    return new builder.ThumbnailCard(session)
        .buttons([
            builder.CardAction.openUrl(session, pictureLink, title)
        ]);
        
}

function randomNum () {
    return Math.floor(Math.random() % 3);
}

function callImageAPI(word, num){
  var Client = require('node-rest-client').Client;

  var client = new Client();

  var args = {
      headers: { "Ocp-Apim-Subscription-Key": "8c73d34c22be4d96a9cc410579c8ca01" } // request headers 
  };


  client.post("https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=" + word + " artwork&count=3&offset=0&mkt=en-us&safeSearch=Moderate", args, function (data, response) {
      // parsed response body as js object 
      //console.log(data.value);

      var result = [];      

      for (var i = 0; i < num; i++ ){
        var url = data.value[i].contentUrl.split(":");
        var temp = {
          "name" : data.value[i].name,
          "url" : url[0] + 's:' + url[1]
        };
        //console.log('Name: ', data.value[i].name);
        //console.log('Url: ', url[0] + 's:' + url[1]);
        result.push(temp);
      }

      imgRes.resolve(result);

  });
}

function imageVisionAPI(picLink){
  data = {'url': picLink , "appId":("", "a8fedc0d-940b-475d-ab5b-a33a18e6b9df")}

request.post({url:'http://demo.nanonets.ai/ImageCategorization/Label/', formData: data}, function optionalCallback(err, httpResponse, body) {
  if (err) {
    return console.error('upload failed:', err);
  }
  
  var json = JSON.parse(body);
  choices = json["result"][0].prediction;

  max = choices[0].probability;
  res = choices[0].label;
  console.log(choices[0].label , ": ",  choices[0].probability  )

  for (i = 1; i < choices.length; i++){
    if (max < choices[i].probability ){
      max = choices[i].probability;
      res = choices[i].label;
    }
    console.log(choices[i].label , ": ",  choices[i].probability  )
  }

  updateObj(res);
  objRes.resolve(res);
  console.log("Answer: ", res);

})

}

function fbPostAPI(picLink){
  var https = require('https'); //Https module of Node.js
  var fs = require('fs'); //FileSystem module of Node.js
  var FormData = require('form-data'); //Pretty multipart form maker.

  var form = new FormData(); //Create multipart form

  var access_token = fbToken,
    pageid = 'me',
    fburl = 'https://graph.facebook.com/'
            + pageid
            + '/photos?access_token='
            + access_token,
    req,
    form;

  req = request.post(fburl, function(err, res, body) {
    if (err)
      return console.error('Upload failed:', err);
    console.log('Upload successful!');
  });
  form = req.form()
  // append a normal literal text field ...
  form.append('message', 'Posting from HoloSketch');
  // or append the contents of a remote url ...
  form.append('source', request(picLink) ) ;

  fbRes.resolve(true);

}

function updateObj(objectName){
  ref.update({
    "object": objectName
  });
}

function updatePicTaken(){
  ref.update({
    "picTaken": 1
  });
}



// Server Init for bot
const server = restify.createServer()
server.listen(process.env.PORT || 8080)
server.post('/', connector.listen())




