var fs = require('fs');
var path = require('path');

var json = JSON.stringify;
module.exports = function(app) {
    var USERS = require('./auth/users')(app._DB);
    
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
    
};