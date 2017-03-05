var https = require('https'); //Https module of Node.js
  var fs = require('fs'); //FileSystem module of Node.js
  var FormData = require('form-data'); //Pretty multipart form maker.
  var request = require('request')

  var form = new FormData(); //Create multipart form


  var access_token = 'EAACEdEose0cBALChZC1UZAs2ILzFloPLzYjs7TPcX7ZBpSN4JRhWxsIOysEL8ZAZBPU1L0Ye13Bg4lrHztQ9EZBKaw1RnsGK8TzPRAo9d2wwZCEXhbT14yiQWCZB7GzrDgFtDSkEn3rTDywOMhCxae5ckTSG4y0NZCO09tp0NjfZCXG1ZCiNdaFEZCrssXLfIObfbZCgZD',
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

