var request = require('request')
var picLink = "https://prescribe.blob.core.windows.net/sketches/sketch.png"
data = {'url': picLink , "appId":("", "14604c7e-062d-4e5e-be44-fc3560c63d2f")}

request.post({url:'http://demo.nanonets.ai/ImageCategorization/Label/', formData: data}, function optionalCallback(err, httpResponse, body) {
  if (err) {
    return console.error('upload failed:', err);
  }
  console.log("body: ", body)
  var json = JSON.parse(body);
  choices = json["result"][0].prediction;

  max = choices[0].probability;
  res = choices[0].label;
  console.log( choices[0].label , ":", choices[0].probability);

  for (i = 1; i < choices.length; i++){
    if (max < choices[i].probability ){
      max = choices[i].probability;
      res = choices[i].label;

    }
    console.log( choices[i].label , ":", choices[i].probability);
  }
   console.log("Answer: ", res);
});
  //console.log("Answer: ", res);