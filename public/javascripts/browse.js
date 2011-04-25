(function($) {
    
    if (!(FI && FI.APP && FI.APP.inited)) {
        throw "Application not initialied!";
    }
    
    var self = $({});

    var APP = FI.APP;
    var USER = APP.user;

    var json = JSON.stringify;

    var Controller = (function(delegate) {
        var self = {};
        self.toUploadURI = function(id) {
            return FI.pathJoin(APP.kServerRoot, APP.kUploadURI, id);
        };
        self.toBrowseURI = function(id) {
            return FI.pathJoin(APP.kServerRoot, APP.kBrowseURI, id);
        };
        self.toDownloadURI = function(id) {
            return FI.pathJoin(APP.kServerRoot, APP.kDownloadURI, id);
        };

        self.fetch = function(uri, callback) {
            FI.log("Fetching", uri);
            var resource = self.toBrowseURI(uri);
            var options = APP.ajaxOptions({
                url: resource,
                type: GET,
                success: callback || delegate.didFetch,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };

        self.create = function(uri, callback) {
            FI.log("Creating", uri);
            var resource = self.toBrowseURI(uri);
            var options = APP.ajaxOptions({
                url: resource,
                type: POST,
                success: callback || delegate.didCreate,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };

        self.update = function(uri, data, callback) {
            FI.log("Updating", uri);
            var resource = self.toBrowseURI(uri);
            var options = APP.ajaxOptions({
                url: resource,
                type: PUT,
                data: json(data),
                success: callback || delegate.didUpdate,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };

        self.remove = function(uri, callback) {
            FI.log("Deleting", uri);
            var resource = self.toBrowseURI(uri);
            var options = APP.ajaxOptions({
                url: resource,
                type: DELETE,
                success: callback || delegate.didDelete,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };

        self.download = function(id) {
            var uri = self.toDownloadURI(id);
            var ifr = document.createElement('iframe');
            ifr.src = uri + "?download=true";
            return ifr;
        };
        return self;
    })(self);


    // Application data-view templates
    self.ListItemTemplate = {
        VIEW: {
            ':root': {          
                'content': {
                    'key': 'id',
                    'type': 'text',
                    transformedValue: APP.Transformers.ID
                },
                'data-id': {
                    'key': 'id'
                },
                'data-type': {
                    'key': 'type'
                },
                'class': [
                    {   'key': 'isDirectory',
                        transformedValue: function(value) {
                            return (value) ? "DIR" : "";
                        }
                    }, { 'key': 'type', transformedValue: APP.Transformers.TypeForMIME}
                ]

            }
        }
    };



    self.DetailsViewAttributes = {
        '.file-name': {'content':{'key':'id', 'type':'text', transformedValue: APP.Transformers.ID}},
        '.file-type': {'content':{'key':'type', 'type':'img', transformedValue: APP.Transformers.ImageForMIME}},
        '.file-size': {'content':{'key':'size', 'type':'text', transformedValue: APP.Transformers.Size}},
        '.file-ctime': {'content':{'key':'ctime', 'type':'text', transformedValue: APP.Transformers.Date}},
        '.file-mtime': {'content':{'key':'mtime', 'type':'text', transformedValue: APP.Transformers.Date}},
        '#open-file': {'class':{key:'type', transformedValue: APP.Transformers.TypeDisability}}
    };

    self.columnWidth = 325;
    self.ColumnViewOptions = {
        columnWidth: self.columnWidth,
        autoScrollX: NO,
        columnCSS: {
            'width' : self.columnWidth
        }
    };
    
    self.currentSelection = null;
    self.currentColumn = null;
    self.columns = new(FI.ColumnView)("#browser-view", self.ColumnViewOptions);
    
    
    // Some delegate methods for BROWSER
    self.didFetch = function(response) {
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
        var list = FI.ListView.createSimpleList({template: self.ListItemTemplate}, self);
        list.updateContent(content);
        self.columns.newColumn().addSubview(list.view(YES));
        self.columns.renderColumns();
        
        APP.updateMain();
    };

    var renderFile = function(file) {
        var elt = $('#details').clone(true).show();
        elt.data(file);
        FI.View.renderView(elt, {VIEW: self.DetailsViewAttributes});
        self.columns.newColumn().addSubview(elt);
        self.columns.renderColumns();
        
        APP.updateMain();
    };

    self.didDelete = function(response) {
        if (response.ok) {
            var elt = self.currentSelection;
            self.cancelSelection(elt);
            self.currentColumn = elt.first().parents('.column');
            if (self.currentColumn.length > 0) {
                var vi = self.currentColumn.data().viewIndex;
                self.columns.selectColumn(vi);
            }
            elt.remove();
            self.currentSelection = $('.list .selected').last();
            if (self.currentSelection.length < 1) {
                self.currentSelection = $('#homedata');
            }
        }
    };

    self.didUpdate = function(response) {
        FI.log.apply(this, arguments);
        self.currentColumn = self.currentSelection.first().parents('.column');
        if (self.currentColumn.length === 0) {
            self.columns.selectColumn(-1);
        } else {
            var vi = self.currentColumn.data().viewIndex;
            self.columns.selectColumn(vi);
        }
        var nid = response.id;
        var data = self.currentSelection.data(),
            id = data.id;
        if (nid) {
            Controller.fetch(id, function(res) {
                self.didFetch(res);
                $(".column").last().find("[data-id='" + nid +"']").click();
            });
        } else {
            Controller.fetch(id);
        }
        APP.hideOverlay();
    };
    self.didCreate = function(response) {
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
        Controller.fetch(id);
        APP.hideOverlay();
    };
    self.didError = function(xhr, status, err) {
        FI.log.apply(this, arguments);
        var httperr = APP.HTTP.Error(xhr.status);
        if (httperr) {
            APP.$.trigger("error", [httperr.status, {
                showError: true,
                error:httperr.error}]);
        } 
    };

    self.doSelection = function(elt, list, fn) {
        var callback = typeof(list)==='function' ? list : fn;
        self.currentSelection = elt;
        var id = elt.data().id;
        //FI.log('data', elt.data());
        Controller.fetch(id);
        self.selectionChanged(callback);
    };

    self.cancelSelection = function(elt, list, fn) {
        var callback = typeof(list)==='function' ? list : fn;
        self.currentSelection 
            && self.currentSelection.removeClass('selected');
        elt.removeClass('selected');
        if (elt.parents('#column-0').length === 1) {
            //FI.log('forcefully altering self.cS');
            self.currentSelection = $();
        } else {
            self.currentSelection = $('.list .selected').last();
        }
        self.selectionChanged(callback);
    };

    self.selectionChanged = function(callback) {
        // `callback` for dependant code
        var cb = callback && typeof(callback)==='function';
        // `setTimeout` to fix a problem with selectors being slower
        // than async callback to here. 50ms is plenty of time for 
        // the selectors to propagate to all elements
        setTimeout(function() {
            var elt = self.currentSelection;
            //FI.log("selectionChanged > ", elt.get(0));
            if (elt.length < 1) {
                // nothing selected. select `#homedata`
                self.currentSelection = $("#homedata");
                $("#delete, #rename, #download").disable();
                $("#upload, #newdir").enable();
            } else {
               elt.siblings('.selected').removeClass('selected');
               elt.addClass('selected');
               $("#delete, #rename").enable();

               if (!elt.data().isDirectory) {
                   // not a directory
                   $("#download").enable();
                   $("#upload, #newdir").disable();
               } else {
                   // directory
                   $("#download").disable();
                   $("#upload, #newdir").enable();
               }
            }
            var id = self.currentSelection.data().id;
            APP.updateHash(id);
            cb && callback();
        }, 50);
    };
    
    var fRegister = function() {
        APP.$main.hide();
        $("#browser-view").show().siblings().hide();
        self.columns.selectColumn(-1);
        USER.home = USER.home || {id: '/', isDirectory: true};
        self.currentSelection = $("#homedata").data(USER.home);
        Controller.fetch(USER.home.id);
        $("#newdir, #upload").enable();
        APP.updateHash('/');
        APP.$main.show();
    };
    
    APP.registerView('home', fRegister);
    
    $(document).ready(function() {
        $("#upload").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var elt = self.currentSelection;
            var data = elt.data();
            var id = data.id;
            if (!data.isDirectory) {
                //FI.APP.trigger('error',["Can't upload to a file!"]);
                return;
            }
            var uploadBar = $("#upload-bar").clone(); //not clone(true)
            $(".upload-to-dir", uploadBar).text(id);
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
                            Controller.fetch(id);
                            APP.hideOverlay();
                            APP.$.trigger("success", [{showInfo:true, info: "File was uploaded!"}]);
                        }
                    },
                    error: function(xhr, error, status) {
                        if (xhr.status >= 500)
                        APP.$.trigger("error", ["Server Error", {
                            showError: true,
                            error: "There was an error uploading the file"}]);
                    },
                    clearForm: true
                });
                return false;
            });
            APP.showOverlay(uploadBar, {
                cancel: function() {}
            });
        });

        $("#newdir").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var data = self.currentSelection.data();
            if (!data.isDirectory) return;
            var id = data.id;
            var elt = $("#newdir-bar").clone();
            elt.find(".newdir-parent").text(id);
            APP.showOverlay(elt, {
                ok:function() {
                    var dirname = elt.find("input[name=dirname]").val();
                    Controller.create(FI.pathJoin(id, dirname));
                }
            });
        });

        $("#delete, #delete-file").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var elt = self.currentSelection;
            var id = elt.data().id;
            var con = $("#delete-bar").clone();
            con.find(".file-name").text(id);
            APP.showOverlay(con, {
                ok: function() {
                    Controller.remove(id);
                },
                cancel: function() {}
            });
        });

        $("#rename, #rename-file").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var elt = self.currentSelection;
            var id = elt.data().id;
            var par = id.substring(0, id.lastIndexOf('/'));
            var con = $("#rename-bar").clone();
            var fn = FI.pathBaseName(id);
            con.find(".rename-file-id").text(fn);
            con.find("input[name=newname]").val(fn);
            APP.showOverlay(con, {
                ok: function() {
                    var newname = con.find("input[name=newname]").val();
                    if (newname && newname !== '') {
                        self.cancelSelection(self.currentSelection, function() {
                            Controller.update(id, {id:FI.pathJoin(par, newname)});
                        });

                    }
                },
                cancel: function() {}
            });
        });

        $("#download, #download-file").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var id = $(".list .selected").last().data().id;
            if (!id) {
                // Download error: Nothing selected!
                return;
            }
            var ifr = Controller.download(id);
            $("#hidden").get(0).appendChild(ifr);
        });

        $("#open-file").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var data = self.currentSelection.data();
            var id = data.id;
            var uri = FI.pathJoin(APP.kServerRoot, APP.kDownloadURI, id);
            var mime = FI.parseMIME(data.type);
            FI.APP.openFile(uri, mime);
        });
        
        $("#cdn-check").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var data = self.currentSelection.data();
            var id = data.id;
            var uri = FI.pathJoin(APP.kServerRoot, '/-info', id);
            var options = APP.ajaxOptions({
                url: uri,
                type: GET,
                success: function(response) {
                    if (response && response.ok) {
                        if (response.exists) {
                            var cdn = location.origin + "/" + FI.pathJoin(APP.kCDNURI, APP.user._id, id);
                            $("#cdn-result").text(cdn).attr('href', cdn).enable();
                        } else {
                            $("#cdn-result").text("Not in CDN yet");
                        }
                    }
                }
            });
            $.ajax(options);
        });
    });
})(jQuery);