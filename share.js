var auth = require('./auth/req');
var path = require('path');
var json = JSON.stringify;

module.exports = function(app) {
    
    var USERS = require('./auth/users')(app._DB);
    
    var kShared = 'shared';
    var kFriends = 'friends';
    var kCDN = 'cdn';
    
    // Get share listing for logged in user
    app.get('/shared', function(request, response) {
        
        var user = auth(request);
        if (!user) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        if (user.shared) {
            var shared = user.shared;
            response.send(json({ok: true, content:shared}), 200);
        } else {
            response.send(json({error:"Not found"}), 404);
        }
        
    });
    
    // Share file with user
    app.post('/share/:id/:uri(*)', function(request, response) {
        
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var uid = user.id || user. _id;
        var id = request.param('id') || null;
        if (!id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        var uri = request.param('uri');
        if (!uri) {
            response.send(json({error:"Invalid request. No URI sent"}), 400);
            return;
        }
        
        var link = path.join(uid, uri);
        USERS.pushValue(id, kShared, link, function(err, dbres) {
            if (err) {
                response.send(json({error:err.error}), err.status);
            } else {
                response.send(json({ok:true}), 200);
            }
        });
        
        
    });
    
    
    app.get('/-s/:id/:uri(*)', function(request, response) {
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var uid = user.id || user. _id;
        var id = request.param('id') || null;
        if (!id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        var uri = request.param('uri');
        if (!uri) {
            response.send(json({error:"Invalid request. No URI sent"}), 400);
            return;
        }
        var dl  = request.param('download') ? true : false;
        var p = path.join(id, uri);
        
        USERS.has(uid, kShared, p, function(has) {
            if (!has) {
                response.send(json({error:'Not found'}), 404);
            } else {
                var filepath = path.join(app.userDir, p);
                if (dl) {
                    console.log("Attaching file ", filepath);
                    response.download(filepath);
                } else {
                    console.log("Sending file ", filepath);
                    response.sendfile(filepath);
                }
            }
        });
    });
    
    
    // Add URI for CDN access
    app.post('/-/:uri(*)', function(request, response) {
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var id = user.id || user. _id;
        var uri = request.param('uri');
        if (!uri) {
            response.send(json({error:"Invalid request. No URI sent"}), 400);
            return;
        }
        
        USERS.pushValue(id, kCDN, uri, function(err, dbres) {
            if (err) {
                response.send(json({error:err.error}), err.status);
            } else {
                response.send(json({ok:true}), 200);
            }
        });
        
        
    });
    
    app.get('/-/:id/:uri(*)', function(request, response) {
        var id = request.param('id') || null;
        if (!id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        var uri = request.param('uri');
        if (!uri) {
            response.send(json({error:"Invalid request. No URI sent"}), 400);
            return;
        }
        var dl  = request.param('download') ? true : false;
        
        USERS.has(id, kCDN, uri, function(has) {
            if (!has) {
                response.send(json({error:'Not found'}), 404);
            } else {
                var filepath = path.join(app.userDir, id, uri);
                if (dl) {
                    console.log("Attaching file ", filepath);
                    response.download(filepath);
                } else {
                    console.log("Sending file ", filepath);
                    response.sendfile(filepath);
                }
            }
        });
    });
};