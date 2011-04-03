var fs = require('fs');
var formidable = require('formidable'),
    path = require('path'),
    auth = require('./auth/req');

var json = JSON.stringify,
    parse = JSON.parse;

module.exports = function(app) {
    
    var UPLOAD = '/upload/:uri(*)?';
    app.post(UPLOAD, function(request, response) {
        
        var uri = request.param('uri') || '/';
        // Authenticate user
        var user = auth(request);
        if (!user) {
            response.contentType('json');
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var filepath = path.join(app.userDir, user.id||user._id, uri);
        var filename = "";
        var tmppath = '';
        var form = new(formidable.IncomingForm)();
        form.keepExtensions = true;
        form.uploadDir = app.tempDir;

        form
          .on('field', function(field, value) {
            console.log(">>>", field, value);
          })
          .on('file', function(field, file) {
            console.log(">>>", field, file);
            filename = file.name;
            tmppath = file.path;
          })
          .on('end', function() {
              fs.rename(tmppath, path.join(filepath, filename), function(err) {
                  response.contentType('json');
                  if (err) {
                      response.send(json({error:"Could not move file to folder"}), 500);
                  } else {
                      response.send(json({ok:true}), 200);
                  }
              });
          });
        form.parse(request);
    });
};