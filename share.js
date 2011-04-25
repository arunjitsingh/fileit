var auth = require('./auth/req');
var path = require('path');
var FI = require('./file/info');
var json = JSON.stringify;
module.exports = function(app) {
    
    var USERS = require('./auth/users')(app._DB);
    
    var kShared = 'shared';
    var kFriends = 'friends';
    var kCDN = 'cdn';
    
    // Get share listing for logged in user
    app.get('/shared', function(request, response) {
        
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var id = user.id || user._id;
        
        USERS.getUser(id, function(err, userDoc) {
            if (err) {
                response.send(json({error:err.error}), err.status);
                return;
            }
            auth(request, userDoc);
            if (userDoc[kShared]) {
                response.send(json({ok: true, content: userDoc[kShared]}), 200);
            } else {
                response.send(json({error:"Not found"}), 404);
            }
        });
        
    });
    
    app.get('/shared/:id/:uri(*)', function(request, response) {
        response.contentType('json');
        
        // Authenticate user
        var user = auth(request);
        if (!user) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var id = request.param('id', null);
        if (!id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        var uri = request.param('uri', null);
        if (!uri) {
            response.send(json({error:"Invalid request. No URI sent"}), 400);
            return;
        }
        var options = {
            root: path.join(app.userDir, id)
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
    
    // Share file with user
    app.post('/share/:id/:uri(*)', function(request, response) {
        
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var uid = user.id || user. _id;
        var id = request.param('id', null);
        if (!id || uid === id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        var uri = request.param('uri', null);
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
    
    // Download shared file
    app.all('/-s/:id/:uri(*)', function(request, response) {
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var uid = user.id || user. _id;
        var id = request.param('id', null);
        if (!id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        var uri = request.param('uri', null);
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
    
    app.get('/-info/:uri(*)', function(request, response) {
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var id = user.id || user._id;
        var uri = request.param('uri', null);
        if (!uri) {
            response.send(json({error:"Invalid request. No URI sent"}), 400);
            return;
        }
        USERS.has(id, kCDN, uri, function(has) {
            response.send(json({ok:true, exists:has}), 200);
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
        var uri = request.param('uri', null);
        if (!uri) {
            response.send(json({error:"Invalid request. No URI sent"}), 400);
            return;
        }
        
        USERS.pushValue(id, kCDN, uri, function(err, dbres) {
            if (err) {
                response.send(json({error:err.error}), err.status);
            } else {
                var u = path.join('/-', id, uri);
                response.send(json({ok:true, uri:u}), 200);
            }
        });
        
        
    });
    
    // CDN get
    app.get('/-/:id/:uri(*)', function(request, response) {
        var id = request.param('id', null);
        if (!id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        var uri = request.param('uri', null);
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
    
    
    
    // Friends    
    app.get('/friends', function(request, response) {
        
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var id = user.id || user._id;
        
        USERS.getUser(id, function(err, userDoc) {
            if (err) {
                response.send(json({error:err.error}), err.status);
                return;
            }
            auth(request, userDoc);
            if (userDoc[kFriends]) {
                response.send(json({ok: true, content: userDoc[kFriends]}), 200);
            } else {
                response.send(json({error:"Not found"}), 404);
            }
        });
        
    });
    
    app.post('/friends/:id', function(request, response) {
        
        var user = auth(request);
        if (!user || !(user.id || user._id)) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var uid = user.id || user. _id;
        var id = request.param('id', null);
        if (!id) {
            response.send(json({error:"Invalid request. User ID not sent"}), 400);
            return;
        }
        
        USERS.pushValue(uid, kFriends, id, function(err, dbres) {
            if (err) {
                response.send(json({error:err.error}), err.status);
            } else {
                response.send(json({ok:true}), 200);
            }
        });
        
    });
};