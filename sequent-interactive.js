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

// Snippet = { name : String, code : String }
// SnippetList = List Snippet

var snippetEditorBag = function(snippet) {
    var editor = elt('div', { class: 'sequent-editor' });
    var outbag = outputBag();
    var name = elt('input', { class: 'sequent-code-input', type: 'text', placeholder: 'Name...', value: snippet.name });
    var mirror = CodeMirror(function(cm_elt) {
        editor.append(cm_elt);
    }, {
        value: snippet.code,
        onKeyEvent: function() {
            var code = mirror.getValue();
            if (code.match(/^\s*$/)) {
                outbag.empty();
            }
            else {
                var result = tryEval(code);
                if ('value' in result) {
                    outbag.update(result.value);
                }
                else {
                    outbag.error(result.error);
                }
            }
        }
    });

    return {
        ui: {
            editor: editor,
            name: name,
            status: outbag.ui.status,
            output: outbag.ui.output,
        },
        value: function() {
            return { 
                name: name.val(), 
                code: mirror.getValue() 
            }
        }
    }
};

var outputBag = function() {
    var output = elt('div', { class: 'sequent-output' }, elt('pre', {}, text(' ')));
    var status = elt('div');
    return {
        ui: {
            output: output,
            status: status
        },
        update: function(content) {
            status.empty();
            status.append(expanderButton('OK', '', 'btn-success'));
            output.empty();
            output.append(elt('pre', {}, text(content)));
        },
        error: function(errorText) {
            status.empty();
            status.append(expanderButton('Error', errorText, 'btn-danger'));
        },
        empty: function() {
            status.empty();
        }
    };
};


var assembleSnippetRow = function(ui, removeButton) {
    return (
        elt('div', {},
            elt('div', { class: 'row' }, 
                elt('div', { class: 'span2' }, ui.name.addClass('span2')),
                elt('div', { class: 'span9' }, ui.editor),
                elt('div', { class: 'span1' }, removeButton)),
            elt('div', { class: 'row' },
                elt('div', { class: 'span9 offset2' }, ui.output),
                elt('div', { class: 'span1' }, ui.status))));
};

var snippetList = function(list) {
    var editors_container = elt('div');
    var add_button = elt('button', { class: 'btn btn-block' }, elt('i', { class: 'icon-chevron-down' }));
    var add_button_container = elt('div', { class: 'row' }, elt('div', { class: 'span12' }, add_button));
    var container = elt('div', {}, editors_container, add_button_container);

    var id_count = 0;
    var snippets = {};

    var add_snippet = function(snip) {
        var id = id_count++;
        
        var remove_button = elt('button', { class: 'btn' }, elt('i', { class: 'icon-remove' }));
        var snip_ui = snippetEditorBag(snip);
        var snip_row = assembleSnippetRow(snip_ui.ui, remove_button);
        snippets[id] = {
            value: snip_ui.value,
            row: snip_row
        };

        remove_button.click(function() {
            snippets[id].row.remove();
            delete snippets[id];
        });

        editors_container.append(snip_row)
    };

    add_button.click(function() {
        add_snippet(blankSnippet);
    });

    for (var i = 0; i < list.length; i++) {
        add_snippet(list[i]);
    }

    return {
        value: function() {
            var r = [];
            for (var i in snippets) {
                r.push(snippets[i].value());
            }
            return r;
        },
        ui: container
    }
};

var blankSnippet = function() {
    return {
        name: '',
        code: ''
    }
};


var $$ = {};


$$.repl = function() {
    return snippetList([]).ui;
};

return $$;

};
