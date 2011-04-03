var auth = require('./req');
var json = JSON.stringify,
    parse = JSON.parse;


module.exports = function(app) {
    
    var AUTH = '/auth';
    var USERS = require('./users')(app._DB);
    
    app.get(AUTH, function(request, response) {
        response.contentType('json');
        // Get auth info and send it in response
        var user = auth(request);
        if (user && user._id) {
            response.send(json({ok:true, user:user}), 200);
        } else {
            response.send(json({error:"You are not logged in!"}), 401);
        }
    });
    
    app.post(AUTH, function(request, response) {
        response.contentType('json');
        // Login
        var user = null;
        if (request.is('json')) {
            user = request.body;
            if (!user.id || !user.password) {
                user = null;
            }
        } 
        if (!user) {
            response.send(json({error:'Must use JSON and send `id`, `password`'}), 401);
            return;
        }
        USERS.verifyUser(user.id, user.password, function(err, res) {
            if (err) {
                response.send(json({error:err.error}), err.status);
                return;
            }
            if (res.ok && res.user) {
                // User authenticated. Put user data in session
                var au = auth(request, res.user);
                response.send(json({ok:true, user:au}), 200);
            } else {
                response.send(json({error:"Unknown server error at POST /auth"}), 500);
            }
        });
        
    });
    
    app.put(AUTH, function(request, response) {
        response.contentType('json');
        response.send({error:"Not Yet Implemented"}, 503);
    });
    
    app.del(AUTH, function(request, response) {
        response.contentType('json');
        // Logout
        request.session.destroy();
        response.send(json({ok:true}), 200);
    });
};