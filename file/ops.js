// `file/ops.js` Dependencies
var fs = require('fs');
var path = require('path');

var timestamp = function() {
    return (new Date()).getTime();
};

var prepare = function(options) {
    var root = (typeof options === 'object')
                ? options.root || null
                : (typeof options === 'string')
                    ? options
                    : null;
    return {
        root: root,
        trash: options.trash || null,
        uriFromPath: function(abspath) {
            return abspath.replace(path.join(root, '/'), "");
        }
    };
};

var DEFAULT_MODE = 0777;

// General information
// The `options` and `callback` are required. `options` can
// either be a string representing absolute base path, or `root`,
// for the uri, or it can be an object containing a `root` 
// property. This may be extended in the future.
// This method makes use of only asynchronous methods from `fs`

// Create a directory. equivalent to `mkdir ${root}/${uri}`
module.exports.mkdir = function(uri, options, callback) {
    // Callback pattern: `callback(err)`
    if (typeof callback !== 'function') {
        throw new TypeError("file#ops: callback needs to be a function");
    }
    
    if (!options) {
        throw new TypeError("file#ops: options cannot be null/undefined");
    }
    var self = prepare(options);
    if (!self.root) {
        throw new TypeError("file#ops: options.root cannot be null");
    }
    
    var filepath = path.join(self.root, uri);
    
    path.exists(filepath, function(exists) {
        if (exists) {
            callback({status:409, error:"A file/directory by this name exists already",
                    where:uri});
            return;
        }
        fs.mkdir(filepath, DEFAULT_MODE, function(err) {
            if (err) {
                callback({status:503, error:"Could not create the directory",
                    detail:err, where:uri});
            } else {
                callback(null);
            }
        });
    });
    
};

// Renaming a path. `to` is an equivalent id(URI). If the last path
// component of `uri` contains and extension, it will be added to `to`
// if it doesn't already exist.
module.exports.rename = function(uri, to, options, callback) {
    // Callback pattern: `callback(err)`
    if (typeof callback !== 'function') {
        throw new TypeError("FileInformation#info: callback needs to be a function");
    }
    
    if (!options) {
        throw new TypeError("file#ops: options cannot be null/undefined");
    }
    var self = prepare(options);
    if (!self.root) {
        throw new TypeError("file#ops: options.root cannot be null");
    }
    
    var filepath = path.join(self.root, uri);
    var newpath = path.join(self.root, to);
    
    path.exists(filepath, function(exists) {
        if (!exists) {
            callback({status:404, error:"Not Found",
                    where:uri});
            return;
        }
        var ext = path.extname(filepath);
        if (ext !== '' && path.extname(newpath) === '') {
            newpath += ext;
        }
        fs.rename(filepath, newpath, function(err) {
            if (err) {
                callback({status:503, error:"Could not rename",
                    detail:err, where:uri});
            } else {
                callback(null);
            }
        });
    });
};

// Deleting a file/directory. Deletion of directories that are not
// empty needs to be done in some way... Maybe move the directory
// to a temp dir and every day have a scheduled task empty the 
// trash? `uri` is the path to `unlink` or `rmdir`. In case of error
// It will attempt to move the file/dir to trash.
module.exports.del = function(uri, options, callback) {
    if (typeof callback !== 'function') {
        throw new TypeError("FileInformation#info: callback needs to be a function");
    }
    
    if (!options) {
        throw new TypeError("file#ops: options cannot be null/undefined");
    }
    var self = prepare(options);
    if (!self.root) {
        throw new TypeError("file#ops: options.root cannot be null");
    }
    
    var filepath = path.join(self.root, uri);
    
    path.exists(filepath, function(exists) {
        if (!exists) {
            callback({status:404, error:"Not Found",
                    where:uri});
            return;
        }
        // Stat'ing to know if it's a directory (use `rmdir`)
        // or a plain file (use `unlink`).
        fs.stat(filepath, function(err, stat) {
            if (err) {
                callback({status:503, error:"Could not delete",
                    detail:err, where:uri});
                return;
            }
            // Callback for async deletion. In case of error, tries to 
            // move the file to trash before calling the callback.
            var RMCB = function(err) {
                if (err) {
                    var trashF = path.join( self.trash || path.join(self.root,'.trash'),
                                            uri.replace('/', '|'),
                                            timestamp());
                    
                    fs.rename(filepath, trashF, function(err2) {
                        if (err2) {
                            console.log("RMCB/RENAME", err2);
                            callback({status:503, error:"Could not delete",
                                detail:err2, where:uri});
                        } else {
                            callback(null);
                        }
                    });
                } else {
                    callback(null);
                }
            };
            
            if (stat.isDirectory()) {
                fs.rmdir(filepath, RMCB);
            } else {
                fs.unlink(filepath, RMCB);
            }
            
        });
        
    });
};