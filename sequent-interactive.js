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
    var editor = editorBag(snippet.code, evalEnv);

    return {
        ui: {
            editor: editor.ui,
            name: name,
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

var editorBag = function(code, evalEnv) {
    if (code.type == 'code') {
        return codeEditorBag(code, evalEnv);
    }
    else if (code.type == 'module') {
        return moduleEditorBag(code, evalEnv);
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
            type: 'code',
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

var moduleEditorBag = function(module) {
    var container = UI.container();
    var buttonContainer = UI.container();

    var current = { value: function() { return module } };

    var collapsed = function() {
        current = collapsedModuleEditor(current.value());
        container.contents(current.ui);
        buttonContainer.contents(UI.button(UI.text("Open"), {
            click: function() { expanded() }
        }));
    };

    var expanded = function() {
        current = openModuleEditor(current.value());
        container.contents(current.ui);
        buttonContainer.contents(UI.button(UI.text("Close"), {
            click: function() { collapsed() }
        }));
    };

    collapsed(module);
    
    return {
        ui: {
            type: 'module',
            editor: container,
            toggle: buttonContainer
        },
        value: function() {
            return current.value();
        },
        focus: function() { }
    }
};

var openModuleEditor = function(module) {
    var list = snippetList(module.snippets);
    return {
        ui: list.ui,
        value: function() {
            return { type: 'module', snippets: list.value() }
        }
    }
};

var collapsedModuleEditor = function(module) {
    var exports = [];
    var snippets = module.snippets;
    for (var i = 0; i < snippets.length; i++) {
        if (snippets[i].role == 'export' && snippets[i].name) {
            exports.push(snippets[i].name);
        }
    }

    return {
        ui: UI.text("module(" + exports.join(", ") + ")"),
        value: function() { return module }
    }
};

var assembleRow = function(ui, removeButton) {
    if (ui.editor.type == 'code') {
        return assembleSnippetRow(ui, removeButton);
    }
    else if (ui.editor.type == 'module') {
        return assembleModuleRow(ui, removeButton);
    }
}

var assembleSnippetRow = function(ui, removeButton) {
    return UI.container(
        UI.row(
            UI.span(2, ui.name),
            UI.span(8, ui.editor.editor),
            UI.span(1, ui.role),
            UI.span(1, removeButton)),
        UI.row(
            UI.span(1, UI.empty()),
            UI.span(1, ui.editor.status),
            UI.span(10, ui.editor.output)));
};

var assembleModuleRow = function(ui, removeButton) {
    return UI.container(
        UI.row(
            UI.span(2, ui.name),
            UI.span(7, UI.empty()),
            UI.span(1, ui.editor.toggle),
            UI.span(1, ui.role),
            UI.span(1, removeButton)),
        UI.fluidRow(
            UI.span(2, UI.empty()),
            UI.span(10, ui.editor.editor)));
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
        var snip_row = assembleRow(snip_ui.ui, remove_button);
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


var exampleProject = [
    { role: 'helper', name: 'foo', code: { type: 'code', code: '12345' } },
    { role: 'helper', name: 'bar', code: { type: 'module', snippets: [
        { role: 'helper', name: 'foo', code: { type: 'code', code: '12340' } },
        { role: 'export', name: 'bar', code: { type: 'code', code: 'foo + 5' } } ] } },
    { role: 'export', name: 'test', code: { type: 'code', code: 'foo == bar.bar' } }
];
    


var $$ = {};

$$.repl = function() {
    return snippetList(exampleProject).ui;
};

return $$;

};
