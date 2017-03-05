var https = require('https'); //Https module of Node.js
  var fs = require('fs'); //FileSystem module of Node.js
  var FormData = require('form-data'); //Pretty multipart form maker.
  var request = require('request')

  var form = new FormData(); //Create multipart form


  var access_token = 'EAACEdEose0cBALlDqbXAan78ZBp8ReRKH2naOTOAUCuZBHPauj7euJVAUbv5frUajbWZAWGFsVxhNaJHVOoENNYZAKWaCEjOqHnLBR6Ua9FHpLHeIVPiZBoZBWTrPwTFHwxWezwrnVXDfzm1EgKgZCCBiFIyiEZCyMjIivofYvHE4LiJhVN9bTBsn6nHeXbvD9cZD',
    pageid = 'me',
    fburl = 'https://graph.facebook.com/'
            + pageid
            + '/photos?access_token='
            + access_token,
    req,
    form;

  var picLink = 'https://prescribe.blob.core.windows.net/sketches/sketch.png'

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

