var cradle = require('cradle');

module.exports = function(settings) {
    var DEFAULTS = {};
    DEFAULTS.name = 'fi-users';
    DEFAULTS.defaults = {
        "host": "127.0.0.1",
        "port": 5984,
        "auth": null,
        "options": {}
    };
    if (!settings) settings = DEFAULTS;
    
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

    var db = connection.database(settings.name);
    db.connection = connection;
    
    return db;
};