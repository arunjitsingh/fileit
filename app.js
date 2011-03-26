// Module dependencies
var express = require('express');


// HTTPS dependencies. Keys and Certificates for SSL. 
// Currently, certificates are self signed and would
// cause the browser to show a warning
var fs = require('fs');
var authOptions = {
    key: fs.readFileSync(__dirname + '/ssl/prkey.pem'),
    cert: fs.readFileSync(__dirname + '/ssl/cert.pem')
};

// The application. This supports routing, downloading and uploading
var app = module.exports = express.createServer(/*authOptions*/);

// Configuration.
// The application uses bodyParser for reading request
// bodies (eg. forms, uploads?); router for easy routes
// via GET, POST, PUT, DELETE
app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes. All application routing starts here
app.get('/', function(req, res){
	res.redirect("/index.html");
});

// For all routes ^/browse. See browse.html
require('./browse')(app);


// Only listen on $ node app.js
if (!module.parent) {
  app.listen(parseInt(process.argv[2], 10) || 9501);
  console.log("Express server listening on port %d", app.address().port);
}