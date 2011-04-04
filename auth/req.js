var USER_KEYS = ["_id", "id", "name", "servers", "shared", "friends"];
var parseDoc = function(doc) {
    var ret = {};
    USER_KEYS.forEach(function(key) {
        ret[key] = doc[key];
    });
    return ret;
};

module.exports = function(req, userDoc) {
    if (!req.session) {
        throw "Session not available!";
    }
    if (userDoc && typeof(userDoc) === 'object') {
        userDoc.id = userDoc._id;
        req.session.user = userDoc;
        return parseDoc(req.session.user);
    }
    if (!req.session || !req.session.user) {
        return null;
    }
    return parseDoc(req.session.user);
};