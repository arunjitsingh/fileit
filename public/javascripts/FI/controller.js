(function(){
    if ( /*Dependancies*/
        typeof($)==='undefined'      // jQuery, jquery.js
        || typeof(jQuery)==='undefined' // jQuery, jquery.js
        || typeof($.json)==='undefined' // jQuery REST, jquery.rest.js
        || typeof(Class)==='undefined'  // OO, oo.js
        || typeof(_)==='undefined'      // Underscore, underscore.js
        || typeof(DATEJS)==='undefined' // date.js
        || typeof(FI)==='undefined'     // FI, FI/core.js
    ) {
        alert("Application load failed. Try reloading");
        throw new Error("Application load failed");
    }

    var json  = JSON.stringify,
        parse = JSON.parse;

    if (FI.APP) FI._APP = FI.APP;
    FI.APP = {VERSION:'0.1.0ß'};
    $.extend(FI.APP, {
        kServerRoot         : '/',
        kAuthenticationURI  : 'auth',
        kBrowseURI          : 'browse',
        kUploadURI          : 'upload',
        kDownloadURI        : 'download',
        user                : {}
    });
    FI.APP.kSupportedMIMETypes = ["application", "audio", "image", "text", "video"];
    
    // IMPORTANT! The delegate for the controller.
    // FI.APP expects it to be a jquery object
    var delegate = null;
    // var delegateMethods = [
    //     "didFetchResource", "didUpdateResource", "didDeleteResource",
    //     "didCreateResource", "didAuthenticate", "didNotAuthenticate",
    //     "didError"
    // ];
    
    //var kDefaultRequestHeaders = {'Content-Type':'application/json'};
    var kDefaultContentType = 'application/json';
    var kDefaultDataType = "json";
    
    var kRequestDefaults = {
        //headers: kDefaultRequestHeaders,
        contentType: kDefaultContentType,
        mimeType: kDefaultContentType,
        dataType: kDefaultDataType
    };
    
    $.ajaxSetup(kRequestDefaults);
    
    var POST = 'POST',
        GET  = 'GET',
        PUT  = 'PUT',
        DELETE = 'DELETE';
    
    var ajaxOptions = function(opts) {
        return $.extend({}, /*kRequestDefaults,*/ opts);
    };
    
    
    FI.APP.authURI = function() {
        return FI.pathJoin(FI.APP.kServerRoot, FI.APP.kAuthenticationURI);
    };
    FI.APP.authenticateUser = function(id, password, callback) {
        var options = ajaxOptions({
            url: FI.APP.authURI(),
            type: POST,
            data: json({'id':id, 'password':password}),
            success: callback || delegate.didAuthenticate,
            error: callback || delegate.didNotAuthenticate
        });
        
        $.ajax(options);
    };
    
    FI.APP.killSession = function(callback) {
        var options = ajaxOptions({
            url: FI.APP.authURI(),
            type: DELETE,
            success: callback || delegate.didKillSession,
            error: callback || delegate.didNotKillSession
        });
        $.ajax(options);
    };
    
    FI.APP.authenticated = function(callback) {
        var options = ajaxOptions({
            url: FI.APP.authURI(),
            type: GET,
            success: callback || delegate.didAuthenticate,
            error: callback || delegate.didNotAuthenticate
        });
        $.ajax(options);
    };
    
    FI.APP.typeForMIME = function(mime) {
        var type = FI.parseMIME(mime);
        type = type && type.type;
        if (FI.APP.kSupportedMIMETypes.indexOf(type) >= 0) {
            return type;
        } else {
            return "FILE";
        }
    };
    
    var b = {};
    b.toURI = function(id) {
        return FI.pathJoin(FI.APP.kServerRoot, FI.APP.kBrowseURI, id);
    };
    
    b.fetch = function(uri, callback) {
        FI.log("Fetching", uri);
        var resource = b.toURI(uri);
        var options = ajaxOptions({
            url: resource,
            type: GET,
            success: callback || delegate.browse.didFetch,
            error: callback || delegate.browse.didError
        });
        $.ajax(options);
    };
    
    b.create = function(uri, callback) {
        FI.log("Creating", uri);
        var resource = b.toURI(uri);
        var options = ajaxOptions({
            url: resource,
            type: POST,
            success: callback || delegate.browse.didCreate,
            error: callback || delegate.browse.didError
        });
        $.ajax(options);
    };
    
    b.update = function(uri, data, callback) {
        FI.log("Updating", uri);
        var resource = b.toURI(uri);
        var options = ajaxOptions({
            url: resource,
            type: PUT,
            data: json(data),
            success: callback || delegate.browse.didUpdate,
            error: callback || delegate.browse.didError
        });
        $.ajax(options);
    };
    
    b.remove = function(uri, callback) {
        FI.log("Deleting", uri);
        var resource = b.toURI(uri);
        var options = ajaxOptions({
            url: resource,
            type: DELETE,
            success: callback || delegate.browse.didDelete,
            error: callback || delegate.browse.didError
        });
        $.ajax(options);
    };
    
    FI.APP.browse = b;
    
    
    var d = {};
    d.toURI = function(id) {
        return FI.pathJoin(FI.APP.kServerRoot, FI.APP.kDownloadURI, id);
    };
    
    FI.APP.download = function(id) {
        var uri = d.toURI(id);
        var ifr = document.createElement('iframe');
        ifr.src = uri + "?download=true";
        return ifr;
    };


    // File click handler
    FI.APP.fFileClickHandler = function(evt) {
        evt.originalEvent.kFIContinueUp = true;
        var elt = $(evt.target);
        if (evt.metaKey || evt.ctrlKey) {
            // Deselection
            delegate.cancelSelection(elt);
        } else {
            // Selection
            delegate.doSelection(elt);
        }
        return true;
    };


    // Application data transformers
    FI.APP.Transformers = {};
    FI.APP.Transformers.ID = function(value) {
        return value.substring(value.lastIndexOf('/')+1);
    };
    FI.APP.Transformers.Date = function(value) {
        var date =  new(Date)(value);
        str = date.getMonthName() + " " + date.getDate() + " " + date.getFullYear();
        return str;
    };
    FI.APP.Transformers.Size = function(value) {
        var units = ['B', 'KB', 'MB', 'GB', 'TB', 'EB'];
        var size = value,
        i;
        for (i=0;;++i) {
            if (size > 1024) size /= 1024;
            else break;
        }
        return Math.round(size)+" "+units[i];
    };
    FI.APP.Transformers.TypeForMIME = function(value) {
        return FI.APP.typeForMIME(value);
    };
    FI.APP.Transformers.ImageForMIME = function(value) {
        return 'images/' + FI.APP.typeForMIME(value) + '.png';
    };

    // Application data-view templates
    FI.APP.ListItemTemplate = {
        VIEW: {
            ':root': {          
                'content': {
                    'key': 'id',
                    'type': 'text',
                    transformedValue: FI.APP.Transformers.ID
                },
                // 'class': {
                //     'key': 'isDirectory',
                //     transformedValue: function(value) {
                //         FI.log("FIAPPListItemTemplate::class#transformedValue", value);
                //         return (value) ? "DIR" : "FILE";
                //     }
                // },
                'class': [
                    {
                        'key': 'isDirectory',
                        transformedValue: function(value) {
                            //FI.log("FIAPPListItemTemplate::class#transformedValue", value);
                            return (value) ? "DIR" : "";
                        }
                    }, {
                        'key': 'type',
                        transformedValue: FI.APP.Transformers.TypeForMIME
                    }
                ]
                
            }
        },
        ACTION: {
            click: FI.APP.fFileClickHandler
        }
    };

    FI.APP.DetailsViewAttributes = {
        '.file-name': {'content':{'key':'id', 'type':'text', transformedValue: FI.APP.Transformers.ID}},
        '.file-type': {'content':{'key':'type', 'type':'img', transformedValue: FI.APP.Transformers.ImageForMIME}},
        '.file-size': {'content':{'key':'size', 'type':'text', transformedValue: FI.APP.Transformers.Size}},
        '.file-ctime': {'content':{'key':'ctime', 'type':'text', transformedValue: FI.APP.Transformers.Date}},
        '.file-mtime': {'content':{'key':'mtime', 'type':'text', transformedValue: FI.APP.Transformers.Date}}
    };

    FI.APP.columnWidth = 325;
    FI.APP.ColumnViewOptions = {
        columnWidth: FI.APP.columnWidth,
        autoScrollX: false,
        columnCSS: {
            'width':FI.APP.columnWidth, 
            'height':'inherit'
        }
    };
    

    FI.APP.setup = function(options) {
        delegate = options.delegate;
    };
})();