(function(PORT) {
    var connect = require('connect');
    var url = require('url');
    var qs = require('querystring');
    
    var File = require('./browser').File;
    File.ROOT = "/Volumes/OLFS/root/";
    
    var server = connect(
        
        connect.static(__dirname + '/public'),
        
        function(req, res) {
            var uri;
            
            if ((/^GET$/gi).test(req.method)) {
                if ((/^\/browser/i).test(req.url)) {
                    uri = url.parse(req.url).pathname.split("/browser/")[1];
                    var file = File.ROOT + qs.unescape(uri);
                    console.log(file);
                    var info = File.infoSync(file);
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({status:true, content:info}));
                }
         }
    });
    
    server.listen(PORT);
    
})(parseInt(process.argv[2], 10) || 9501);