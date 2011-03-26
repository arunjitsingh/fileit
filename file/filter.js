var FileFilter = function(options) {
    if (!(this instanceof FileFilter))
        return new FileFilter(options);
    
    var pattern = (typeof options === 'object') ? options.pattern : options;
    this.allowed = function(file) {
        return !(pattern.test(file));
    };
};
var DEFAULT_FILTER_PATTERN = /^\./i;
var DEFAULT_FILTER = new FileFilter({pattern: DEFAULT_FILTER_PATTERN});

FileFilter.defaultFilter = function() {
    return DEFAULT_FILTER;
};

module.exports = FileFilter;