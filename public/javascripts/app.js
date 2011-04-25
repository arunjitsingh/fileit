(function($) {
    
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
    
    window.POST = 'POST';
    window.GET  = 'GET';
    window.PUT  = 'PUT';
    window.DELETE = 'DELETE';
    
    
    var json  = JSON.stringify,
        parse = JSON.parse;

    if (FI.APP) FI._APP = FI.APP;
    FI.APP = $({VERSION:'0.1.0ß'});
    FI.APP.toString = function() {return "FI.APP";};
    
    FI.log("App init");
    
    $.extend(FI.APP, {
        kServerRoot         : '/',
        kAuthenticationURI  : 'auth',
        kBrowseURI          : 'browse',
        kUploadURI          : 'upload',
        kDownloadURI        : 'download',
        kSharedURI          : 'shared',
        kShareURI           : 'share',
        kSharedDownloadURI  : '-s',
        kCDNURI             : '-',
        kLinksURI           : 'links',
        user                : {}
    });

    // APP MIME types
    FI.APP.kSupportedMIMETypes = ["application", "audio", "image", "text", "video"];
    FI.APP.typeForMIME = function(mime) {
        var type = FI.parseMIME(mime);
        type = type && type.type;
        if (FI.APP.kSupportedMIMETypes.indexOf(type) >= 0) {
            return type;
        } else {
            return "FILE";
        }
    };

    // IMPORTANT! The delegate for the controller.
    // FI.APP expects it to be a jquery object
    // var delegate = options.delegate;
    // var delegateMethods = [
    //     "didFetchResource", "didUpdateResource", "didDeleteResource",
    //     "didCreateResource", "didAuthenticate", "didNotAuthenticate",
    //     "didError"
    // ];


    // AJAX Setup.
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

    FI.APP.ajaxOptions = function(opts) {
        return $.extend({}, /*kRequestDefaults,*/ opts);
    };
    
    var USER     = FI.APP.user;
    
    FI.APP.HTTP = {};
    FI.APP.HTTP.STATUS = {
        400: {status:"Bad Request", error:"There was an error with the request parameters"}, 
        401: {status:"Unauthorized", error:"You are not logged in"}, 
        403: {status:"Forbidden", error:"You do not have permission to access this resource"}, 
        404: {status:"Not Found", error:"The requested resource was not found on the server"}, 
        409: {status:"Conflict", error:"Resource conflict"}, 
        500: {status:"Server Error", error:"There was a server error"}, 
        501: {status:"Not Implemented", error:"The requested method is not implemented by the server"},
        503: {status:"Service Unavailable", error:"There was an error completing the request"}
    };
    FI.APP.HTTP.Error = function(status) {
        return FI.APP.HTTP.STATUS[status];
    };


    FI.APP.authURI = function() {
        return FI.pathJoin(FI.APP.kServerRoot, FI.APP.kAuthenticationURI);
    };
    FI.APP.authenticateUser = function(id, password, callback) {
        var options = FI.APP.ajaxOptions({
            url: FI.APP.authURI(),
            type: POST,
            data: json({'id':id, 'password':password}),
            success: callback || FI.APP.didAuthenticate,
            error: callback || FI.APP.didNotAuthenticate
        });

        $.ajax(options);
    };

    FI.APP.killSession = function(callback) {
        var options = FI.APP.ajaxOptions({
            url: FI.APP.authURI(),
            type: DELETE,
            success: callback || FI.APP.didKillSession,
            error: callback || FI.APP.didNotKillSession
        });
        $.ajax(options);
    };

    FI.APP.authenticated = function(callback) {
        var options = FI.APP.ajaxOptions({
            url: FI.APP.authURI(),
            type: GET,
            success: callback || FI.APP.didAuthenticate,
            error: callback || FI.APP.didNotAuthenticate
        });
        $.ajax(options);
    };

    // Application data transformers
    FI.APP.Transformers = {};
    FI.APP.Transformers.ID = function(value) {
        return FI.pathBaseName(value);
    };
    FI.APP.Transformers.Date = function(value) {
        function pad(n) {return (n < 10) ? "0"+n : n;}
        var date =  new(Date)(Date.parse(value));
        str = date.getMonthName() + " " + date.getDate() + ", " + date.getFullYear();
        str += " at " + pad(date.getHours()) + ":" + pad(date.getMinutes());
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
    FI.APP.Transformers.TypeDisability = function(value) {
        var mime = FI.parseMIME(value);
        return (mime && mime.type) ? "" : "disabled";
    };

    // View Control for the application

    FI.APP.$main = $("#main");

    FI.APP.views = ["home", "shared", "links"];
    FI.APP.currentView = null;

    var viewFn = {};

    FI.APP.registerView = function(view, fn) {
        if (fn && typeof(fn)==='function')
            viewFn[view] = fn;
            $("#"+view).enable();
    };
    FI.APP.activateView = function(view) {
        if (FI.APP.views.indexOf(view) > -1 && (view in viewFn)) {
            FI.log("View change");
            $("#"+FI.APP.currentView).removeClass("selected");
            $("#"+view).addClass("selected");
            FI.APP.currentView = view;
            viewFn[view]();
        }
    };
    FI.APP.updateMain = function() {
        FI.APP.$main.animate({scrollLeft:FI.APP.$main.width()}, {duration: 250, queue: false});
    };
    
    //TODO: put this as an event
    FI.APP.updateHash = function(id) {
        //FI.log("HASH", FI.APP.user.home, id);
        var uri = FI.pathJoin(USER.home.id, id);
        window.location.hash = uri;
    };
    
    
    // Overlay control
    FI.APP.showOverlay = function(elt, options) {
        options = options || {};
        options.loaded = options.loaded || function() {};
        options.ok = options.ok || function() {};
        options.cancel = options.cancel || function() {};
        //FI.log("overlay elt, options:", elt, options);
        elt = $(elt);
        var overlay = $("#overlay"),
            container = overlay.find("#overlay-container");
        container.empty();
        container.append(elt);
        elt.find(".the-content").bind('load', options.loaded);
        $("#close-overlay, .cancel", overlay).click(function() {
            if ($(this).hasClass('disabled')) return;
            options.cancel();
            FI.APP.hideOverlay();
        });
        $(".ok", overlay).click(function() {
            if ($(this).hasClass('disabled')) return;
            options.ok();
            FI.APP.hideOverlay();
        });
        overlay.fadeIn();
    };
    FI.APP.hideOverlay = function() {
        var overlay = $("#overlay"),
            container = overlay.find("#overlay-container");
        $(".cancel", overlay).unbind();
        container.empty();
        overlay.fadeOut();
    };
    /* *************** */
    
    FI.APP.$ = $({});
    
    FI.APP.$body = $(document.body);
    FI.APP.$body
        .ajaxError(function(evt, xhr, sett, err) {
            if (xhr.status === 401) {
                FI.APP.doLogin();
                evt.stopPropagation();
            }
            FI.APP.$.trigger('error', [err, xhr]);
        })
        .ajaxSuccess(function(res) {
            FI.APP.$.trigger('success', [res]);
        })
        .ajaxSend(function() {
            $("#overlay .cancel").disable();
            $(".ajax-working").show();
        })
        .ajaxComplete(function(evt, xhr, options) {
            $("#overlay .cancel").enable();
            $(".ajax-working").hide();
            //FI.APP.updateHash(options.url);
        });
    FI.APP.$.messageQueue = [];    
    FI.APP.$.updateMessages = function() {
        var ib = $("#info-bar");
        ib.show();
        var mq = FI.APP.$.messageQueue;
        if (mq.length > 0) {
            var obj;
            if( (obj = mq.shift(1)) ) {
                ib.fadeIn(2000, function() {
                    if (obj.showError === true) {
                        var errstring = err + ": ";
                        errstring += obj.error;
                        FI.log("Error", errstring);
                        ib.html(errstring);
                    } else if (obj.showInfo === true) {
                        var infostring = "Success! : " + obj.info;
                        FI.log("Info", infostring);
                        ib.html(infostring);
                    }
                });
                
            } else {
                ib.fadeOut(200);
            }
        }
    };
    FI.APP.$.bind({
        "error": function(evt, err, obj) {
            debug.error(err, obj);
            FI.APP.$body.removeClass("success").addClass("error");
            if (obj.showError === true) {
                FI.APP.$.messageQueue.push(obj);
            } else {
                FI.APP.$body.removeClass("showinfo");
            }
            FI.APP.$.updateMessages();
        },
        "success": function(evt, obj) {
            FI.APP.$body.removeClass("error").addClass("success");
            if (obj.showInfo === true) {
                FI.APP.$.messageQueue.push(obj);
            } else {
                FI.APP.$body.removeClass("showinfo");
            }
            FI.APP.$.updateMessages();
        }
    });
    
    // Authentication methods
    FI.APP.didAuthenticate = function(response, status, xhr) {
        if (response && response.ok) {
            console.log(response, "User in session");
            FI.APP.user = USER = response.user;
            USER.home = {
                id:'/',
                isDirectory: true
            };
            $('#homedata').data(USER.home);
            FI.APP.activateView('home');
            FI.APP.hideOverlay();
        }
        else {
            FI.APP.didNotAuthenticate(xhr, status, response);
        }
    };
    FI.APP.didNotAuthenticate = function(xhr, status, error) {
        if (xhr && xhr.responseText) FI.APP.doLogin(JSON.parse(xhr.responseText));
        else FI.APP.doLogin(xhr);
    };
    /* *************** */
    
    // Log in and Log out
    FI.APP.doLogin = function(error) {
        var elt = $("#login").clone(); //not clone(true)
        var form = elt.find("form[method=POST]");
        form.find("input").first().focus();
        if (error) {
            //FI.log(error);
            elt.addClass("error");
        }
        form.submit(function(evt) {
            evt.preventDefault(); // V.IMP
            var username = form.find("#username").val();
            var password = form.find("#password").val();
            FI.APP.authenticateUser(username, password);
        });
        FI.APP.showOverlay(elt, {cancel:function() {
            window.location = "/signup.html";
        }});
    };
    
    FI.APP.doLogout = function() {
        FI.log("Logging out");
        FI.APP.killSession(function() {
            window.location = '/';
        });
    };
    /* *************** */
    
    var MediaTag = {
        'audio': '<audio autoplay controls></audio>',
        'video': '<video autoplay controls></video>'
    };
    FI.APP.tagForType = function(type) {
        switch (type) {
            case 'application': return ['<iframe>'];
            case 'audio': /*fallthrough*/
            case 'video': return [MediaTag[type]];
            case 'image': return ['<img>'];
            case 'text': return ['<iframe>'];
            default: return ['<iframe>'];
        }
    };
    FI.APP.openFile = function(uri, mime) {
        if (!mime) {
            FI.APP.$.trigger('error', ["Can't preview file",{
                showError: true,
                error: "File type not supported"}]);
            return;
        }
        var tags = FI.APP.tagForType(mime.type);
        var cont = $("#open-container").clone();
        var elt = $(tags[0]);
        elt.addClass('the-content');
        if (elt.is('video')) cont.addClass('video');
        else if (elt.is('audio')) cont.addClass('audio');
        cont.append(elt);
        elt.attr('src', uri);
        FI.APP.showOverlay(cont, {
            loaded: function() {
                if (elt.is('img')) elt.absoluteCenter();
            },
            cancel: function() {}
        });
    };
    
    $(document).ready(function() {
        
        $("#home").click(function() {
            if ($(this).hasClass('disabled')) return;
            FI.APP.activateView('home');
        });

        $("#shared").click(function() {
            if ($(this).hasClass('disabled')) return;
            FI.APP.activateView('shared');
        });

        $("#links").click(function() {
            if ($(this).hasClass('disabled')) return;
        });


        $("#settings").click(function() {
            if ($(this).hasClass('disabled')) return;
            var elt = $("#settings-bar").clone();
            console.log(FI.APP.user);
            elt.find('.user-name').text(FI.APP.user.name);
            elt.find("#logout").click(function() {
                FI.APP.doLogout();
            });
            FI.APP.showOverlay(elt, {
                cancel: function() {}
            });
        });

        FI.APP.authenticated(function(response, status) {
            if (status === 401) {
                FI.APP.doLogin();
            } else {
                FI.APP.didAuthenticate(response);
            }
        });
    });
    
    FI.APP.inited = YES;
    
})(jQuery);