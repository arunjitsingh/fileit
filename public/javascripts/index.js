/**
 * @author arunjitsingh
 */

$(document).ready(function() {
    
    if (window.self) {
        window._self = window.self;
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
    
    // self.__currentSelection = null;
    // self.currentSelection = function(sel) {
    //     if (sel) {
    //         self.__currentSelection = sel;
    //     }
    //     return self.__currentSelection;
    // };
    
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
    
    var app = FI.APP;
    var browser  = FI.APP.browse;
    var download = FI.APP.download;
    
    var toUploadURI = function(id) {
        return FI.pathJoin(FI.APP.kServerRoot, FI.APP.kUploadURI, id);
    };
    
    
    //TODO: put this as an event
    var updateHash = function(id) {
        //FI.log("HASH", FI.APP.user.home, id);
        id = id || self.currentSelection.data().id;
        var uri = FI.pathJoin(FI.APP.user.home.id, id);
        window.location.hash = uri;
    };
    
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
        var list = FI.ListView.createSimpleList({template:FI.APP.ListItemTemplate});
        list.updateContent(content);
        FI.APP.columns.newColumn().addSubview(list.view());
        FI.APP.columns.renderColumns();
        $('#main').get(0).scrollLeft = 10000;
    };

    var renderFile = function(file) {
        var elt = $('#details').clone().show();
        elt.data(file);
        FI.View.renderView(elt, {VIEW:FI.APP.DetailsViewAttributes});
        FI.APP.columns.newColumn().addSubview(elt);
        FI.APP.columns.renderColumns();
        $('#main').get(0).scrollLeft = 10000;
    };

    self.browse.didDelete = function(response) {
        if (response.ok) {
            var elt = (self.deletion) ? self.deletion : $('.selected').last();
            self.currentColumn = elt.first().parents('.column');
            if (self.currentColumn.length > 0) {
                var vi = self.currentColumn.data().viewIndex;
                FI.APP.columns.selectColumn(vi);
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
    };
    self.browse.didCreate = function(response) {
        FI.log.apply(this, arguments);
    };
    self.browse.didError = function(xhr, status, err) {
        FI.log.apply(this, arguments);
    };
    
    self.doSelection = function(elt) {
        self.currentSelection = elt;
        var id = elt.data().id;
        //FI.log('data', elt.data());
        browser.fetch(id);
        self.selectionChanged();
    };
    
    self.cancelSelection = function(elt) {
        elt.removeClass('selected');
        window.ELT = elt;
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
            self.disable("#delete", "#download").enable("#upload", "#newdir");
        } else {
           elt.siblings('.selected').removeClass('selected');
           elt.addClass('selected');
           self.enable("#delete");
           if (!elt.data().isDirectory) {
               // not a directory
               self.enable("#download").disable("#upload", "#newdir");
           } else {
               // directory
               self.disable("#download").enable("#upload", "#newdir");
           }
        }
        var id = self.currentSelection.data().id;
        updateHash(id);
    };
    
    
    // Setup the application
    FI.APP.setup({
        delegate: self,
        browser: 'browser'
    });
    
    
    // UI events
    var form = $("#upload-form");
    form.submit(function(evt) {
        evt.preventDefault();
        var data = self.currentSelection.data();
        if (!data.isDirectory) {
            //FI.APP.trigger('error',["Can't upload to a file!"]);
            return false;
        }
        var id = data.id;
        var fileName = form.find("input[name=file]").val();

        if (_.isEmpty(fileName) || (/no file selected/i).test(fileName)) {
          //FI.APP.trigger("error", ["Can't Upload! Please select a file"]);
          return false;
        }
        form.ajaxSubmit({
            url: FI.pathJoin('/upload', id),
            type: "POST",
            success: function(response, status, xhr) {
                // Upload complete
                response = parse($(response).text());
            },
            error: function(xhr, error, status) {
                // Upload error
            },
            clearForm: true
        });
        return false;
    });
    $("#upload").click(function() {
        if ($(this).hasClass('disabled')) return;
        $("#upload-toolbar").show();
    });
    $("#upload-toolbar .cancel").click(function() {
        $("#upload-toolbar").hide();
    });
    
    
    $("#delete, #delete-file").click(function() {
        if ($(this).hasClass('disabled')) return;
        var id = self.currentSelection.data().id;
        var del = confirm(id+" will be deleted!");
        if (!del) return;
        else {
            browser.remove(id);
        }
    });
    $("#download, #download-file").click(function() {
        if ($(this).hasClass('disabled')) return;
        var id = $(".list .selected").last().data().id;
        if (!id) {
            // Download error: Nothing selected!
            return;
        }
        var ifr = download(id);
        $("#hidden").get(0).appendChild(ifr);
    });
    
    
    $(document.body)
        .ajaxError(function(evt, xhr, sett, err) {
            // FI.APP.trigger('error', [err, xhr]);
        })
        .ajaxSuccess(function(res) {
            // FI.APP.trigger('success', [res]);
        });
    
    
    FI.APP.authenticateUser('arunjitsingh', 'arunjitsingh', function(res) {
        if (res && res.ok) {
            FI.APP.columns.selectColumn(-1);
            FI.APP.user = res.user;
            FI.APP.user.home = {
                id:'/',
                isDirectory: true
            };
            self.currentSelection = $('#homedata').data(FI.APP.user.home);
            browser.fetch(FI.APP.user.home.id);
            FI.APP.trigger('sidebar-selection', ['#home']);
            document.body.style['visibility'] = 'visible';
        }
        else {
            // Authentication error
        }
    });
    
    // DO NOT DO THIS! DEBUGGING ONLY
    window.SELF = self;
});