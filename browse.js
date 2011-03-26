var FI = require('./file/info');
var FO = require('./file/ops');
var json  = JSON.stringify,
    parse = JSON.parse;

module.exports = function(app) {
    
    var BROWSE = /^\/browse\/(\S+)?/i;
    
    // (GET) file information for a URI
    app.get(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.params[0] || '';
        // TODO: make root: more generic & user centric
        var options = {root:'/Volumes/OLFS/root'};
        
        // Send information about the file at the URI.
        // Appropriately handle errors
        var fi = new FI(options);
        fi.info(uri, function(err, info) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true, content:info}), 200);
            }
        });
    });

    app.get('/browse', function(request, response) {
        response.header("Content-Type", "application/json");
        response.send(json({error:'Cannot access this resource', where:request.url}), 403);
    });
    
    
    // Create a new directory at URI (POST)
    app.post(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.params[0] || '';
        // TODO: make root: more generic & user centric
        var options = {root:'/Volumes/OLFS/root'};
        
        // Create a new directory at the URI.
        // Appropriately handle errors
        var fo = new FO(options);
        fo.mkdir(uri, function(err) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true}), 201);
            }
        });
    });
    
    // Rename a file/directory at URI (PUT)
    app.put(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.params[0] || '';
        var to;
        if (request.is('json')) {
            to = request.body.id;
        } else {
            to = request.param('id');
        }
        // User did not send a new file name (as `id`). Server expects
        // either JSON encoded body: `{"id":"new/file/path"}`
        // or querystring: `id=new/file/path`.
        if (!to || to === '') {
            response.send(json({error:"Send `id` in JSON object or as querystring",
                where:uri}), 400);
            return;
        }
        // TODO: make root: more generic & user centric
        var options = {root:'/Volumes/OLFS/root'};
        
        // Rename the file at the URI.
        // Appropriately handle errors
        var fo = new FO(options);
        fo.rename(uri, to, function(err) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true}), 200);
            }
        });
    });
    
    app.del(BROWSE, function(request, response) {
        response.contentType('json');
        
        var uri = request.params[0] || '';
        // TODO: make root: more generic & user centric
        var options = {root:'/Volumes/OLFS/root'};
        
        // Rename the file at the URI.
        // Appropriately handle errors
        var fo = new FO(options);
        fo.del(uri, function(err) {
            if (err) {
                response.send(json({error:err.error, where:request.url}), err.status);
            } else {
                response.send(json({ok:true}), 200);
            }
        });
    });
};