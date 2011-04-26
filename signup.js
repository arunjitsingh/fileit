var fs = require('fs');
var path = require('path');
var auth  = require('./auth/req');

var json = JSON.stringify;
module.exports = function(app) {
    var USERS = require('./auth/users')(app._DB);
    
    //console.log("Signup: ", USERS);
    app.get('/signup/:id', function(request, response) {
        response.contentType('json');
        var id = request.param('id');
        if (id) {
            USERS.exists(id, function(exists) {
                if (exists) {
                    response.send(json({ok:true, id:true}), 200);
                } else {
                    response.send(json({ok:true, id:false}), 200);
                }
            });
        } else {
            response.send(json({error:"No ID sent!"}), 400);
        }
    });
    app.get('/signup', function(req, res) {
        res.redirect('/signup.html');
    });
    app.post('/signup', function(request, response) {
        var info = request.body;
        
        if (info.username && info.password) {
            USERS.createUser(info, function(err, dbres) {
                if (err) {
                    response.send(json({error: err.error}), err.status);
                } else {
                    var newuser = path.join(app.userDir, info.username);
                    fs.mkdir(newuser, 0777, function(err) {
                        if (err) {
                            response.send(json({error: "Could not create user home folder"}), 500);
                            USERS.deleteUser(info.username, function(err, dbres) {
                                if (err) console.err("signup/post/mkdir/deleteUser ", err);
                            });
                        } else {
                            // Successfully created new user
                            response.send(json({ok:true}), 200);
                        }
                    });
                }
            });
        } else {
            response.send(json({error: "Invalid data"}), 400);
        }
    });
    
    app.del('/user-del', function(request, response) {
        response.contentType('json');
        //console.log("del/signup USERS:", USERS);
        var _user = auth(request);
        if (!_user) {
            response.send(json({error: "You are not logged in!"}), 401);
            return;
        }
        var id = _user.id || _user._id;
        request.session.destroy();
        
        //console.log("User, %s, delete-account", id, _user);
        
        USERS.deleteUser(id, function(err, dbres) {
            if (err) {
                console.log("signup/delete/deleteUser ", err);
                response.send(json({error: "Couldn't delete"}), 500);
                return;
            } else {
                var dir = path.join(app.userDir, id);
                fs.rmdir(dir, function(err1) {
                    if (err1) {
                        var trashF = path.join(app.trashDir, id);

                        fs.rename(dir, trashF, function(err2) {
                            if (err2) {
                                console.log("RMDIR/RENAME", err2);
                                response.send(json({error: "Couldn't delete"}), 500);
                            } else {
                                response.send(json({ok:true}), 200);
                            }
                        });
                    } else {
                        response.send(json({ok:true}), 200);
                    }
                });
            }
            
        });
    });
};