var FI = require('./file/info');
var json  = JSON.stringify,
    parse = JSON.parse;

module.exports = function(app) {
    
    var BROWSE = /^\/browse\/(\S+)?/i;
    
    // (GET) file information for a URI
    app.get(BROWSE, function(request, response) {
        var uri = request.params[0] || '';
        // TODO: make root: more generic & user centric
        var options = {root:'/Volumes/OLFS/root'};
        
        // Send information about the file at the URI.
        // Appropriately handle errors
        var fi = new FI(options);
        fi.infoSync(uri, function(err, info) {
            response.header("Content-Type", "application/json");
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true, content:info}));
            }
        });
    });

    app.get('/browse', function(request, response) {
        response.header("Content-Type", "application/json");
        response.send(json({error:'Cannot access this resource', where:request.url}), 403);
    });
    
    
    // Create a new directory at URI (POST)
    app.post(BROWSE, function(request, response) {
        var uri = request.params[0];
        
        
    });
};