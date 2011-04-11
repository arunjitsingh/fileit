if(!Object.keys) {
    Object.keys = function(o) {
        if (o !== Object(o))
            throw new TypeError('Object.keys called on non-object');
        var ret=[],p;
        for(p in o) if(Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
        return ret;
    };
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fun /*, thisp */) {
        if (this === void 0 || this === null)
            throw new TypeError();

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function")
            throw new TypeError();

        var thisp = arguments[1];
        for (var i = 0; i < len; ++i) {
            if (i in t)
                fun.call(thisp, t[i], i, t);
        }
    };
}