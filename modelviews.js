ModelViews = function($, CodeMirror) {

// path-tracking mappings of data structures into html views

// View a, for some type a, is a function of the following type
//
// View a = a -> {
//              value : () -> a
//              ui    : JQuery
//              ...
//          }
//
// Such that if f : View a, then value(f(x)) = x and f(value(x)) = x,
// where the latter equality is approximate and may lose a little bit
// of state. 

var elt = function(type, attrs) {
    var ret = $(document.createElement(type));
    if (attrs) {
        for (var i in attrs) {
            ret.attr(i, attrs[i]);
        }
    }
    for (var i = 2; i < arguments.length; i++) {
        ret.append(arguments[i]);
    }
    return ret;
};

var text = function(text) {
    return $(document.createTextNode(text));
};


var $$ = {};

return $$;

};
