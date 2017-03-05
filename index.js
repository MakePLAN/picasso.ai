const restify = require('restify')
const builder = require('botbuilder')
const config = require('./config.js')
var Q = require('q');
var request = require('request')
var sleep = require('sleep')

/*
//
// socket server
//
var net = require('net');

var HOST = '10.5.0.10';
var PORT = 9999;

net.createServer(function(sock) {
    
    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    
    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        
        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        // Write the data back to the socket, the client will receive it as data from the server
        //sock.write('You said "' + data + '"');
        
    });
    
    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });
    
}).listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);

//
//  socket client
//
var HOST1 = '10.5.0.10';
var PORT1 = 9999;

var client = new net.Socket();
client.connect(PORT1, HOST1, function() {

    console.log('CONNECTED TO: ' + HOST1 + ':' + PORT1);
    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client 
    //client.write('I am Chuck Norris!');

});

// Add a 'data' event handler for the client socket
// data is what the server sent to this socket
client.on('data', function(data) {
    
    console.log('DATA: ' + data);
    // Close the client socket completely
    client.destroy();
    
});

// Add a 'close' event handler for the client socket
client.on('close', function() {
    console.log('Connection closed');
});

*/
//
//    Bot stuff
//

var concepts = ['Car', 'Campfire', 'Windmill', 'Hammer'];
var imgRes = Q.defer();
var objRes = Q.defer();
var fbRes = Q.defer();

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
  //console.log(session.message.text)
  var card = createImageCard(session, "Analyzing...", 'https://media.giphy.com/media/9fbYYzdf6BbQA/giphy.gif');
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);

  picLink = 'https://prescribe.blob.core.windows.net/sketches/hammer.png'; //link for the picture 
  session.userData.picLink = picLink;

  var card = createImageCard(session, "", picLink);
  var msg = new builder.Message(session).addAttachment(card);
  session.send(msg);

  //analyzing the image
  
  imageVisionAPI(picLink);
  session.send("I see that you draw...");
  objRes.promise.done(function(res){
    objRes = Q.defer()
    session.send(res + "!");
    session.replaceDialog('/social');
  });
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
  data = {'url': picLink , "appId":("", "14604c7e-062d-4e5e-be44-fc3560c63d2f")}

request.post({url:'http://demo.nanonets.ai/ImageCategorization/Label/', formData: data}, function optionalCallback(err, httpResponse, body) {
  if (err) {
    return console.error('upload failed:', err);
  }
  
  var json = JSON.parse(body);
  choices = json["result"][0].prediction;

  max = choices[0].probability;
  res = choices[0].label;

  for (i = 1; i < choices.length; i++){
    if (max < choices[i].probability ){
      max = choices[i].probability;
      res = choices[i].label;
    }
  }
  objRes.resolve(res);
  //console.log("Answer: ", res);

})


}

function fbPostAPI(picLink){
  var https = require('https'); //Https module of Node.js
  var fs = require('fs'); //FileSystem module of Node.js
  var FormData = require('form-data'); //Pretty multipart form maker.

  var form = new FormData(); //Create multipart form

  var access_token = 'EAACEdEose0cBANL8eIak6tm8fDtKGvsyzHV3BO4jGBkOorSPqseegB9PiOWtUMJAnbf9PSZBzOz3NnJEWJ9c0FSClk0ZB7i5bO9dnFI15PUD8BrYarxAibCaASfNlTYoXILZCSjyicNxoZAUbeRCwY1j0izYZArnJtGGnCZAZB5xIhJ7HPqshzfvpBagRdI3x4ZD',
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
  form.append('message', 'Posting from Picasso');
  // or append the contents of a remote url ...
  form.append('source', request(picLink) ) ;

  fbRes.resolve(true);

}


// Server Init for bot
const server = restify.createServer()
server.listen(process.env.PORT || 8080)
server.post('/', connector.listen())




