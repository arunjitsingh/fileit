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

// The application. This supports routing, downloading and uploading.
// Will later include support for SSL/TLS
var app = module.exports = express.createServer(/*authOptions*/);

// Configuration.
// The application uses bodyParser for reading request
// bodies (eg. forms, uploads?); router for easy routes
// via GET, POST, PUT, DELETE; session for.. sessions!
app.configure(function(){
    app.use(express.favicon(__dirname+"/public/favicon.ico"));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.session({secret:"fileit!"}));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
    app.use(express.errorHandler()); 
});


// Server configuration via `server.json`. Required. if the file is
// not available or has invalid JSON, server will **not** start.
// Sample: 
// `{
//     "host":"127.0.0.1",
//     "port":9501,
//     "files":{
//         "root":"/path/to/root",
//         "trash":"/path/to/root/.trash",
//         "users":"/path/to/root/users"
//     }
// }`
var settings = fs.readFileSync(__dirname + "/server.json");
try {
    settings = JSON.parse(settings);
    settings.host = settings.host || '127.0.0.1';
    if (!settings.port 
     || !settings.files.root
     || !settings.files.trash
     || !settings.files.users) {
         throw "Invalid server configuration!";
     }
} catch (err) {
    throw err;
}

app.HOST  = settings.host;
app.PORT  = settings.port;
app.serverRoot = settings.files.root;
app.trashDir = settings.files.trash;
app.userDir = settings.files.users;
app.tempDir = settings.files.temp;

// Adding the database to `app`. `app` is passed around to the other
// modules, which can then use `db`. Uppercasing `DB` to avoid any
// possible conflicts.
app._DB = require('./db');

// Routes. All application routing starts here
// No need to route '/'. Express will automatically try
// public/index.html
/*app.get('/', function(req, res){
    res.redirect("/index.html");
});*/

// For all routes `^/browse`. See [browse.js](./browse.html)
require('./browse')(app);

// For all routes `^/auth`. See [auth.js](./auth/index.html)
require('./auth')(app);

// For all routes `^/download`. See [download.js](./download.html)
require('./download')(app);

// For all routes `^/upload`. See [upload.js](./upload.html)
require('./upload')(app);

// Only listen on `$ node app.js`
if (!module.parent) {
    app.listen(app.PORT, app.HOST);
    console.log("Express server listening on port %d", app.address().port);
}