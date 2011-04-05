var cradle = require('cradle');

var settings = (function() {
    var fs = require('fs');
    var DEFAULTS = {};
    DEFAULTS.defaults = {
        "host": "127.0.0.1",
        "port": 5984,
        "auth": null,
        "options": {}
    };
    var _set = fs.readFileSync(__dirname + '/settings.json', 'utf-8');
    try {
        _set = JSON.parse(_set);
    } catch (err) {
        console.log("db/settings.json has invalid JSON. Using defaults");
        _set = DEFAULTS;
    }
    return _set;
})();

cradle.setup(settings.defaults);
var connection;

try {
    connection = new(cradle.Connection)();
} catch (err) {
    try {
        cradle.setup(settings.fallback);
        console.log("Using fallback settings!", settings.fallback);
        connection = new(cradle.Connection)();
    } catch (err) {
        throw err;
    }
}

var db = connection.database('fi-users');
db.connection = connection;

module.exports = db;