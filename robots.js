var join = require('path').join;
var json = JSON.stringify;

module.exports = function(app) {
    var kCDNURI  = '/-/';
    var kCDNView = 'cdn/all';
    var db = app._DB;
    
    var getData = function(callback) {
        db.view(kCDNView, function(err, dbres) {
            if (err) {
                response.send("", 500);
                return;
            }
            var res = [];
            [].forEach.call(dbres, function(row) {
                var id = row.key;
                row.value && row.value.forEach(function(cdn) {
                    res.push(join(kCDNURI, id, cdn));
                });
            });
            callback(res);
        });
    };
    
    app.get('/robots.txt', function(request, response) {
        response.header('Content-Type', 'text/plain');
        getData(function(res) {
            res = res.join("\n") + "\n";
            response.send(res, 200);
        });
    });
    
    app.get('/robots.html', function(request, response) {
        response.header('Content-Type', 'text/html');
        getData(function(res) {
            res = res.map(function(link) {
                return "<a href='"+link+"'>"+link+"</a>";
            });
            res = "<body>" + res.join("<br>") + "</body>";
            response.send(res, 200);
        });
    });
    
};