var walk = require('./asyncwalk').walk,
    sys  = require('util');
walk('./',
    function (file, next) { sys.log(file); next(); },
    function (err) { sys.log("done. error: " + err); });