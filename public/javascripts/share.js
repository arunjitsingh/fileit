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
        self.toSharedURI = function(uri) {
            return FI.pathJoin(APP.kServerRoot, APP.kSharedURI, uri);
        };
        self.toShareURI = function(uri) {
            return FI.pathJoin(APP.kServerRoot, APP.kShareURI, uri);
        };
        self.toDownloadURI = function(uri) {
            return FI.pathJoin(APP.kServerRoot, APP.kSharedDownloadURI, uri);
        };
        self.toCDNURI = function(uri) {
            return FI.pathJoin(APP.kServerRoot, APP.kCDNURI, uri);
        };

        self.fetch = function(callback) {
            var uri = self.toSharedURI('/');
            var options = APP.ajaxOptions({
                url: uri,
                type: GET,
                success: callback || delegate.didFetch,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };
        self.fetchFile = function(uri, callback) {
            uri = self.toSharedURI(uri);
            var options = APP.ajaxOptions({
                url: uri,
                type: GET,
                success: callback || delegate.didFetchFile,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };
        self.send = function(user, id, callback) {
            var uri = self.toShareURI('/');
            uri = FI.pathJoin(uri, user, id);
            var options = APP.ajaxOptions({
                url: uri,
                type: POST,
                success: callback || delegate.didSend,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };
        self.sendToCDN = function(id, callback) {
            var uri = self.toCDNURI(id);
            var options = APP.ajaxOptions({
                url: uri,
                type: POST,
                success: callback || delegate.didSendToCDN,
                error: callback || delegate.didError
            });
            $.ajax(options);
        };
        self.open = function(uri) {
            uri = self.toDownloadURI(uri);
            var ifr = document.createElement('iframe');
            ifr.src = uri;
            return ifr;
        };
        self.download = function(uri) {
            uri = self.toDownloadURI(uri);
            var ifr = document.createElement('iframe');
            ifr.src = uri + "?download=true";
            return ifr;
        };
        return self;
        
    })(self);


    APP.Transformers.SharedListFromArray = function(content) {
        return content.map(function(c) {
            var it = c.split('/');
            var _ret = {};
            _ret.user = it.shift(1);
            _ret.file = it.pop();
            _ret.uri = c;
            return _ret;
        });
    };

    self.ListItemTemplate = {
        VIEW: {
            ':root': {
                'data-uri': {
                    'key': 'uri'
                }
            },
            '.file': {
                'content': {
                    'key': 'file',
                    'type': 'text',
                    transformedValue: APP.Transformers.ID
                }
            },
            '.user': {
                'content': {
                    'key': 'user',
                    'type': 'text'
                }
            }
        }
    };
    
    self.ListViewOptions = {
        template: self.ListItemTemplate,
        cloneFrom: "#template-elements .sli"
    };
    
    self.DetailsViewAttributes = {
        '.file-name': {'content':{'key':'id', 'type':'text', transformedValue: APP.Transformers.ID}},
        '.file-type': {'content':{'key':'type', 'type':'img', transformedValue: APP.Transformers.ImageForMIME}},
        '.file-size': {'content':{'key':'size', 'type':'text', transformedValue: APP.Transformers.Size}},
        '.file-ctime': {'content':{'key':'ctime', 'type':'text', transformedValue: APP.Transformers.Date}},
        '.file-mtime': {'content':{'key':'mtime', 'type':'text', transformedValue: APP.Transformers.Date}},
        '#share-open-file': {'class':{key:'type', transformedValue: APP.Transformers.TypeDisability}}
    };

    self.$list = $("#shared-list .list.shared");
    self.$viewer = $("#shared-viewer");

    self.currentSelection = null;
    
    self.didFetch = function(response) {
        if (response && response.ok) {
            var content = response.content;
            content = APP.Transformers.SharedListFromArray(content);
            renderList(content);
        }
        
    };
    
    var renderList = function(content) {
        var ul = self.$list.empty();
        var list = new(FI.ListView)(ul, self.ListViewOptions, self);
        list.updateContent(content);
        list.render();
    };
    
    self.didFetchFile = function(response) {
        if (response && response.ok) {
            var file = response.content;
            renderFile(file);
            FI.log("share#didFetchFile", file);
        }
        
    };
    var renderFile = function(file) {
        self.$viewer.empty();
        var elt = $("#template-elements #share-details").last().clone(true).show();
        elt.data(file);
        FI.log(elt.data());
        FI.View.renderView(elt, {VIEW: self.DetailsViewAttributes});
        self.$viewer.append(elt);
    };
    
    self.didSend = function(response) {
        if (response && response.ok) {
            FI.log("Shared the file!");
            APP.$.trigger("success", [{showInfo: true, info:"Your file was shared!"}]);
        }
        
    };
    self.didSendToCDN = function(response) {
        if (response && response.ok) {
            FI.log("Added File to CDN!");
            var uri = response.uri || "";
            uri = (location.origin) + uri;
            var info = "Added File to CDN!<br><span class='info-uri'>" + uri + "</span>";
            APP.$.trigger("success", [{showInfo: true, info:info}]);
        }
    };

    self.didError = function() {
        FI.log.apply(this, arguments);
    };

    self.doSelection = function(elt, list, fn) {
        var callback = typeof(list)==='function' ? list : fn;
        self.currentSelection = elt;
        var uri = elt.data().uri;
        // var ifr = Controller.open(uri);
        //         self.$viewer.empty();
        //         self.$viewer.append(ifr);
        Controller.fetchFile(uri);
        self.selectionChanged();
    };
    
    self.cancelSelection = function(elt, list, fn) {
        var callback = typeof(list)==='function' ? list : fn;
        elt.removeClass("selected");
        self.currentSelection = $();
        self.$viewer.empty();
        self.selectionChanged();
    };
    
    self.selectionChanged = function(callback) {
        var cb = callback && typeof(callback)==='function';
        setTimeout(function() {
            var elt = self.currentSelection;
            var uri;
            if (!elt || elt.length < 1) {
                // nothing selected
                $("#download").disable();
                uri = '/';
            } else {
                elt.addClass('selected');
                elt.siblings('.selected').removeClass('selected');
                $("#download").enable();
                uri = elt.data().uri;
            }
            APP.updateHash(uri);
            cb && callback();
        }, 50);
        
    };

    var fRegister = function() {
        APP.$main.hide();
        $("#shared-view").show().siblings().empty().hide();
        $("#file-controls .button").disable();
        Controller.fetch();
        APP.updateHash('/');
        APP.$main.show();
    };
    
    APP.registerView('shared', fRegister);
    
    $(document).ready(function() {
        $("#download, #share-download-file").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'shared') return;
            var uri = self.currentSelection.data().uri;
            if (!uri) {
                // Download error: Nothing selected!
                return;
            }
            var ifr = Controller.download(uri);
            $("#hidden").get(0).appendChild(ifr);
        });
        $("#share-open-file").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'shared') return;
            var by = self.currentSelection.data().user;
            var data = self.$viewer.find("#share-details").data();
            var id = data.id;
            var uri = FI.pathJoin(APP.kSharedDownloadURI, by, id);
            var mime = FI.parseMIME(data.type);
            FI.APP.openFile(uri, mime);
        });
        
        //SPECIAL for `home` view only!
        $("#share-file").click(function() {
            if ($(this).hasClass('disabled')) return;
            if (APP.currentView !== 'home') return;
            var elt = $("#browser-view .list .selected").last();
            var id = elt.data().id;
            if (!id) {
                // Share error: Nothing selected!
                return;
            }
            var shareBar = $("#share-bar").clone();
            var fn = FI.pathBaseName(id);
            $(".file-name", shareBar).text(fn);
            APP.showOverlay(shareBar, {
                ok: function() {
                    var user = shareBar.find("input[name=friendID]").val();
                    var cdn = shareBar.find("input[name=cdnadd]").val();
                    if (user && user !== '' && user !== APP.user.id) {
                        Controller.send(user, id);
                    }
                    if (cdn) {
                        Controller.sendToCDN(id);
                    }
                },
                cancel: function() {}
            });
        });
        
    });
    
})(jQuery);