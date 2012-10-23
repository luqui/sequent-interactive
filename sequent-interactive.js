SequentInteractiveModule = function($, CodeMirror, UI) {

var roleSelector = function(active) {
    var roles = [
        { name: 'export', color: 'primary' },
        { name: 'helper', color: 'info' },
        { name: 'param', color: 'inverse' },
        { name: 'test',   color: 'warning' }
    ];

    var dropDown = UI.dropDown(roles, {
        initial: active,
        change: function(selected) {
            active = selected;
        }
    });

    return {
        ui: dropDown,
        value: function() { return active }
    };
};

var tryEval = function(code, env) {
    env = env || {};
    
    var evalled = safeTry(function() {
        with (env) {
            return eval('(function() { return (' + code + ') })') 
        }
    });

    // O Haskell, how I miss thee  (safeTry =<< evalled)
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

// Code = { type : 'code', code : String }

// Snippet = { name : String, code : Code, role : Role }
// SnippetList = List Snippet

// evalEnv :: String -> Error Value
var snippetEditorBag = function(snippet, evalEnv) {
    var name = UI.input({
        placeholder: 'Name...',
        value: snippet.name,
        width: 2  // TODO Should be handled by UI
    });

    var role = roleSelector(snippet.role);
    var editor = codeEditorBag(snippet.code, evalEnv);

    return {
        ui: {
            editor: editor.ui.editor,
            name: name,
            status: editor.ui.status,
            output: editor.ui.output,
            role: role.ui
        },
        value: function() {
            return { 
                name: name.val(), 
                code: editor.value(),
                role: role.value()
            }
        },
        focus: function() {
            editor.focus();
        }
    }
};

var codeEditorBag = function(code, evalEnv) {
    var editor = UI.container();
    var outbag = outputBag();
    var mirror = CodeMirror(function(cm_elt) {
        editor.append(UI.wrapJQuery(cm_elt));
    }, {
        value: code.code,
        onKeyEvent: function() {
            var code = mirror.getValue();
            if (code.match(/^\s*$/)) {
                outbag.empty();
                return;
            }
            
            /*
            var idmatch = /^\s*(\w+)\s*=/.exec(code);
            if (idmatch) {
                code = code.substr(idmatch[0].length);
                mirror.setValue(code);
                name.val(idmatch[1]);
            }
            */

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
            status: outbag.ui.status,
            output: outbag.ui.output
        },
        value: function() {
            return {
                type: 'code',
                code: mirror.getValue()
            }
        },
        focus: function() {
            mirror.focus();
            mirror.refresh();
        }
    }
};

var outputBag = function() {
    var code = UI.codeDisplay(' ');
    var output = UI.container(code);
    var status = UI.container();
    return {
        ui: {
            output: output,
            status: status
        },
        update: function(content) {
            status.contents(UI.empty());
            code.contents(content);
        },
        error: function(errorText) {
            status.contents(UI.expanderButton('Error', errorText, 'danger'));
        },
        empty: function() {
            status.contents(UI.empty());
        }
    };
};


var assembleSnippetRow = function(ui, removeButton) {
    return UI.container(
        UI.row(
            UI.span(2, ui.name),
            UI.span(8, ui.editor),
            UI.span(1, ui.role),
            UI.span(1, removeButton)),
        UI.row(
            UI.span(1, UI.empty()),
            UI.span(1, ui.status),
            UI.span(10, ui.output)));
};

var snippetList = function(list) {
    var editors_container = UI.container();
    var add_button = UI.button(UI.icon('plus'), {
        block: true,
        click: function() { add_snippet(blankSnippet()) }
    });
    var add_button_container = UI.row(UI.span(12, add_button));
    var container = UI.container(editors_container, add_button_container);

    var id_count = 0;
    var snippets = {};

    var evalEnv = function(src) {
        var srcs = [];
        for (var i in snippets) {
            var v = snippets[i].value();
            srcs.push({ name: v.name, value: v.code.code });
        }
        var env = evalRec(srcs);
        if (env.error) {
            return env;
        }
        return tryEval(src, env.value);
    };

    var add_snippet = function(snip) {
        var id = id_count++;
        
        var remove_button = UI.button(UI.icon('remove'), {
            click: function() {
                snippets[id].row.remove();
                delete snippets[id];
            }
        });
        var snip_ui = snippetEditorBag(snip, evalEnv);
        var snip_row = assembleSnippetRow(snip_ui.ui, remove_button);
        snippets[id] = {
            value: snip_ui.value,
            row: snip_row
        };

        editors_container.append(snip_row);
        snip_ui.focus();
    };

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
        role: 'helper',
        name: '',
        code: { type: 'code', code: '' }
    }
};

var scopeEditor = function(initlist) {
    initlist = initlist || [];
    var collapseAction = function() {
        var snips = list.value();
        var code = "";
        var exports = "";
        for (var i in snips) {
            if (snips[i].name) {
                code += "  var " + snips[i].name + " = " + snips[i].code.code + ";\n";
                if (snips[i].role === 'export') {
                    exports += snips[i].name + ": " + snips[i].name + ", ";
                }
            }
        }
        var module = {
            role: 'helper',
            name: '',
            code: { type: 'code', code: "function() {\n" + code + "\n  return { " + exports + " };\n}" }
        };
        container.contents(scopeEditor([module]).ui);
    };

    var topbar = 
        UI.row(
            UI.span(3, 
                UI.button(UI.text('Collapse'), {
                    color: 'info',
                    click: collapseAction
                })),
            UI.span(9, UI.empty()));
    var list = snippetList(initlist);

    var container = UI.container(topbar, list.ui);
    var superContainer = UI.container(container);

    return {
        ui: container,
        value: function() { return undefined }
    }
};


var $$ = {};

$$.repl = function() {
    return scopeEditor().ui;
};

return $$;

};
