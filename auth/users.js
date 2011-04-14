var HASH = require('hashlib').sha1;

module.exports = function(db) {
    if (!db) {
        throw "DB not inited!";
    }
    
    if (db.name !== 'fi-users') {
        throw "User DB not selected";
    }
    var userAuth = {};

    userAuth.exists = function(id, callback) {
        id = (typeof(id)==='string') ? id : null;
        if (!id) {
            callback(false);
            return;
        }
        db.get(id, function(err, doc) {
            if (err) {
                callback(false);
            } else {
                callback(true);
            }
        });
    };

    userAuth.createUser = function(info, callback) {
        // info has username, password[, name, email]

        var id = (typeof(info.username) === 'string') ? info.username : null,
            pw = (typeof(info.password) === 'string') ? info.password : null;
        if (!id || !pw) {
            callback({status:400, error:"Need username and password", detail:err}, null);
            return;
        }
        db.get(id, function(err, doc) {
            if (!err) {
                callback({status: 403, error: "User exists", detail:err}, null);
                return;
            }
            db.connection.uuids(1, function(err, uuids) {
                if (err) {
                    callback({status: 500, error:"Could not create user", detail:err}, null);
                    return;
                }
                var salt = uuids[0];
                var userDoc = {
                    _id: id,
                    id: id,
                    salt: salt,
                    password_sha: HASH(pw + salt),
                    name: info.name || id,
                    email: info.email || null,
                    shared: [],
                    servers: [],
                    friends: [],
                    type: "user"
                };
                console.log("Attempting to create new user: id: %s, doc:", id, userDoc);
                db.save(id, userDoc, function(err, dbres) {
                    if (err) {
                        callback({status:500, error:"Could not create user", detail:err}, null);
                        return;
                    }
                    console.log("New user created", dbres);
                    callback(null, dbres);
                });
            });
        });

    };

    userAuth.verifyUser = function(id, password, callback) {

        id = (typeof(id) === 'string') ? id : null;
        password = (typeof(password) === 'string') ? password : null;

        if (!id || !password) {
            callback({status:400, error:"Need username and password", detail:err}, null);
            return;
        }
        
        db.get(id, function(err, doc) {
            if (err) {
                callback({status: 401, error: "User ID not found", detail:err}, null);
                return;
            }
            var salt = doc.salt;
            var password_sha = doc.password_sha;
            if (password_sha === HASH(password + salt)) {
                callback(null, {ok: true, user:doc});
                console.log("User %s authenticated", id);
            } else {
                callback({status:401, error:"Incorrect password", detail:err}, null);
            }
        });

    };

    userAuth.deleteUser = function(id, callback) {
        id = (typeof(id) === 'string') ? id : null;
        if (!id) {
            callback({status:400, error:"Need username (`id`)"}, null);
            return;
        }
        db.remove(id, function(err, dbres) {
            if (err) {
                callback({status:500, error:"User could not be deleted", detail:err}, null);
            } else {
                callback(null, dbres);
            }
        });
    };
    
    userAuth.pushValue = function(id, key, value, callback) {
        id = (typeof(id) === 'string') ? id : null;
        if (!id) {
            callback({status:400, error:"Need username (`id`)"}, null);
            return;
        }
        db.get(id, function(err, doc) {
            
            if (err) {
                callback({status:403, error:"User could not be accessed", detail:err}, null);
            } else {
                var k = doc[key];
                if (k && k.length !== undefined) {
                    k.push(link);
                }
                doc[key] = k;
                db.save(doc, function(err, dbres) {
                   if (err) {
                       callback({status:403, error:"User could not be updated", detail:err}, null);
                   } else {
                       callback(null, dbres);
                   }
                });
                
            }
            
        });
    };
    
    userAuth.has = function(id, key, value, callback) {
        id = (typeof(id) === 'string') ? id : null;
        if (!id) {
            callback({status:400, error:"Need username (`id`)"}, null);
            return;
        }
        db.get(id, function(err, doc) {
            
            if (err) {
                callback(false);
            } else {
                if (doc[key]) {
                    var val = doc[key];
                    if (val === value) {
                        callback(true);
                    } else {
                        if (typeof(val)==='object') {
                            if (val.length !== undefined
                             && val.indexOf!== undefined) {
                                // Array
                                callback((val.indexOf(value) > -1));
                            } else {
                                // Object
                                callback(val[value]);
                            }
                        } else {
                            callback(false);
                        }
                    }
                }                
            }
            
        });
    };
    
    return userAuth;
};