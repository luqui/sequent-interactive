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

var expanderButton = function(smallText, bigText, cls) {
    cls = cls || '';
    return elt('div', { class: 'btn-group' },
        elt('div', { class: 'btn dropdown-toggle ' + cls, 'data-toggle': 'dropdown', href: '#' },
            text(smallText)),
        elt('ul', { class: 'dropdown-menu' }, 
            elt('li', {}, text(bigText))
        ));
};

var outputBox = function() {
    var box = elt('div', { class: 'sequent-output' })
    var name = elt('input', { class: 'span2 sequent-code-input', type: 'text', placeholder: 'Name...' });
    var info = elt('div');
    return {
        ui: elt('div', { class: 'row' },
                elt('div', { class: 'span2' }, name), 
                elt('div', { class: 'span9' }, box),
                elt('div', { class: 'span1' }, info)),
        update: function(content) {
            info.empty();
            info.append(expanderButton('OK', '', 'btn-success'));
            box.empty();
            box.append(elt('pre', {}, text(content)));
        },
        error: function(errorText) {
            info.empty();
            info.append(expanderButton('Error', errorText, 'btn-danger'));
        }
    };
};

var tryEval = function(code) {
    var evalled = safeTry(function() { return eval('(function() { return (' + code + ') })') });

    // O Haskell, how I miss thee  (return safeTry =<< evalled)
    if ('value' in evalled) {
        return safeTry(evalled.value);
    }
    else {
        return { error: evalled.error }
    }
};

var safeTry = function(fn) {
    try { 
        var r = fn();
        return { value: r }
    }
    catch (e) {
        return { error: e }
    }
}

var $$ = {};

$$.repl = function() {
    var io = elt('div', { class: 'sequent-io' });
    var editor = elt('div', { class: 'sequent-editor' } );
    var outbox = outputBox();
    var mirror = CodeMirror(function(cmelt) {
        editor.append(cmelt);
    }, {
        onKeyEvent: function() {
            var code = mirror.getValue();
            var result = tryEval(code);
            if ('value' in result) {
                outbox.update(result.value);
            }
            else {
                outbox.error(result.error);
            }
            return;
        }
    });

    io.append(elt('div', { class: 'row' }, elt('div', { class: 'span12' }, editor)));
    io.append(outbox.ui);

    return io;
};

return $$;

};
