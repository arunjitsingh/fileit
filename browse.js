// Dependencies.
var path = require('path');

var auth = require('./auth/req');
var FI = require('./file/info');
var FO = require('./file/ops');

var json  = JSON.stringify,
    parse = JSON.parse;

module.exports = function(app) {
    
    var BROWSE = '/browse/:uri(*)?';
    var userDir = app.userDir;
    
    // (GET) file information for a URI.
    // Uses `file/info`. See [file/info.js](./file/info.html)
    app.get(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.param('uri', '/');
        // Authenticate user
        var user = auth(request);
        if (!user) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var options = {
            root: path.join(userDir, user.id||user._id)
        };
        // Send information about the file at the URI.
        // Appropriately handle errors
        FI.info(uri, options, function(err, info) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true, content:info}), 200);
            }
        });
    });
    
    
    // Create a new directory at URI (POST)
    // Uses `file/ops`. See [file/info.js](./file/ops.html)
    app.post(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.param('uri', '/');
        // Authenticate user
        var user = auth(request);
        if (!user) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var options = {
            root: path.join(userDir, user.id||user._id)
        };
        
        // Create a new directory at the URI.
        // Appropriately handle errors
        FO.mkdir(uri, options, function(err) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true}), 201);
            }
        });
    });
    
    // Rename a file/directory at URI (PUT)
    // Uses `file/ops`. See [file/info.js](./file/ops.html)
    app.put(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.param('uri', '/');
        var to = request.body.id || request.query.id;
        // User did not send a new file name (as `id`). Server expects
        // either JSON encoded body: `{"id":"new/file/path"}`
        // or querystring: `id=new/file/path`.
        if (!to || to === '') {
            response.send(json({error:"Send `id` in JSON object or as querystring",
                where:uri}), 400);
            return;
        }
        
        // Authenticate user
        var user = auth(request);
        if (!user) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var options = {
            root: path.join(userDir, user.id||user._id)
        };
        
        // Rename the file at the URI.
        // Appropriately handle errors
        FO.rename(uri, to, options, function(err) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true}), 200);
            }
        });
    });
    
    // Delete file/directory at URI
    // Uses `file/ops`. See [file/info.js](./file/ops.html)
    app.del(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.param('uri', '/');
        // Authenticate user
        var user = auth(request);
        if (!user) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var options = {
            root: path.join(userDir, user.id||user._id),
            trash: app.trashDir
        };
        
        // Delete the file at the URI.
        // Appropriately handle errors
        FO.del(uri, options, function(err) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true}), 200);
            }
        });
    });
};