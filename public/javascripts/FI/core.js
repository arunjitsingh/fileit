
var FI = {};

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
FI.parseMIME = function(mimeType) {
    var mimeRE = /^([a-z]+)(\/)([a-z0-9\-]+)/;
    var match = mimeType.match(mimeRE);
    if (match) return {type:match[1], subtype:match[3]};
    else return {type: mimeType, subtype:mimeType};
};

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
    //FI.log(data, "FI.View.applyAttributes");
    for (attr in attributes) {
        var key = attributes[attr]['key'];
        //console.log(key);
        var transform = attributes[attr]['transformedValue'] || function(value){return value;};
        var value = data[key];
        //console.log(value);
        if (value) {
            value = transform(value);
            if (attr.match(/content/i)) {
                var type = attributes[attr]['type'] || "";
                if (type.match(/te?xt/i)) {
                    elt.text(value);
                } else if (type.match(/(ima?ge?|video|audio)/i)) {
                    elt.attr('src', value);
                } else {
                    elt.html(value);
                }
            } else {
                if (attr.match(/class/i)) {
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
    autoScrollX:true,
    autoScrollY:true,
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
                if (evt.originalEvent.kFIContinueUp) {
                    var idx = $(this).data().viewIndex;
                    self.selectColumn(idx);
                    evt.originalEvent.kFIContinueUp = false;
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
        var i = this.currentLevel = (idx >= 0) ? idx : -1;
        var c = this.columns.count();
        var num = (c>i) ? c-i : c;
//      FI.log("idx="+idx+",count="+c+",currentLevel="+i+",num="+num);
        for (i = 0; i < num-1; ++i) {
            var p = this.columns.pop();
            if (p) {
                p.view().remove();
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
        },
        ACTION: {
            'click': function(){alert('clicked');}      
        }
    }
};

FI.ListView = FI.View.extend({
    init: function(node, options) {
        this.__super__(node);
        this.__content = [];
        this.options = $.extend(FI.ListViewOptions, options);
    },
    
    view: function() {
        this.render();
        return this.node;
    },
    
    render: function() {
        var count = this.__content.length;
        for (var i = 0; i < count; ++i) {
            var li = FI.$new('li',{});
            li.data(this.__content[i]);
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
            //console.log(sel);
            if (sel.match(/:root/i)) {
                e = elt;
                //console.log(":root found");
            } else {
                e = elt.children(sel);
            }
            //console.log("E:");console.log(e[0]);
            var attributes = view[sel];
            e = FI.View.applyAttributes(e, attributes);
        }
        
        if ("ACTION" in design) {
            elt.bind(design.ACTION);
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

FI.ListView.createSimpleList = function(options) {
    var elt = FI.$new('ul',{'class':'list'});
    return new FI.ListView(elt, options);
};