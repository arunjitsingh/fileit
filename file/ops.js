// `file/ops.js` Dependencies
var fs = require('fs');
var path = require('path');

// FileOperation constructor. Checks for incorrect invokation
// (i.e., without `new` keyword). Options must be specified and
// may be `{}`. `options.root` is not necessary, but is strongly
// recommended.
var DEFAULT_ROOT = '/';
var FileOperation = function(options) {
    if (!(this instanceof FileOperation)) {
        return new FileOperation(options);
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
    // Path verification. This can be through a required option,
    // say `option.auth` or something. This `auth` is created
    // per request, maybe based on some session info.
    /*
    self.canUpdate = function(abspath) {
        
    }
    */
};

var DEFAULT_MODE = 0777;
FileOperation.prototype.mkdir = function(uri, callback) {
    // Callback pattern: `callback(err)`
    if (typeof callback !== 'function') {
        throw new TypeError("FileInformation#info: callback needs to be a function");
    }
    
    var self = this;
    var filepath = path.join(self.root(), uri);
    // `filepath` access verification takes place here...
    /*  var parent = filepath.substring(0, filepath.lastIndexOf('/')); */
    /*  if (!self.canUpdate(parent)) //error */
    
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
FileOperation.prototype.rename = function(uri, to, callback) {
    // Callback pattern: `callback(err)`
    if (typeof callback !== 'function') {
        throw new TypeError("FileInformation#info: callback needs to be a function");
    }
    
    var self = this;
    var filepath = path.join(self.root(), uri);
    var newpath = path.join(self.root(), to);
    // `filepath` access verification takes place here...
    /*  var parent = filepath.substring(0, filepath.lastIndexOf('/')); */
    /*  var toparent = newpath.substring(0, newpath.lastIndexOf('/')); */
    /*  if (!self.canUpdate(parent)) //error */
    /*  if (!self.canUpdate(toparent)) //error */
    
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
FileOperation.prototype.del = function(uri, callback) {
    if (typeof callback !== 'function') {
        throw new TypeError("FileInformation#info: callback needs to be a function");
    }
    
    var self = this;
    var filepath = path.join(self.root(), uri);
    // `filepath` access verification takes place here...
    /*  var parent = filepath.substring(0, filepath.lastIndexOf('/')); */
    /*  if (!self.canUpdate(parent)) //error */
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
                    var trashF = path.join(self.root(), '.trash', path.basename(uri));
                    fs.rename(filepath, trashF, function(err) {
                        if (err) {
                            callback({status:503, error:"Could not delete",
                                detail:err, where:uri});
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

module.exports = FileOperation;