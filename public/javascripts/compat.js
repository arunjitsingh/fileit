(function () {
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
    
    var DATE_RE = /^(\d{4}|[+\-]\d{6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?))?/;
    var origParse = Date.parse;
    Date.parse = function (date) {
        var timestamp = origParse(date), minutesOffset = 0, struct;
        if ((isNaN(timestamp) || !timestamp) && (struct = DATE_RE.exec(date))) {
            if (struct[8] !== 'Z') {
                minutesOffset = +struct[10] * 60 + (+struct[11]);
                
                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }
            timestamp = Date.UTC(+struct[1], +struct[2] - 1, +struct[3], +struct[4], +struct[5] + minutesOffset, +struct[6], +struct[7].substr(0, 3));
        }
        
        return timestamp;
    };
}());