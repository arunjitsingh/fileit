// Dependencies.
var fs = require('fs');
var path = require('path');
var auth = require('./auth/req');

var json  = JSON.stringify,
    parse = JSON.parse;

module.exports = function(app) {
    var DOWNLOAD = '/download/:uri(*)';
    
    
    // All requests to `/download` will be received here. This will send
    // a file specified by the `uri` to the client
    app.all(DOWNLOAD, function(request, response) {
        var uri = request.param('uri', '/');
        var dl  = request.param('download') ? true : false;
        // Authenticate user
        var user = auth(request);
        if (!user) {
            response.contentType('json');
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var filepath = path.join(app.userDir, user.id||user._id, uri);
        fs.stat(filepath, function(err, stat) {
            if (err) {
                response.contentType('json');
                response.send(json({error: "Error accessing file", where:uri}), 500);
                return;
            }
            if (stat.isDirectory()) {
                response.contentType('json');
                response.send(json({error: "Directories cannot be downloaded yet", where:uri}), 501);
                return;
            } else {
                if (dl) {
                    // Send the file as a download (will open "Download"/etc panels)
                    console.log("Attaching file ", filepath);
                    response.download(filepath);
                } else {
                    // Simply send the file like a static resource. Useful for `src`
                    // attributes of HTML elements
                    console.log("Sending file ", filepath);
                    response.sendfile(filepath);
                }
            }
        });
    });
};