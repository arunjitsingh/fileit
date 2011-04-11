/**
 * @author arunjitsingh
 */

$(document).ready(function() {
    
    
    if (window.self) {
        window._self = window.self;
    }
    if (!FI.APP) {
        alert("Application load failed in 'index.js'. Try reloading");
        throw "Application Load Error";
    }
    // The delegate for FI.APP
    var self = {
        browse          : {},
        views           : ["home", "shared", "links"],
        currentView     : "home",
        currentSelection: null,
        currentColumn   : null,
        deletion        : null
    };
    self.$ = $({});
    self.$body = $(document.body);
    self.$body
        .ajaxError(function(evt, xhr, sett, err) {
            if (xhr.status === 401) {
                self.doLogin();
                evt.stopPropagation();
            }
            self.$.trigger('error', [err, xhr]);
        })
        .ajaxSuccess(function(res) {
            self.$.trigger('success', [res]);
        })
        .ajaxSend(function() {
            $("#overlay .cancel").addClass('disabled');
            $(".ajax-working").show();
        })
        .ajaxComplete(function() {
            $("#overlay .cancel").removeClass('disabled');
            $(".ajax-working").hide();
        });
    
    self.$.bind({
        "error": function(evt, err, obj) {
            debug.error(err, obj);
            self.$body.addClass("error");
            if (obj.showError === true) {
                var errstring = err + ": ";
                errstring += obj.error;
                $("#error-bar").text(errstring);
                self.$body.addClass("showerror");
            }
        },
        "success": function(evt, obj) {
            self.$body.removeClass("error").removeClass("showerror");
        }
    });
    
    self.changeView = function(view) {
        if (self.views.indexOf(view) > -1) {
            // change the view
            $("#"+self.currentView).removeClass("selected");
            $("#"+view).addClass("selected");
            self.currentView = view;
        }
    };
    
    self.disable = function() {
        var args = [].slice.call(arguments);
        args.forEach(function(e) {
            $(e).addClass('disabled');
        });
        return self; // for chaining
    };
    self.enable = function() {
        var args = [].slice.call(arguments);
        args.forEach(function(e) {
            $(e).removeClass('disabled');
        });
        return self;
    };
    
    
    self.HTTPError = function(status) {
        var STATUS = {
            400: {status:"Bad Request", error:"There was an error with the request parameters"}, 
            401: {status:"Unauthorized", error:"You are not logged in"}, 
            403: {status:"Forbidden", error:"You do not have permission to access this resource"}, 
            404: {status:"Not Found", error:"The requested resource was not found on the server"}, 
            409: {status:"Conflict", error:"Resource conflict"}, 
            500: {status:"Server Error", error:"There was a server error"}, 
            501: {status:"Not Implemented", error:"The requested method is not implemented by the server"},
            503: {status:"Service Unavailable", error:"There was an error completing the request"}
        };
        return STATUS[status];
    };
    
    
    var MediaTag = {
        'audio': '<audio autoplay="false" controls></audio>',
        'video': '<video autoplay="false" controls></video>'
    };
    self.tagForType = function(type) {
        switch (type) {
            case 'application': return ['<iframe>'];
            case 'audio': 
            case 'video': return [MediaTag[type]];
            case 'image': return ['<img>'];
            case 'text': return ['<iframe>'];
            default: return ['<iframe>'];
        }
    };
    
    var APP      = FI.APP;
    var BROWSER  = FI.APP.browse;
    var DOWNLOAD = FI.APP.download;
    var USER     = FI.APP.user;
    
    var toUploadURI = function(id) {
        return FI.pathJoin(APP.kServerRoot, APP.kUploadURI, id);
    };
    
    self.columns = new(FI.ColumnView)("#browser", APP.ColumnViewOptions);
    
    //TODO: put this as an event
    self.updateHash = function(id) {
        //FI.log("HASH", FI.APP.user.home, id);
        id = id || self.currentSelection.data().id;
        var uri = FI.pathJoin(USER.home.id, id);
        window.location.hash = uri;
    };
    
    
    
    // Some delegate methods for BROWSER
    self.browse.didFetch = function(response) {
        if (response && response.ok) {
            if(response.content) {
                var file = response.content;
                if (file.isDirectory) {
                    renderDirectory(file.children);
                } else {
                    renderFile(file);
                }           
            }
        }
    };

    var renderDirectory = function(content) {
        var list = FI.ListView.createSimpleList({template: APP.ListItemTemplate});
        list.updateContent(content);
        self.columns.newColumn().addSubview(list.view());
        self.columns.renderColumns();
        $('#main').animate({scrollLeft: 10000}, 1250);
    };

    var renderFile = function(file) {
        var elt = $('#details').clone(true).show();
        elt.data(file);
        FI.View.renderView(elt, {VIEW: APP.DetailsViewAttributes});
        self.columns.newColumn().addSubview(elt);
        self.columns.renderColumns();
        $('#main').animate({scrollLeft: 10000}, 1250);
    };

    self.browse.didDelete = function(response) {
        if (response.ok) {
            var elt = self.currentSelection;
            self.cancelSelection(elt);
            self.currentColumn = elt.first().parents('.column');
            if (self.currentColumn.length > 0) {
                var vi = self.currentColumn.data().viewIndex;
                self.columns.selectColumn(vi);
            }
            elt.remove();
            self.deletion = null;
            self.currentSelection = $('.list .selected').last();
            if (self.currentSelection.length < 1) {
                self.currentSelection = $('#homedata');
            }
        }
    };
    
    self.browse.didUpdate = function(response) {
        FI.log.apply(this, arguments);
        self.currentColumn = self.currentSelection.first().parents('.column');
        if (self.currentColumn.length === 0) {
            self.columns.selectColumn(-1);
        } else {
            var vi = self.currentColumn.data().viewIndex;
            self.columns.selectColumn(vi);
        }
        
        var data = self.currentSelection.data(),
            id = data.id;
        BROWSER.fetch(id);
        self.hideOverlay();
    };
    self.browse.didCreate = function(response) {
        FI.log.apply(this, arguments);
        self.currentColumn = self.currentSelection.first().parents('.column');
        if (self.currentColumn.length === 0) {
            self.columns.selectColumn(-1);
        } else {
            var vi = self.currentColumn.data().viewIndex;
            self.columns.selectColumn(vi);
        }
        
        var data = self.currentSelection.data(),
            id = data.id;
        BROWSER.fetch(id);
        self.hideOverlay();
    };
    self.browse.didError = function(xhr, status, err) {
        FI.log.apply(this, arguments);
        var httperr = self.HTTPError(xhr.status);
        if (httperr) {
            self.$.trigger("error", [httperr.status, {
                showError: true,
                error:httperr.error}]);
        } 
    };
    
    self.doSelection = function(elt) {
        self.currentSelection = elt;
        var id = elt.data().id;
        //FI.log('data', elt.data());
        BROWSER.fetch(id);
        self.selectionChanged();
    };
    
    self.cancelSelection = function(elt) {
        elt.removeClass('selected');
        if (elt.parents('#column-0').length === 1) {
            //FI.log('forcefully altering self.cS');
            self.currentSelection = $();
        } else {
            self.currentSelection = $('.list .selected').last();
        }
        self.selectionChanged();
    };
    
    self.selectionChanged = function() {
        var elt = self.currentSelection;
        if (elt.length < 1) {
            // nothing selected. select `#homedata`
            self.currentSelection = $("#homedata");
            self.disable("#delete", "#rename", "#download").enable("#upload", "#newdir");
        } else {
           elt.siblings('.selected').removeClass('selected');
           elt.addClass('selected');
           self.enable("#delete", "#rename");
           if (!elt.data().isDirectory) {
               // not a directory
               self.enable("#download").disable("#upload", "#newdir");
           } else {
               // directory
               self.disable("#download").enable("#upload", "#newdir");
           }
        }
        var id = self.currentSelection.data().id;
        self.updateHash(id);
    };
    
    // Authentication methods
    self.didAuthenticate = function(response, status, xhr) {
        if (response && response.ok) {
            self.columns.selectColumn(-1);
            USER = response.user;
            USER.home = {
                id:'/',
                isDirectory: true
            };
            self.currentSelection = $('#homedata').data(USER.home);
            BROWSER.fetch(USER.home.id);
            self.changeView("home");
            self.updateHash('/');
            $("#main").show();
            self.hideOverlay();
        }
        else {
            self.didNotAuthenticate(xhr, status, response);
        }
    };
    self.didNotAuthenticate = function(xhr, status, error) {
        if (xhr && xhr.responseText) self.doLogin(JSON.parse(xhr.responseText));
        else self.doLogin(xhr);
    };
    
    
    self.doLogin = function(error) {
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
            APP.authenticateUser(username, password);
        });
        self.showOverlay(elt, {cancel:function() {
            window.location = "/signup.html";
        }});
    };
    
    self.doLogout = function() {
        FI.log("Logging out");
        APP.killSession(function() {
            window.location = '/';
        });
    };
    
    self.showOverlay = function(elt, options) {
        options = options || {cancel:function(){}};
        options.cancel = options.cancel || function(){};
        //FI.log("overlay elt, options:", elt, options);
        elt = $(elt);
        var overlay = $("#overlay"),
            container = overlay.find("#overlay-container");
        container.empty();
        container.append(elt);
        $("#close-overlay, .cancel", overlay).click(function() {
            if ($(this).hasClass('disabled')) return;
            options.cancel();
            self.hideOverlay();
        });
        $(".ok", overlay).click(function() {
            if ($(this).hasClass('disabled')) return;
            if (options && options.ok && typeof(options.ok)==='function')
                options.ok();
            self.hideOverlay();
        });
        overlay.show();
    };
    self.hideOverlay = function() {
        var overlay = $("#overlay"),
            container = overlay.find("#overlay-container");
        $(".cancel", overlay).unbind();
        container.empty();
        overlay.hide();
    };
    
    // Setup the application
    FI.APP.setup({
        delegate: self,
        browser: 'browser'
    });
    
    
    // UI events
    $("#upload").click(function() {
        if ($(this).hasClass('disabled')) return;
        var elt = self.currentSelection;
        var data = elt.data();
        var id = data.id;
        if (!data.isDirectory) {
            //FI.APP.trigger('error',["Can't upload to a file!"]);
            return;
        }
        var uploadBar = $("#upload-bar").clone(); //not clone(true)
        $(".upload-to-dir", uploadBar).text("Upload to: "+id);
        var form = $("#upload-form", uploadBar);
        form.submit(function(evt) {
            evt.preventDefault(); // V.IMP!
            evt.stopPropagation();
            var fileName = form.find("input[name=file]").val();
            if (!fileName || fileName === '' || (/no file selected/i).test(fileName)) {
              uploadBar.addClass('error');
              return false;
            }
            form.ajaxSubmit({
                url: FI.pathJoin('/upload', id),
                type: "POST",
                success: function(response, status, xhr) {
                    if (!response.ok) {
                        try {
                            response = parse($(response).text());
                        } catch(err) {}
                    }
                    
                    if (response && response.ok) {
                        self.currentColumn = self.currentSelection.first().parents('.column');
                        if (self.currentColumn.length === 0) {
                            self.columns.selectColumn(-1);
                        } else {
                            var vi = self.currentColumn.data().viewIndex;
                            self.columns.selectColumn(vi);
                        }
                        
                        // var data = self.currentSelection.data(),
                        //     id = data.id;
                        BROWSER.fetch(id);
                        self.hideOverlay();
                    }
                },
                error: function(xhr, error, status) {
                    if (xhr.status >= 500)
                    self.$.trigger("error", ["Server Error", {
                        showError: true,
                        error: "There was an error uploading the file"}]);
                },
                clearForm: true
            });
            return false;
        });
        self.showOverlay(uploadBar, {
            cancel: function() {}
        });
    });
    
    $("#newdir").click(function() {
        if ($(this).hasClass('disabled')) return;
        var data = self.currentSelection.data();
        if (!data.isDirectory) return;
        var id = data.id;
        var elt = $("#newdir-bar").clone();
        elt.find(".newdir-parent").text(id);
        self.showOverlay(elt, {
            ok:function() {
                var dirname = elt.find("input[name=dirname]").val();
                BROWSER.create(FI.pathJoin(id, dirname));
            }
        });
    });
    
    $("#delete, #delete-file").click(function() {
        if ($(this).hasClass('disabled')) return;
        var elt = self.currentSelection;
        var id = elt.data().id;
        var con = $("#delete-bar").clone();
        con.find(".file-name").text(id);
        self.showOverlay(con, {
            ok: function() {
                BROWSER.remove(id);
            },
            cancel: function() {}
        });
    });
    $("#rename, #rename-file").click(function() {
        if ($(this).hasClass('disabled')) return;
        var elt = self.currentSelection;
        var id = elt.data().id;
        var par = id.substring(0, id.lastIndexOf('/'));
        var con = $("#rename-bar").clone();
        con.find(".rename-file-id").text(id);
        self.showOverlay(con, {
            ok: function() {
                var newname = con.find("input[name=newname]").val();
                if (newname && newname !== '') {
                    self.cancelSelection(self.currentSelection);
                    BROWSER.update(id, {id:FI.pathJoin(par, newname)});
                }
            },
            cancel: function() {}
        });
    });
    
    $("#download, #download-file").click(function() {
        if ($(this).hasClass('disabled')) return;
        var id = $(".list .selected").last().data().id;
        if (!id) {
            // Download error: Nothing selected!
            return;
        }
        var ifr = DOWNLOAD(id);
        $("#hidden").get(0).appendChild(ifr);
    });
    
    $("#open-file").click(function() {
        var data = self.currentSelection.data();
        var id = data.id;
        var uri = FI.pathJoin(APP.kDownloadURI, id);
        var mime = FI.parseMIME(data.type);
        if (!mime) {
            self.$.trigger('error', ["Can't preview file",{
                showError: true,
                error: "File type not supported"}]);
            return;
        }
        var tags = self.tagForType(mime.type);
        var cont = $("#open-container").clone();
        var elt = $(tags[0]);
        if (elt.is('video')) cont.addClass('video');
        cont.append(elt);
        elt.attr('src', uri);
        self.showOverlay(cont, {cancel:function(){}});
    });
    
    $("#settings").click(function() {
        if ($(this).hasClass('disabled')) return;
        var elt = $("#settings-bar").clone();
        elt.find("#logout").click(function() {
            self.doLogout();
        });
        self.showOverlay(elt, {
            cancel: function() {}
        });
    });
    
    APP.authenticated(function(response, status) {
        if (status === 401) {
            self.doLogin();
        } else {
            self.didAuthenticate(response);
        }
    });
    //self.doLogin();
    //APP.authenticateUser('arunjitsingh', 'arunjitsingh');
    
    // NEVER DO THIS! DEBUGGING ONLY
    window.SELF = self;
    // Rebind window.self;
    window.self = window._self;
    delete window._self;
});