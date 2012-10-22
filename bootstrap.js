BootstrapModule = function($) {

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

var listToDict = function(nameKey, valueKey, list) {
    var dict = {};
    for (var i = 0; i < list.length; i++) {
        dict[list[i][nameKey]] = list[i][valueKey];
    }
    return dict;
};

var wrap = function(jq, methods) {
    var r = { 
        unwrap: jq,
        remove: function() { jq.remove() }
    };
    for (var i in methods) {
        (function() {
            var method = methods[i];
            r[i] = function() { return method.apply(r, arguments) };
        })();
    }
    return r;
};

var unwrap = function(ui) {
    return ui.unwrap;
}


var $$ = {};

$$.wrapJQuery = function(jq) { return wrap(jq) };

$$.getJQuery = function(ui) { return unwrap(ui) };

$$.expanderButton = function(smallText, bigText, cls) {
    if (cls) { cls = 'btn-' + cls }
    else { cls = '' }

    return wrap(
        elt('div', { class: 'btn-group' },
            elt('div', { class: 'btn dropdown-toggle ' + cls, 'data-toggle': 'dropdown', href: '#' },
                text(smallText)),
            elt('ul', { class: 'dropdown-menu' }, 
                elt('li', {}, text(bigText))
            )));
};

$$.dropDown = function(roles, settings) {
    var active = settings.initial || roles[0].name;
    var colors = listToDict('name', 'color', roles);
    var container = elt('div');
    var change = settings.change || (function() { });

    var makeDropdown = function(selected) {
        if (selected != active) {
            active = selected;
            change(active);
        }
        
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
    makeDropdown(active);
    return wrap(container);
};

$$.empty = function() {
    return wrap($([]));
};

var appendMulti = function(e, multis) {
    for (var i = 0; i < multis.length; i++) {
        e.append(unwrap(multis[i]));
    }
    return e;
};

$$.container = function() {
    var r = elt('div');
    appendMulti(r, arguments);
    return wrap(r, {
        contents: function() {
            appendMulti(unwrap(this).empty(), arguments);
        },
        append: function(newElement) {
            appendMulti(unwrap(this), arguments);
        }
    });
};

$$.codeDisplay = function(contents) {
    return wrap(elt('pre', {}, text(contents)), {
        contents: function(newContents) {
            unwrap(this).empty().append(text(newContents))
        }
    });
};

$$.row = function() {
    var row = elt('div', { class: 'row' });
    for (var i = 0; i < arguments.length; i++) {
        row.append(unwrap(arguments[i]));
    }
    return wrap(row);
};

$$.span = function(width, contents) {
    return wrap(elt('div', { class: 'span' + width }, unwrap(contents)));
};

$$.button = function(contents, settings) {
    var cls = 'btn';
    if (settings.block) {
        cls += ' btn-block';
    }
    if (settings.color) {
        cls += ' btn-' + settings.color;
    }
    
    var button = elt('button', { class: cls }, unwrap(contents));
    if (settings.click) {
        button.click(settings.click);
    }
    return wrap(button);
};

$$.text = function(intext) {
    return wrap(text(intext));
};

$$.icon = function(name) {
    return wrap(elt('i', { class: 'icon-' + name }));
};

$$.input = function(settings) {
    var placeholder = settings.placeholder || '';
    var value = settings.value || '';
    var widthCls = settings.width ? 'span' + settings.width : '';
    return wrap(elt('input', { class: widthCls, type: 'text', placeholder: placeholder, value: value }), {
        val: function(newVal) { 
            if (typeof(newVal) === 'undefined') {
                return unwrap(this).val();
            }
            else {
                unwrap(this).val(newVal)
            }
        }
    });
};

return $$;

};
