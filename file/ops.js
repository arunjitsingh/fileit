var fs = require('fs');
var path = require('path');

var DEFAULT_ROOT = '/';
var FileOperation = function(options) {
    if (!(this instanceof FileOperation)) {
        return new FileOperation(options)
    }
    if (!options) {
        throw new TypeError("First argument of FileInformation must be object or string");
    }
    
    var self = this;
    
    var root = (typeof options === 'object')
                ? options.root || DEFAULT_ROOT
                : (typeof options === 'string')
                    ? options
                    : DEFAULT_ROOT;

    self.root = function() {
        return root;
    };
};