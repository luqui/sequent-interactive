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

var listToDict = function(nameKey, valueKey, list) {
    var dict = {};
    for (var i = 0; i < list.length; i++) {
        dict[list[i][nameKey]] = list[i][valueKey];
    }
    return dict;
};

var roleSelector = function() {
    var roles = [
        { name: 'export', color: 'primary' },
        { name: 'helper', color: 'info' },
        { name: 'param', color: 'inverse' },
        { name: 'test',   color: 'warning' }
    ];

    var colors = listToDict('name', 'color', roles);

    var container = elt('div');
    var active = 'helper';

    var makeDropdown = function(selected) {
        active = selected;
        var group = elt('div', { class: 'btn-group' });
        group.append(elt('div', { class: 'btn dropdown-toggle btn-' + colors[selected], 'data-toggle': 'dropdown', href: '#' }, text(selected)));
        
        var ul = elt('ul', { class: 'dropdown-menu', role: 'menu' });
        for (var i = 0; i < roles.length; i++) {
            (function() {
                var btn = elt('a', { href: '#' }, text(roles[i].name));
                var item = roles[i].name;
                btn.click(function() {
                    makeDropdown(item);
                });
                ul.append(elt('li', { }, btn));
            })();
        }

        group.append(ul);
        container.empty();
        container.append(group);
    };
    makeDropdown('helper');
    return {
        ui: container,
        value: function() {
            return active;
        }
    };
};

var tryEval = function(code, env) {
    env = env || {};
    
    var evalled = safeTry(function() {
        with (env) {
            return eval('(function() { return (' + code + ') })') 
        }
    });

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
};

var evalRec = function(bindings) {
    return safeTry(function() {
        var evalled = {};
        for (var _i = 0; _i < bindings.length; _i++) {
            with (evalled) {
                evalled[bindings[_i].name] = eval("(function() { return (" + bindings[_i].value + ") })")();
            }
        }
        return evalled;
    });
};

// Snippet = { name : String, code : String }
// SnippetList = List Snippet

// evalEnv :: String -> Error Value
var snippetEditorBag = function(snippet, evalEnv) {
    var editor = elt('div', { class: 'sequent-editor' });
    var outbag = outputBag();
    var name = elt('input', { class: 'sequent-code-input', type: 'text', placeholder: 'Name...', value: snippet.name });
    var role = roleSelector();
    var mirror = CodeMirror(function(cm_elt) {
        editor.append(cm_elt);
    }, {
        value: snippet.code,
        onKeyEvent: function() {
            var code = mirror.getValue();
            if (code.match(/^\s*$/)) {
                outbag.empty();
                return;
            }
            
            var idmatch = /^\s*(\w+)\s*=/.exec(code);
            if (idmatch) {
                code = code.substr(idmatch[0].length);
                mirror.setValue(code);
                name.val(idmatch[1]);
            }

            var result = evalEnv(code);
            if ('value' in result) {
                outbag.update(result.value);
            }
            else {
                outbag.error(result.error);
            }
        }
    });

    return {
        ui: {
            editor: editor,
            name: name,
            status: outbag.ui.status,
            output: outbag.ui.output,
            role: role.ui
        },
        value: function() {
            var code = mirror.getValue();
            return { 
                name: name.val(), 
                code: code,
                role: role.value()
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
                elt('div', { class: 'span8' }, ui.editor),
                elt('div', { class: 'span1' }, ui.role),
                elt('div', { class: 'span1' }, removeButton)),
            elt('div', { class: 'row' },
                elt('div', { class: 'span1 offset1' }, ui.status),
                elt('div', { class: 'span10' }, ui.output))));
};

var snippetList = function(list) {
    var editors_container = elt('div');
    var add_button = elt('button', { class: 'btn btn-block' }, elt('i', { class: 'icon-chevron-down' }));
    var add_button_container = elt('div', { class: 'row' }, elt('div', { class: 'span12' }, add_button));
    var container = elt('div', {}, editors_container, add_button_container);

    var id_count = 0;
    var snippets = {};

    var evalEnv = function(src) {
        var srcs = [];
        for (var i in snippets) {
            var v = snippets[i].value();
            srcs.push({ name: v.name, value: v.code });
        }
        var env = evalRec(srcs);
        if (env.error) {
            return env;
        }
        return tryEval(src, env.value);
    };

    var add_snippet = function(snip) {
        var id = id_count++;
        
        var remove_button = elt('button', { class: 'btn' }, elt('i', { class: 'icon-remove' }));
        var snip_ui = snippetEditorBag(snip, evalEnv);
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
