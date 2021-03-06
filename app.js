// Module dependencies
var express = require('express');
console.log("using express v", express.version || express.VERSION);
// HTTPS dependencies. Keys and Certificates for SSL. 
// Currently, certificates are self signed and would
// cause the browser to show a warning
var fs = require('fs');
var authOptions = {
    key: fs.readFileSync(__dirname + '/ssl/key.pem'),
    cert: fs.readFileSync(__dirname + '/ssl/cert.pem'),
    ca: fs.readFileSync(__dirname + '/ssl/cert.pem')
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
    //app.use(express.logger());
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
// 
// > `
// >    {
// >       "host":"127.0.0.1",
// >       "port":9501,
// >       "files":{
// >           "root":"/path/to/root",
// >           "trash":"/path/to/root/.trash",
// >           "users":"/path/to/root/users"
// >       }
// >   }
// > `
var settings = fs.readFileSync(__dirname + "/server.json");

settings = JSON.parse(settings);
settings.host = settings.host || '127.0.0.1';
try {
    if (!settings.port 
     || !settings.files.root
     || !settings.files.trash
     || !settings.files.users
     || !settings.db.name
     || !settings.db.defaults) {
         throw "Invalid server configuration!";
    }
} catch(err) {
    throw err;
}



app.HOST  = settings.host;
app.PORT  = settings.port;
app.serverRoot = settings.files.root;
app.trashDir = settings.files.trash;
app.userDir = settings.files.users;
app.tempDir = settings.files.temp;

var dbsettings = settings.db;
// Adding the database to `app`. `app` is passed around to the other
// modules, which can then use `db`. Uppercasing `DB` to avoid any
// possible conflicts. See [db.js](./db.html)
app._DB = require('./db')(dbsettings);

// Routes. All application routing starts here
// No need to route '/'. Express will automatically try
// public/index.html
/*app.get('/', function(req, res){
    res.redirect("/index.html");
});*/

// Special routes
app.get('/home', function(req, res) {
    res.sendfile(__dirname+'/public/app.html');
});

// Route for CDN listing (useful for search engines)
require('./robots')(app);

// For all routes `^/browse`. See [browse.js](./browse.html)
require('./browse')(app);

// For all routes `^/auth`. See [auth/index.js](./auth/index.html)
require('./auth')(app);

// For all routes `^/download`. See [download.js](./download.html)
require('./download')(app);

// For all routes `^/upload`. See [upload.js](./upload.html)
require('./upload')(app);

// For all routes `^/signup`. See [signup.js](./signup.html)
require('./signup')(app);

// For all routes `^/shared?`. See [share.js](./share.html)
require('./share')(app);

// Only listen on `$ node app.js`
if (!module.parent) {
    app.listen(app.PORT/*, app.HOST*/);
    console.log("FILE!IT server listening on port %d", app.address().port);
}