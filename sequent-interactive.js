SequentInteractiveModule = function($, CodeMirror) {

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

$$.repl = function() {
    var io = elt('div', { class: 'sequent-io' });
    var editor = elt('div', { class: 'sequent-editor' } );
    var mirror = CodeMirror(function(cmelt) {
        editor.append(cmelt);
    });
    io.append(editor);
    
    var result = elt('div', { class: 'sequent-output span11 offset1' }, text('Foo!'));
    io.append(result);
    return io;
};

return $$;

};
