TangibleModule = function($) {

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

// TV   a = (a, Sink a)
// Sink a = a -> Widget
// Src  a = (a -> Callback) -> Widget

$$.lambda = function(f) {
    return {
        value: f,
        ui: $$.funcPanel($$.codeInput, $$.codeOutput)
    }
};

// funcPanel : Src a * Sink b -> Sink (a -> b)
$$.funcPanel = function(input, output) {
    return function(f) { 
        var outContainer = elt('div');
        return elt('table', {},
            elt('tr', {},
                elt('td', {}, 
                    input(function(x) { 
                        outContainer.empty();
                        outContainer.append(output(f(x)));
                    })),
                elt('td', {},
                    outContainer)));
    }
};

// codeInput : Src Value
$$.codeInput = function(callback) {
    var box = elt('input', { type: 'text' });
    box.change(function() {
        try {
            var result = eval(box.val());
        }
        catch (e) {
            return;
        }
        callback(result);
    });
    return box;
};

$$.codeOutput = function(value) {
    return elt('pre', {}, text(value));
};

return $$;

};
