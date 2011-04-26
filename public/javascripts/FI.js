(function($) {
    if (!$) throw "jQuery is required for FI";
    
    var FI = {};
    var YES = true;
    var NO = false;
    
    
    FI.$ = function(value) {
        if(typeof(value)==='string' && !value.match(/^[#\.:]/)) {
            value = "#"+value;
        }
        return $(value);
    };

    FI.$new = function(tag, attrs) {
        var elt = '<'+tag+'></'+tag+'>';
        elt = $(elt);
        if (attrs && typeof(attrs) === "object") {
            for (var attr in attrs) {
                elt.attr(attr, attrs[attr]);
            }
        }
        return elt;
    };

    FI.timestamp = function() {
        return (new(Date)).toString();
    };

    FI.log = function() {
        if (window.debug) {
            debug.log.apply(debug, arguments);
        } else {
            console.log("--------", FI.timestamp(), "--------");
            console.log.apply(console, arguments);
            console.log("========");
        }
    };

    FI.pathJoin = function() {
        var args = [].slice.call(arguments);
        if (args.length === 1) {
            return args[0];
        } else {
            var RE = /\/{2,3}/g; // The `g` is important!
            var path = args.join('/');
            while (RE.test(path)) path = path.replace(RE, '/');
            return path;
        }
    };
    FI.pathBaseName = function(path) {
        return path.substring(path.lastIndexOf('/')+1);
    };
    FI.parseMIME = function(mimeType) {
        var mimeRE = /^([a-z]+)(\/)([a-z0-9\-]+)/;
        var match = mimeType.match(mimeRE);
        if (match) return {type:match[1], subtype:match[3]};
        else return null;
    };

    // Constants
    FI.kError   = "ERROR";
    FI.kSuccess = "SUCCESS";

    FI.Stack = Class({
        init: function() {
            this.stack = [];
            this.top = -1;
            if (arguments.length) {
                var array = arguments;
                if (arguments[0] instanceof Array) {
                    array = arguments[0];
                }
                for (var i = 0; i < array.length; ++i) {
                    this.push(array[i]);
                }
            }
        },

        push: function(value) {
            //FI.log('Pushing');
            this.stack[++this.top] = value;
            return this;
        },

        pop: function() {
            //FI.log('Popping');
            return (this.top >= 0) ? this.stack[this.top--] : null;
        },

        peek: function() {
            return (this.top >= 0) ? this.stack[this.top] : null;
        },

        count: function() {
            return this.top+1;
        },

        iterate: function(fn) {
            for (var i = 0; i <= this.top; ++i) {
                fn(this.stack[i], i, this);
            }
        },

        clear: function() {
            this.top = -1;
        }
    });

    FI.View = Class({
        init: function(node) {
            this.node = FI.$(node);
            this.setViewIndex(-1);
        },

        view: function() {
            return this.node;
        },

        element: function() {
            return this.node.get(0);
        },

        setViewIndex: function(idx) {
            this.node.data({'viewIndex':idx});
        },

        viewIndex: function() {
            return this.node.data().viewIndex;
        },

        acceptResponder: function(bindings) {
            this.node.bind(bindings);
            return this;
        }
    });

    FI.View.renderView = function(elt, template) {
        elt = $(elt);
        var view = template.VIEW;
        for (var sel in view) {
            var e;
            //console.log(sel);
            if (sel.match(/:root/i)) {
                e = elt;
                //console.log(":root found");
            } else {
                e = $(sel, elt);
            }
            e.data(elt.data());
            //FI.log(e, e.data());
            var attributes = view[sel];
            e = FI.View.applyAttributes(e, attributes);
        }

        if ("ACTION" in template) {
            elt.bind(template.ACTION);
        }
        return elt;
    };

    FI.View.applyAttributes = function(elt, attributes) {
        elt = $(elt);
        var data = elt.data();
        if (!data) {
            return elt;
        }

        //FI.log(data, "FI.View.applyAttributes");
        for (attr in attributes) {
            if (!attributes.hasOwnProperty(attr)) continue;

            var obj = attributes[attr];
            if ((/class/i).test(attr)) {
                if ($.isArray(obj)) {
                    //FI.log("Class is Array", obj);
                    obj.forEach(function(o) {
                        var k = o['key'];
                        var t = o['transformedValue'] || function(v) {return v;};
                        var v = data[k];
                        if (typeof(v) !== 'undefined') {
                            v = t(v);
                            elt.addClass(v);
                        }                        
                    });
                }                
                
            }
            
            var key = obj['key'];
            
            var transform = obj['transformedValue'] || function(value){return value;};
            var value = data[key];
            
            if (typeof(value) !== 'undefined') {
                value = transform(value);

                if ((/content/i).test(attr)) {
                    var type = obj['type'] || "";

                    if ((/te?xt/i).test(type)) {
                        elt.text(value);
                    } else if ((/(ima?ge?|video|audio)/i).test(type)) {
                        elt.attr('src', value);
                    } else {
                        elt.html(value);
                    }
                } else {
                    if ((/class/i).test(attr)) {
                        elt.addClass(value);
                    } else {
                        elt.attr(attr, value);
                    }
                }
            }
        }
        return elt;
    };


    FI.ContainerView = FI.View.extend({
        init: function(node) {
            this.__super__(node);
            this.node.addClass('fi-container');
            this.clear();
        },

        addSubview: function(view) {
            this.node.append(FI.$(view));
            return this;
        },

        removeSubview: function(view) {
            FI.$(view).remove();
            return this;
        },

        replaceAllWithView: function(view) {
            this.clear().addSubview(view);
            return this;
        },

        replaceViewWithView: function(oldView, newView) {
            this.removeSubview(oldView).addSubview(newView);
            return this;
        },

        clear: function() {
            this.node.empty();
            return this;
        }
    });


    /*FI>COLUMNVIEW*/

    FI.ColumnViewOptions = {
        columnIdPrefix:'column-',
        columnClass:'column',
        columnWidth:450,
        columnGap:10,
        autoScrollX:YES,
        autoScrollY:YES,
        columnCSS: {}   
    };

    FI.ColumnView = FI.View.extend({
        init: function(node, options) {
            this.__super__(node);
            this.options = $.extend({}, FI.ColumnViewOptions, options);
            this.currentLevel = -1;
            this.currentColumn = null;
            this.columns = new FI.Stack();
        },

        applyOptionsToView: function(view) {
            return FI.$(view).css({position: 'absolute',
                                'left': this.currentLevel*this.options.columnWidth+this.options.columnGap,
                                'overflow-x': (this.options.autoScrollX)?'scroll':'hidden',
                                'overflow-y': (this.options.autoScrollY)?'scroll':'hidden'
                            }).css(this.options.columnCSS);
        },

        newColumn: function() {
            if (this.currentColumn && this.currentColumn.view().children().length == 0) {
                // have empty column, use that
                return this.currentColumn;
            }
            
            this.currentLevel++;
            var nid = this.options.columnIdPrefix + this.currentLevel;
            var id = "#"+nid;
            var col = null;
            if (!$(id).length) {
                col = new FI.ContainerView(FI.$new('div',
                                                        {'id':nid, 
                                                        'class':this.options.columnClass}
                                                    ));
                //console.log(col.view()[0]);
            } else {
                col = new FI.ContainerView($(id).attr('class',this.options.columnClass));
            }
            col.setViewIndex(this.currentLevel);
            var self = this;
            col.acceptResponder({
                'click': function(evt) {
                    // click responder. This selects the column
                    if (evt.originalEvent && evt.originalEvent.kFIContinueUp) {
                        var idx = $(this).data().viewIndex;
                        self.selectColumn(idx);
                        evt.originalEvent.kFIContinueUp = NO;
                    }
                }
            });
            this.applyOptionsToView(col.view());
            this.columns.push(col);
            return this.currentColumn = col;
        },
        selectColumn: function(idx) {
            if (typeof(idx)==='object') {
                if ($(idx).data().viewIndex) {
                    idx = $(idx).data().viewIndex;
                } else if ($(idx).attr('id')) {
                    var eltid = $(idx).attr('id');
                    idx = parseInt(eltid.substring(eltid.lastIndexOf("-")+1), 10);
                } else {
                    throw new Error("Cannot select this column!");
                }
            }
            if ((this.currentLevel > 0) && (this.currentLevel === idx+1)) {
                this.currentColumn = this.columns.peek();
                this.currentColumn.clear();
                return this.currentColumn;
            }
            
            var i = this.currentLevel = (idx >= 0) ? idx : -1;
            var c = this.columns.count();
            var num = (c>i) ? c-i : c;
    //      FI.log("idx="+idx+",count="+c+",currentLevel="+i+",num="+num);
            
            while (--num) {
                var p = this.columns.pop();
                if (p) {
                    p.view().hide().remove();
                }
            }
            return this.currentColumn = this.columns.peek();
        },

        clearColumns: function() {
            this.columns.clear();
            this.renderColumns();
        },

        renderColumns: function() {
            var self = this;
            this.columns.iterate(function(col) {
                self.node.append(col.view());
            });
        }
    });


    /*FI>LISTVIEW*/
    FI.ListViewOptions = {
        template:{
            // Sample template
            VIEW:{
                ':root': {
                    'content': {
                        'key': 'id'
                    },
                    'class': {
                        'key': 'enabled',
                        transformedValue: function(value) {
                            return value?'enabled':'disabled';
                        }
                    }
                },
                'img': {
                    'src': {
                        'key': 'source'
                    }
                }
            }
        },
        cloneFrom: null,
        showEmpty: YES,
        autobind: YES
    };

    FI.ListView = FI.View.extend({
        init: function(node, options, delegate) {
            this.__super__(node);
            this.__content = [];
            this.__delegate = delegate;
            this.options = $.extend({}, FI.ListViewOptions, options);
        },

        view: function(doRender) {
            doRender && this.render();
            return this.node;
        },

        render: function() {
            var count = this.__content.length;
            var li;
            if (count == 0 && this.options.showEmpty) {
                li = FI.$new('li', {'class':'empty disabled'});
                li.text("No Content");
                this.node.append(li);
                return;
            }
            for (var i = 0; i < count; ++i) {
                if (this.options.cloneFrom !== null) {
                    li = $(this.options.cloneFrom).clone(true);
                } else {
                    li = FI.$new('li',{});
                }
                li.data(this.__content[i]);
                //FI.log(li, li.data());
                li = this.renderElement(li);
                this.node.append(li);
            }
        },

        renderElement: function(elt) {
            elt = $(elt);
            var design = this.options.template;
            var view = design.VIEW;
            for (var sel in view) {
                var e;
                //FI.log(sel);
                if (sel.match(/:root/i)) {
                    e = elt;
                    //FI.log(":root found");
                } else {
                    e = elt.children(sel);
                    e.data(elt.data());
                }
                //FI.log("E:", e[0]);
                var attributes = view[sel];
                e = FI.View.applyAttributes(e, attributes);
            }
            var self = this;
            if (this.options.autobind) {
                elt.bind({
                    'click':function(evt) {
                        evt.originalEvent && (evt.originalEvent.kFIContinueUp = YES);
                        //var elt = $(evt.target);
                        if (evt.metaKey || evt.ctrlKey) {
                            // Deselection
                            self.__delegate.cancelSelection(elt, self);
                        } else {
                            // Selection
                            self.__delegate.doSelection(elt, self);
                        }
                        return true;
                    }
                });
            }
            return elt;
        },

        content: function() {
            return this.__content;
        },

        updateContent: function(newContent) {
            this.__content = newContent;
            return this;
        }
    });

    FI.ListView.createSimpleList = function(options, delegate) {
        var elt = FI.$new('ul',{'class':'list'});
        return new FI.ListView(elt, options, delegate);
    };
    
    window.YES = YES;
    window.NO = NO;
    window.FI = FI;
})(jQuery);