require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var CodeMirror = require("codemirror");

var indentAfterPaste = function indentAfterPaste(cm, change) {
  if (change.origin != "paste") {
    return;
  }
  if (CodeMirror.cmpPos(change.from, change.to)) {
    return;
  }
  // check if the insertion point is at the end of the line
  var dest = cm.getLine(change.from.line);
  if (dest.length != change.from.ch) {
    return;
  }
  // check if the line consists of only white spaces
  if (dest.match(/[^ \t]/)) {
    return;
  }
  // remove the last empty line
  if (change.text[change.text.length - 1] == "") {
    change.text.pop();
  }
  var base_indent = change.text[0].match(/^[ \t]*/)[0];
  change.text = change.text.map(function (line, i) {
    line = line.match(/^([ \t]*)(.*)/);
    var indent = line[1];
    var text = line[2];
    indent = (dest + indent).substr(0, dest.length + indent.length - base_indent.length);
    return indent + text;
  });
  change.text[0] = change.text[0].substr(dest.length);
};

module.exports = indentAfterPaste;

},{"codemirror":"codemirror"}],2:[function(require,module,exports){
"use strict";

var CodeMirror = require("codemirror");
var _ = require("underscore");
require("codemirror-addon");
require("./mark");
require("./select-line");
require("./select-word");
require("./split-into-lines");
require("./text-mode");

Object.assign(CodeMirror.defaults, {
  lineNumbers: true,
  tabSize: 4,
  showCursorWhenSelecting: true,
  autoCloseBrackets: true,
  matchBrackets: true,
  matchTags: true,
  autoCloseTags: true,
  styleActiveLine: { nonEmpty: true },
  styleSelectedText: true,
  dragDrop: false,
  extraKeys: {
    "Ctrl-Space": "autocomplete",
    "Ctrl-U": "autocomplete",
    "Ctrl-/": "toggleComment",
    "Cmd-/": "toggleComment",
    "Tab": "indentAuto",
    "Ctrl-D": false,
    "Cmd-D": false
  }
});

CodeMirror.defineInitHook(function (cm) {
  // maintain indentation on paste
  cm.on("beforeChange", require("./indent-after-paste"));

  // key bindings
  var input = cm.getInputField();
  input.className += " mousetrap"; // enable hotkey
  var keymap = {
    "alt+b": "goWordLeft",
    "alt+f": "goWordRight",
    "alt+h": "delWordBefore",
    "alt+d": "delWordAfter",
    "mod+m": "mark",
    "mod+d": "selectWord",
    "mod+l": "selectLine",
    "mod+shift+l": "splitIntoLines"
  };
  _.each(keymap, function (command, key) {
    Mousetrap(input).bind(key, function () {
      cm.execCommand(command);
      return false;
    });
  });
});

module.exports = CodeMirror;

},{"./indent-after-paste":1,"./mark":3,"./select-line":4,"./select-word":5,"./split-into-lines":6,"./text-mode":7,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","underscore":"underscore"}],3:[function(require,module,exports){
"use strict";

var CodeMirror = require("codemirror");

CodeMirror.defineInitHook(function (cm) {
  cm.marks = [];
});

<<<<<<< HEAD
CodeMirror.commands.mark = function(cm) {
  var cursor = cm.getCursor()
  if (cm.marks.length) {
    var last = cm.marks[cm.marks.length - 1]
=======
CodeMirror.commands.mark = function (cm) {
  var cursor = cm.getCursor();
  if (marks.length) {
    var last = cm.marks[cm.marks.length - 1];
>>>>>>> Use React for file tabs
    if (last.line == cursor.line && last.ch == cursor.ch) {
      cm.setSelections(cm.marks.map(function (m) {
        return { head: m, anchor: m };
      }), cm.marks.length - 1);
      cm.marks = [];
      return;
    }
  }
  cm.marks.push(cursor);
};

},{"codemirror":"codemirror"}],4:[function(require,module,exports){
"use strict";

var CodeMirror = require("codemirror");

CodeMirror.commands.selectLine = function (cm) {
  cm.setSelections(cm.listSelections().map(function (i) {
    return {
      anchor: {
        line: i.head.line + 1,
        ch: 0
      },
      head: {
        line: i.anchor.line,
        ch: 0
      }
    };
  }));
};

},{"codemirror":"codemirror"}],5:[function(require,module,exports){
"use strict";

var CodeMirror = require("codemirror");

CodeMirror.commands.selectWord = function (cm) {
  cm.setSelections(cm.listSelections().map(function (i) {
    return cm.findWordAt(i.anchor);
  }));
};

},{"codemirror":"codemirror"}],6:[function(require,module,exports){
"use strict";

var CodeMirror = require("codemirror");

CodeMirror.commands.splitIntoLines = function (cm) {
  var selections = cm.listSelections();
  if (selections.length != 1) {
    // Do nothing
    return;
  }
  var anchor = selections[0].anchor;
  var head = selections[0].head;
  var new_selections = [];
  for (var i = anchor.line; i <= head.line; ++i) {
    new_selections.push({
      anchor: {
        line: i,
        ch: i == anchor.line ? anchor.ch : 0
      },
      head: {
        line: i,
        ch: i == head.line ? head.ch : Infinity
      }
    });
  }
  cm.setSelections(new_selections);
};

},{"codemirror":"codemirror"}],7:[function(require,module,exports){
"use strict";

var CodeMirror = require("codemirror");

CodeMirror.defineSimpleMode("text", {
  start: [],
  comment: [],
  meta: {}
});

},{"codemirror":"codemirror"}],8:[function(require,module,exports){
'use strict';

var $ = require("jquery");

var open = function open(content) {
  var close = function close() {
    backdrop.remove();
  };
  return close;
};

var view = function view(content, class_name) {
  var backdrop = $('<div class="backdrop">').appendTo(document.body);
  var dialog = $('<div class="dialog">').appendTo(backdrop);
  dialog.addClass(class_name);
  dialog.append(content);
  return backdrop;
};

module.exports.view = view;

},{"jquery":"jquery"}],9:[function(require,module,exports){
"use strict";

var React = require("react");
var ReactDOM = require("react-dom");
var $ = require("jquery");
var _ = require("underscore");
var EditorView = require("./editor-view");
var FileTabList = require("./file-tab-list.jsx");

var EditorManagerView = function EditorManagerView($root, editor_mgr) {
  var $tabs = $("<div>").attr("id", "files").appendTo($root);
  var $editors = $("<div>").attr("id", "editors").appendTo($root);

  var render = function render() {
    ReactDOM.render(React.createElement(FileTabList, {
      editorMgr: editor_mgr
    }), $tabs[0]);
  };

  editor_mgr.opened.add(function (editor) {
    var path = editor.getPath();
    render();
    editor.status.observe(function () {
      render();
    });
    // editor view
    var $editor = $("<div>").addClass("editor").appendTo($editors);
    var editor_view = EditorView($editor, editor, editor_mgr);

    editors[path] = {
      $editor: $editor
    };
  });

  editor_mgr.closed.add(function (path) {
    render();
    editors[path].$editor.remove();
    delete editors[path];
  });

  editor_mgr.activated.add(render);
};

module.exports = EditorManagerView;

},{"./editor-view":11,"./file-tab-list.jsx":14,"jquery":"jquery","react":"react","react-dom":"react-dom","underscore":"underscore"}],10:[function(require,module,exports){
"use strict";

var signals = require("signals");
var _ = require("underscore");
var File = require("./file");
var Editor = require("./editor");

var EditorManager = function EditorManager(finder) {
  var model = {
    opened: new signals.Signal(),
    closed: new signals.Signal(),
    activated: new signals.Signal(),

    active: null, // path of active file
    editors: [],

    getFiles: function getFiles() {
      return model.editors.map(function (editor) {
        return editor.getPath();
      });
    },

    open: function open(path) {
      if (path === null) {
        throw "The path is null";
      }
      // try to activate already opened files
      if (model.activate(path)) {
        return;
      }
      var editor = Editor(File(path));
      editor.load().then(function () {
        model.editors.push(editor);
        model.opened.dispatch(editor);
        model.activate(path);
      });
    },

    getActive: function getActive() {
      return model.active;
    },

    activate: function activate(path) {
      if (path === model.active) {
        return true;
      }
      if (path !== null && model.indexOf(path) == -1) {
        return false;
      }
      model.active = path;
      model.activated.dispatch(path);
      finder.setPath(path);
      return true;
    },

    nextFile: function nextFile() {
      model.rotateFile(true);
    },

    prevFile: function prevFile() {
      model.rotateFile(false);
    },

    rotateFile: function rotateFile(next) {
      if (model.editors.length == 0) {
        return;
      }
      var idx;
      if (model.active === null) {
        idx = next ? 0 : model.editors.length - 1;
      } else {
        idx = model.indexOf(model.active);
        idx += next ? +1 : -1;
        idx = (idx + model.editors.length) % model.editors.length;
      }
      model.activate(model.editors[idx].getPath());
    },

    close: function close(path) {
      var idx = model.indexOf(path);
      if (idx == -1) {
        return;
      }
      if (path === model.active) {
        if (model.editors.length == 1) {
          model.activate(null);
        } else {
          model.prevFile();
        }
      }
      model.editors.splice(idx, 1);
      model.closed.dispatch(path);
    },

    reload: function reload(path) {
      model.close(path);
      model.open(path);
    },

    indexOf: function indexOf(path) {
      return model.getFiles().indexOf(path);
    }
  };

  finder.selected.add(model.open);

  return model;
};

module.exports = EditorManager;

},{"./editor":12,"./file":16,"signals":"signals","underscore":"underscore"}],11:[function(require,module,exports){
"use strict";

var $ = require("jquery");
var CodeMirror = require("./codemirror");
var SelectEncodingDialogView = require("./select-encoding-dialog-view");

var EditorView = function EditorView($root, editor, editor_mgr) {
  var file = editor.getFile();

  var cm = CodeMirror($root[0], {
    value: editor.text.get(),
    mode: editor.mode.get()
  });

  // footer
  $root.append($('<div class="editor-foot">').append($('<div class="editor-message">'), $('<button class="editor-indent link" type="button">'), $('<button class="editor-eol link" type="button">'), $('<button class="editor-encoding link" type="button">'), $('<div class="editor-mode">')));

  SelectEncodingDialogView(editor.select_encoding_dialog);

  // save
  var last_generation = cm.changeGeneration(true);
  var save = function save() {
    var generation = cm.changeGeneration(true);
    editor.save().then(function () {
      last_generation = generation;
    });
  };
  cm.on("changes", function () {
    editor.text.set(cm.getValue());
    editor.status.set(cm.isClean(last_generation) ? "clean" : "modified");
  });
  editor.text.observe(function (text) {
    if (text != cm.getValue()) {
      cm.setValue(text);
    }
  });

  // mode
  var updateMode = function updateMode(mode) {
    cm.setOption("mode", mode);
    CodeMirror.registerHelper("hintWords", mode, null);
    $root.find(".editor-mode").text(mode);
  };
  editor.mode.observe(updateMode);
  updateMode(editor.mode.get());

  // indent
  var updateIndent = function updateIndent(type) {
    $root.find(".editor-indent").text(type);
    if (type == "TAB") {
      cm.setOption("indentWithTabs", true);
      cm.setOption("indentUnit", 4);
    } else {
      cm.setOption("indentWithTabs", false);
      cm.setOption("indentUnit", Number(type.replace("SP", "")));
    }
  };
  editor.indent.observe(updateIndent);
  updateIndent(editor.indent.get());
  $root.find(".editor-indent").click(function () {
    editor.indent.rotate();
  });

  // line seprator
  var updateEol = function updateEol(eol) {
    var names = {
      "\r": "CR",
      "\n": "LF",
      "\r\n": "CRLF"
    };
    $root.find(".editor-eol").text(names[eol]);
  };
  file.eol.observe(updateEol);
  updateEol(file.eol.get());
  $root.find(".editor-eol").click(function () {
    file.eol.rotate();
  });

  // encoding
  var updateEncoding = function updateEncoding(encoding) {
    $root.find(".editor-encoding").text(encoding);
  };
  file.encoding.add(updateEncoding);
  updateEncoding(file.encoding.get());
  $root.find(".editor-encoding").click(function () {
    editor.select_encoding_dialog.show(file.encoding.get());
  });
  editor.select_encoding_dialog.confirmed.add(function (encoding) {
    file.encoding.set(encoding);
  });

  // message
  editor.message.observe(function (message) {
    $root.find(".editor-message").text(message);
  });

  // active
  editor_mgr.activated.add(function (active) {
    if (active == file.getPath()) {
      $root.addClass("active");
      cm.focus();
      cm.refresh();
    } else {
      $root.removeClass("active");
    }
  });

  // save with command-s
  Mousetrap($root[0]).bind("mod+s", function () {
    save();
    return false;
  });
};

module.exports = EditorView;

},{"./codemirror":2,"./select-encoding-dialog-view":28,"jquery":"jquery"}],12:[function(require,module,exports){
"use strict";

var $ = require("jquery");
var _ = require("underscore");
var Observable = require("./observable");
var CodeMirror = require("./codemirror");
var Indent = require("./indent");
var SelectEncodingDialog = require("./select-encoding-dialog");

var Editor = function Editor(file) {
  var editor = {
    text: Observable(""),
    status: Observable("clean"),
    mode: Observable("text"),
    indent: Indent(),
    message: Observable(""),
    select_encoding_dialog: SelectEncodingDialog(),

    getFile: function getFile() {
      return file;
    },

    getPath: function getPath() {
      return file.getPath();
    },

    load: function load(text) {
      return file.read().then(function (text) {
        editor.indent.set(Indent.detectIndentType(text));
        editor.text.set(text);
        editor.message.set("Loaded.");
      });
    },

    save: function save() {
      return file.write(editor.text.get()).catch(function (error) {
        editor.message.set("Save failed. " + reply.error);
        editor.status.set("error");
      }).then(function () {
        editor.status.set("clean");
        editor.message.set("Saved.");
      });
    }
  };

  var detectMode = function detectMode(path) {
    var extension = path.replace(/.*[.](.+)$/, "$1");
    var mode = {
      html: "php",
      tag: "php"
    }[extension];
    if (mode) {
      return mode;
    }
    mode = CodeMirror.findModeByExtension(extension);
    if (mode) {
      return mode.mode;
    }
    return "text";
  };
  editor.mode.set(detectMode(file.getPath()));

  // auto save
  editor.text.observe(_.debounce(function () {
    if (editor.status.get() != "clean") {
      editor.save();
    }
  }, 4000));

  return editor;
};

module.exports = Editor;

},{"./codemirror":2,"./indent":23,"./observable":25,"./select-encoding-dialog":29,"jquery":"jquery","underscore":"underscore"}],13:[function(require,module,exports){
"use strict";

var Rotate = require("./rotate");

var Eol = function Eol(eol) {
  return Rotate(["\n", "\r\n", "\r"], eol);
};

Eol.detect = function (text) {
  if (text.match("\r\n")) {
    return "\r\n";
  }
  if (text.match("\r")) {
    return "\r";
  }
  return "\n";
};

Eol.regulate = function (text) {
  return text.replace(/(\r\n|\r)/, "\n");
}, module.exports = Eol;

},{"./rotate":27}],14:[function(require,module,exports){
"use strict";

var React = require("react");
var FileTab = require("./file-tab.jsx");

var FileTabList = function FileTabList(props) {
  var mgr = props.editorMgr;
  var onClick = function onClick(path) {
    mgr.activate(path);
  };
  var items = mgr.editors.map(function (editor) {
    return React.createElement(FileTab, {
      key: editor.getPath(),
      editor: editor,
      active: mgr.active == editor.getPath(),
      onClick: onClick
    });
  });
  return React.createElement(
    "div",
    { id: "files" },
    items
  );
};

module.exports = FileTabList;

},{"./file-tab.jsx":15,"react":"react"}],15:[function(require,module,exports){
"use strict";

var React = require("react");

var FileTab = function FileTab(props) {
  var path = props.editor.getPath();
  var dir = path.replace(new RegExp("[^/]+$"), "");
  var name = path.replace(new RegExp(".*/"), "");
  var onClick = function onClick(e) {
    e.preventDefault();
    props.onClick(path);
  };
  return React.createElement(
    "div",
    {
      className: "file-item " + (props.active ? "active" : ""),
      onClick: onClick },
    React.createElement(
      "div",
      { className: "dir" },
      dir
    ),
    React.createElement(
      "div",
      { className: "name" },
      name
    ),
    React.createElement("div", { className: "status " + props.editor.status.get() })
  );
};

module.exports = FileTab;

},{"react":"react"}],16:[function(require,module,exports){
"use strict";

var $ = require("jquery");
var Observable = require("./observable");
var Eol = require("./eol");

var File = function File(path) {
  var file = {
    eol: Eol(),
    encoding: Observable(),

    getPath: function getPath() {
      return path;
    },

    read: function read() {
      return new Promise(function (resolve, reject) {
        $.ajax({
          method: "post",
          url: "/read.php",
          timeout: 3000,
          data: {
            path: path
          },
          dataType: "json"
        }).fail(reject).done(function (reply) {
          file.encoding.set(reply.encoding);
          file.eol.set(Eol.detect(reply.content));
          var content = Eol.regulate(reply.content);
          resolve(content);
        });
      });
    },

    write: function write(text) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: "/write.php",
          method: "post",
          timeout: 2000,
          data: {
            path: path,
            encoding: file.encoding.get(),
            content: text.replace(/\n/g, file.eol.get())
          },
          dataType: "json"
        }).done(function (reply) {
          if (reply == "ok") {
            resolve();
          } else {
            reject(reply.error);
          }
        }).fail(function () {
          reject("");
        });
      });
    }
  };
  return file;
};

module.exports = File;

},{"./eol":13,"./observable":25,"jquery":"jquery"}],17:[function(require,module,exports){
"use strict";

var React = require("react");

var name_rx = new RegExp("/([^/]*/?)$");

var FinderSuggestItem = function FinderSuggestItem(props) {
  var name = name_rx.exec(props.path)[1];
  var onClick = function onClick(e) {
    e.preventDefault();
    props.onSelect(props.path);
  };
  var onMouseDown = function onMouseDown(e) {
    // prevent from getting focused
    e.preventDefault();
  };
  return React.createElement(
    "a",
    {
      className: props.active ? "selected" : "",
      onClick: onClick,
      onMouseDown: onMouseDown },
    name
  );
};

module.exports = FinderSuggestItem;

},{"react":"react"}],18:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var $ = require("jquery");
var Signal = require("signals").Signal;

var FinderSuggest = function FinderSuggest(finder) {
  var model = {
    items: [],
    cursor: null, // highlighted item

    items_changed: new Signal(),
    cursor_moved: new Signal(),
    selected: new Signal(),

    update: function update(path) {
      $.ajax({
        method: "post",
        url: "/finder.php",
        timeout: 3000,
        data: {
          path: path
        },
        dataType: "json"
      }).fail(function () {
        console.log("failed to fetch suggest for the path: " + path);
      }).done(function (reply) {
        model.setItems(reply.items.map(function (i) {
          return reply.base + i;
        }));
      });
    },

    setItems: function setItems(items) {
      model.setCursor(null);
      model.items = items;
      model.items_changed.dispatch(model.items);
    },

    getItems: function getItems() {
      return model.items;
    },

    getCursor: function getCursor() {
      return model.cursor;
    },

    setCursor: function setCursor(path) {
      if (path === model.cursor) {
        return;
      }
      model.cursor = path;
      model.cursor_moved.dispatch(model.cursor);
    },

    moveCursor: function moveCursor(next) {
      if (model.cursor === null) {
        if (model.items.length != 0) {
          model.setCursor(model.items[0]);
        }
        return;
      }
      var idx = model.items.indexOf(model.cursor);
      idx += next ? +1 : -1;
      idx = Math.max(0, Math.min(model.items.length - 1, idx));
      model.setCursor(model.items[idx]);
    },

    select: function select(path) {
      model.setCursor(path);
      model.selected.dispatch(path);
    }
  };

  finder.visibility_changed.add(function (visible) {
    if (visible) {
      model.update(finder.getPath());
    }
  });

  finder.path_changed.add(_.debounce(model.update, 250));

  return model;
};

module.exports = FinderSuggest;

},{"jquery":"jquery","signals":"signals","underscore":"underscore"}],19:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = require("react");
var $ = require("jquery");
var FinderSuggestItem = require("./finder-suggest-item.jsx");

var FinderSuggest = function (_React$Component) {
  _inherits(FinderSuggest, _React$Component);

  function FinderSuggest(props) {
    _classCallCheck(this, FinderSuggest);

    var _this = _possibleConstructorReturn(this, (FinderSuggest.__proto__ || Object.getPrototypeOf(FinderSuggest)).call(this, props));

    _this.handleChange = _this.handleChange.bind(_this);
    return _this;
  }

  _createClass(FinderSuggest, [{
    key: "handleChange",
    value: function handleChange() {
      this.forceUpdate();
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      this.props.suggest.items_changed.add(this.handleChange);
      this.props.suggest.cursor_moved.add(this.handleChange);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      this.props.suggest.items_changed.remove(this.handleChange);
      this.props.suggest.cursor_moved.remove(this.handleChange);
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      if (this.props.suggest.cursor) {
        this.scrollIntoView(this.$list, this.$list.find(".selected"));
      }
    }
  }, {
    key: "scrollIntoView",
    value: function scrollIntoView($parent, $target) {
      var height = $target.height();
      var top = $target.prevAll().length * height;
      var bottom = top + height;
      var view_height = $parent.innerHeight();
      if (top - $parent.scrollTop() < 0) {
        $parent.scrollTop(top);
      }
      if (bottom - $parent.scrollTop() > view_height) {
        $parent.scrollTop(bottom - view_height);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var suggest = this.props.suggest;
      var self = this;
      return React.createElement(
        "div",
        {
          id: "finder-items",
          ref: function ref(list) {
            return self.$list = $(list);
          },
          className: suggest.items.length ? "active" : "" },
        suggest.items.map(function (path) {
          return React.createElement(FinderSuggestItem, {
            key: path,
            path: path,
            active: suggest.cursor === path,
            onSelect: suggest.select });
        })
      );
    }
  }]);

  return FinderSuggest;
}(React.Component);

module.exports = FinderSuggest;

},{"./finder-suggest-item.jsx":17,"jquery":"jquery","react":"react"}],20:[function(require,module,exports){
"use strict";

var React = require("react");
var ReactDOM = require("react-dom");
var Finder = require("./finder.jsx");

var FinderView = function FinderView($root, finder) {
  var render = function render() {
    ReactDOM.render(React.createElement(Finder, { finder: finder }), $root[0]);
  };
  render();
};

module.exports = FinderView;

},{"./finder.jsx":22,"react":"react","react-dom":"react-dom"}],21:[function(require,module,exports){
"use strict";

var Signal = require("signals").Signal;
var FinderSuggest = require("./finder-suggest");

var Finder = function Finder() {
  var model = {
    selected: new Signal(),
    path_changed: new Signal(),
    visibility_changed: new Signal(),

    path: "/",
    visible: false,

    select: function select(path) {
      model.setPath(path);
      if (path.substr(-1) == "/") {
        return;
      }
      model.hide();
      model.selected.dispatch(path);
    },

    show: function show() {
      model.visible = true;
      model.visibility_changed.dispatch(model.visible);
    },

    hide: function hide() {
      model.visible = false;
      model.visibility_changed.dispatch(model.visible);
      //       editor_manager.activate(editor_manager.getActive())
    },

    getPath: function getPath() {
      return model.path;
    },

    setPath: function setPath(path) {
      model.path = path;
      model.path_changed.dispatch(path);
    },

    goToParentDirectory: function goToParentDirectory() {
      model.setPath(model.path.replace(new RegExp("[^/]*/?$"), ""));
    },

    enter: function enter() {
      var path = suggest.getCursor();
      model.select(path ? path : model.path);
    },

    tab: function tab() {
      var cursor = suggest.getCursor();
      if (cursor) {
        model.setPath(cursor);
        return;
      }
      var items = suggest.getItems();
      if (items.length == 1) {
        model.setPath(items[0]);
        return;
      }
      suggest.update(model.path);
    }
  };

  var suggest = model.suggest = FinderSuggest(model);
  suggest.selected.add(function (path) {
    model.select(path);
  });

  return model;
};

module.exports = Finder;

},{"./finder-suggest":18,"signals":"signals"}],22:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = require("react");
var Mousetrap = require("mousetrap");
var False = require("./return-false");
var FinderSuggest = require("./finder-suggest.jsx");

var Finder = function (_React$Component) {
  _inherits(Finder, _React$Component);

  function Finder(props) {
    _classCallCheck(this, Finder);

    var _this = _possibleConstructorReturn(this, (Finder.__proto__ || Object.getPrototypeOf(Finder)).call(this, props));

    _this.handleChange = _this.handleChange.bind(_this);
    return _this;
  }

  _createClass(Finder, [{
    key: "handleChange",
    value: function handleChange() {
      this.forceUpdate();
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      var finder = this.props.finder;
      var input = this.input;
      finder.visibility_changed.add(this.handleChange);
      finder.path_changed.add(this.handleChange);
      finder.visibility_changed.add(function (visibility) {
        if (input) {
          input.focus();
        }
      });

      Mousetrap(input).bind("enter", False(finder.enter));
      Mousetrap(input).bind("tab", False(finder.tab));
      Mousetrap(input).bind("esc", False(finder.hide));
      Mousetrap(input).bind("down", False(function () {
        finder.suggest.moveCursor(true);
      }));
      Mousetrap(input).bind("up", False(function () {
        finder.suggest.moveCursor(false);
      }));
      Mousetrap(input).bind("mod+u", False(finder.goToParentDirectory));
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      this.props.finder.visibility_changed.remove(this.handleChange);
      this.props.finder.path_changed.remove(this.handleChange);
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var finder = this.props.finder;

      var onChange = function onChange(e) {
        finder.setPath(e.target.value);
      };

      return React.createElement(
        "form",
        { id: "finder", className: finder.visible ? "active" : "" },
        React.createElement("input", {
          ref: function ref(input) {
            return self.input = input;
          },
          type: "text",
          id: "finder-path",
          className: "mousetrap",
          autoComplete: "off",
          value: finder.path,
          onChange: onChange,
          onBlur: finder.hide }),
        React.createElement(FinderSuggest, {
          suggest: finder.suggest })
      );
    }
  }]);

  return Finder;
}(React.Component);

module.exports = Finder;

},{"./finder-suggest.jsx":19,"./return-false":26,"mousetrap":"mousetrap","react":"react"}],23:[function(require,module,exports){
"use strict";

var Rotate = require("./rotate");

var Indent = function Indent(type) {
  return Rotate(["4SP", "2SP", "TAB"], type);
};

Indent.detectIndentType = function (content) {
  if (content.match(/[\r\n]+\t/)) {
    return "TAB";
  }
  var lines = content.split(/[\r\n]+/);
  for (var i = 0; i < lines.length; ++i) {
    var indent = lines[i].replace(/^( *).*/, "$1");
    if (indent.length == 2) {
      return "2SP";
    }
  }
  return "4SP";
};

module.exports = Indent;

},{"./rotate":27}],24:[function(require,module,exports){
"use strict";

var $ = require("jquery");
var EditorManagerView = require("./editor-manager-view");
var FinderView = require("./finder-view");

var MainView = function MainView(editor_mgr, finder) {
  var $main = $("main");
  EditorManagerView($('<div id="editor_manager">').appendTo($main), editor_mgr);
  FinderView($('<div>').appendTo($main), finder);

  // shortcut keys
  Mousetrap.bind(["mod+;", "mod+="], function () {
    editor_mgr.nextFile();
    return false;
  }, "keydown");
  Mousetrap.bind(["mod+shift+;", "mod+shift+="], function () {
    editor_mgr.prevFile();
    return false;
  }, "keydown");
  Mousetrap.bind(["mod+w", "mod+k"], function () {
    editor_mgr.close(editor_mgr.getActive());
    return false;
  }, "keydown");
  Mousetrap.bind(["mod+r"], function () {
    editor_mgr.reload(editor_mgr.getActive());
    return false;
  }, "keydown");
};

module.exports = MainView;

},{"./editor-manager-view":9,"./finder-view":20,"jquery":"jquery"}],25:[function(require,module,exports){
"use strict";

var Signal = require("signals").Signal;

var Observable = function Observable(value) {
  var observable = new Signal();
  Object.assign(observable, {
    get: function get() {
      return value;
    },
    set: function set(new_value) {
      if (value === new_value) {
        return;
      }
      var old_value = value;
      value = new_value;
      observable.dispatch(value, old_value, observable);
    },
    observe: observable.add // alias
  });
  return observable;
};

module.exports = Observable;

},{"signals":"signals"}],26:[function(require,module,exports){
"use strict";

var returnFalse = function returnFalse(func) {
  return function () {
    func.apply(this, arguments);
    return false;
  };
};

module.exports = returnFalse;

},{}],27:[function(require,module,exports){
"use strict";

var Observable = require("./observable");

var Rotate = function Rotate(values, value) {
  var isValidValue = function isValidValue(v) {
    return v === null || v === undefined || values.indexOf(v) != -1;
  };

  var checkValue = function checkValue(v) {
    if (!isValidValue(v)) {
      throw "invalid value: " + v;
    }
  };
  checkValue(value);

  var rotate = Observable(value);

  rotate.getValues = function () {
    return values;
  };

  var _set = rotate.set;
  rotate.set = function (new_value) {
    checkValue(new_value);
    _set(new_value);
  };

  rotate.rotate = function () {
    var idx = values.indexOf(rotate.get());
    idx = (idx + 1) % values.length;
    rotate.set(values[idx]);
  };

  return rotate;
};

module.exports = Rotate;

},{"./observable":25}],28:[function(require,module,exports){
"use strict";

var $ = require("jquery");
var Dialog = require("./dialog");

var SelectEncodingDialogView = function SelectEncodingDialogView(model) {
  var $content = $('<div>').append($('<select size="4">'), $('<button class="ok">OK</button>'), $('<button class="cancel">Cancel</button>'));

  var $dialog = Dialog.view($content, "select-encoding-dialog");

  var $select = $content.find("select");
  $select.append(model.options.map(function (encoding) {
    return $('<option>').text(encoding);
  }));
  model.encoding.observe(function (encoding) {
    $select.val(encoding);
  });
  $select.val(model.encoding.get());
  $select.click(function () {
    model.encoding.set($select.val());
  });

  // ok
  $content.find("button.ok").click(model.confirm);

  // cancel
  $content.find("button.cancel").click(model.hide);

  model.visible.observe(function (visible) {
    if (visible) {
      $dialog.addClass("visible");
      $content.find("input, select").focus();
    } else {
      $dialog.removeClass("visible");
    }
  });
};

module.exports = SelectEncodingDialogView;

},{"./dialog":8,"jquery":"jquery"}],29:[function(require,module,exports){
"use strict";

var $ = require("jquery");
var Signal = require("signals").Signal;
var Observable = require("./observable");

var SelectEncodingDialog = function SelectEncodingDialog() {

  var dialog = {
    visible: Observable(false),
    encoding: Observable(),
    options: ["UTF-8", "EUC-JP", "SJIS-WIN"],
    confirmed: new Signal(),

    confirm: function confirm() {
      dialog.visible.set(false);
      dialog.confirmed.dispatch(dialog.encoding.get());
    },

    show: function show(encoding) {
      dialog.encoding.set(encoding);
      dialog.visible.set(true);
    },

    hide: function hide() {
      dialog.visible.set(false);
    }
  };
  return dialog;
};

module.exports = SelectEncodingDialog;

},{"./observable":25,"jquery":"jquery","signals":"signals"}],"app":[function(require,module,exports){
"use strict";

var Mousetrap = require("mousetrap");
var EditorManager = require("./editor-manager");
var Finder = require("./finder");
var MainView = require("./main-view");

module.exports.run = function () {
  var finder = Finder();
  var editor_mgr = EditorManager(finder);
  var view = MainView(editor_mgr, finder);

  var saveFileList = function saveFileList() {
    var files = editor_mgr.getFiles();
    localStorage.setItem("open-files", JSON.stringify(files));
  };
  var loadFileList = function loadFileList() {
    return JSON.parse(localStorage.getItem("open-files") || "[]");
  };
  loadFileList().forEach(function (path) {
    editor_mgr.open(path);
  });

  editor_mgr.opened.add(saveFileList);
  editor_mgr.closed.add(saveFileList);

  // show finder
<<<<<<< HEAD
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    finder.show()
    return false
  }, "keydown")
}

},{"./editor-manager":10,"./finder":18,"./main-view":21,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZGlhbG9nLmpzIiwianMvZWRpdG9yLW1hbmFnZXItdmlldy5qcyIsImpzL2VkaXRvci1tYW5hZ2VyLmpzIiwianMvZWRpdG9yLXZpZXcuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9lb2wuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3Qtdmlldy5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LmpzIiwianMvZmluZGVyLXZpZXcuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9pbnB1dC13YXRjaGVyLmpzIiwianMvbWFpbi12aWV3LmpzIiwianMvb2JzZXJ2YWJsZS5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL3NlbGVjdC1lbmNvZGluZy1kaWFsb2ctdmlldy5qcyIsImpzL3NlbGVjdC1lbmNvZGluZy1kaWFsb2cuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG52YXIgaW5kZW50QWZ0ZXJQYXN0ZSA9IGZ1bmN0aW9uKGNtLCBjaGFuZ2UpIHtcbiAgaWYgKGNoYW5nZS5vcmlnaW4gIT0gXCJwYXN0ZVwiKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKENvZGVNaXJyb3IuY21wUG9zKGNoYW5nZS5mcm9tLCBjaGFuZ2UudG8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gIHZhciBkZXN0ID0gY20uZ2V0TGluZShjaGFuZ2UuZnJvbS5saW5lKVxuICBpZiAoZGVzdC5sZW5ndGggIT0gY2hhbmdlLmZyb20uY2gpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICBpZiAoZGVzdC5tYXRjaCgvW14gXFx0XS8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgaWYgKGNoYW5nZS50ZXh0W2NoYW5nZS50ZXh0Lmxlbmd0aCAtIDFdID09IFwiXCIpIHtcbiAgICBjaGFuZ2UudGV4dC5wb3AoKVxuICB9XG4gIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdXG4gIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICBsaW5lID0gbGluZS5tYXRjaCgvXihbIFxcdF0qKSguKikvKVxuICAgIHZhciBpbmRlbnQgPSBsaW5lWzFdXG4gICAgdmFyIHRleHQgPSBsaW5lWzJdXG4gICAgaW5kZW50ID0gKGRlc3QgKyBpbmRlbnQpLnN1YnN0cigwLCBkZXN0Lmxlbmd0aCArIGluZGVudC5sZW5ndGggLSBiYXNlX2luZGVudC5sZW5ndGgpXG4gICAgcmV0dXJuIGluZGVudCArIHRleHRcbiAgfSlcbiAgY2hhbmdlLnRleHRbMF0gPSBjaGFuZ2UudGV4dFswXS5zdWJzdHIoZGVzdC5sZW5ndGgpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5kZW50QWZ0ZXJQYXN0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxucmVxdWlyZShcImNvZGVtaXJyb3ItYWRkb25cIilcbnJlcXVpcmUoXCIuL21hcmtcIilcbnJlcXVpcmUoXCIuL3NlbGVjdC1saW5lXCIpXG5yZXF1aXJlKFwiLi9zZWxlY3Qtd29yZFwiKVxucmVxdWlyZShcIi4vc3BsaXQtaW50by1saW5lc1wiKVxucmVxdWlyZShcIi4vdGV4dC1tb2RlXCIpXG5cbk9iamVjdC5hc3NpZ24oQ29kZU1pcnJvci5kZWZhdWx0cywge1xuICBsaW5lTnVtYmVyczogdHJ1ZSxcbiAgdGFiU2l6ZTogNCxcbiAgc2hvd0N1cnNvcldoZW5TZWxlY3Rpbmc6IHRydWUsXG4gIGF1dG9DbG9zZUJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaEJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaFRhZ3M6IHRydWUsXG4gIGF1dG9DbG9zZVRhZ3M6IHRydWUsXG4gIHN0eWxlQWN0aXZlTGluZToge25vbkVtcHR5OiB0cnVlfSxcbiAgc3R5bGVTZWxlY3RlZFRleHQ6IHRydWUsXG4gIGRyYWdEcm9wOiBmYWxzZSxcbiAgZXh0cmFLZXlzOiB7XG4gICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgIFwiVGFiXCI6IFwiaW5kZW50QXV0b1wiLFxuICAgIFwiQ3RybC1EXCI6IGZhbHNlLFxuICAgIFwiQ21kLURcIjogZmFsc2UsXG4gIH0sXG59KVxuXG5Db2RlTWlycm9yLmRlZmluZUluaXRIb29rKGZ1bmN0aW9uKGNtKSB7XG4gIC8vIG1haW50YWluIGluZGVudGF0aW9uIG9uIHBhc3RlXG4gIGNtLm9uKFwiYmVmb3JlQ2hhbmdlXCIsIHJlcXVpcmUoXCIuL2luZGVudC1hZnRlci1wYXN0ZVwiKSlcbiAgXG4gIC8vIGtleSBiaW5kaW5nc1xuICB2YXIgaW5wdXQgPSBjbS5nZXRJbnB1dEZpZWxkKClcbiAgaW5wdXQuY2xhc3NOYW1lICs9IFwiIG1vdXNldHJhcFwiIC8vIGVuYWJsZSBob3RrZXlcbiAgdmFyIGtleW1hcCA9IHtcbiAgICBcImFsdCtiXCI6IFwiZ29Xb3JkTGVmdFwiLFxuICAgIFwiYWx0K2ZcIjogXCJnb1dvcmRSaWdodFwiLFxuICAgIFwiYWx0K2hcIjogXCJkZWxXb3JkQmVmb3JlXCIsXG4gICAgXCJhbHQrZFwiOiBcImRlbFdvcmRBZnRlclwiLFxuICAgIFwibW9kK21cIjogXCJtYXJrXCIsXG4gICAgXCJtb2QrZFwiOiBcInNlbGVjdFdvcmRcIixcbiAgICBcIm1vZCtsXCI6IFwic2VsZWN0TGluZVwiLFxuICAgIFwibW9kK3NoaWZ0K2xcIjogXCJzcGxpdEludG9MaW5lc1wiLFxuICB9XG4gIF8uZWFjaChrZXltYXAsIGZ1bmN0aW9uKGNvbW1hbmQsIGtleSkge1xuICAgIE1vdXNldHJhcChpbnB1dCkuYmluZChrZXksIGZ1bmN0aW9uKCkge1xuICAgICAgY20uZXhlY0NvbW1hbmQoY29tbWFuZClcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pXG4gIH0pXG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVNaXJyb3JcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5kZWZpbmVJbml0SG9vayhmdW5jdGlvbihjbSkge1xuICBjbS5tYXJrcyA9IFtdXG59KVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLm1hcmsgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgY3Vyc29yID0gY20uZ2V0Q3Vyc29yKClcbiAgaWYgKGNtLm1hcmtzLmxlbmd0aCkge1xuICAgIHZhciBsYXN0ID0gY20ubWFya3NbY20ubWFya3MubGVuZ3RoIC0gMV1cbiAgICBpZiAobGFzdC5saW5lID09IGN1cnNvci5saW5lICYmIGxhc3QuY2ggPT0gY3Vyc29yLmNoKSB7XG4gICAgICBjbS5zZXRTZWxlY3Rpb25zKGNtLm1hcmtzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHJldHVybiB7aGVhZDogbSwgYW5jaG9yOiBtfVxuICAgICAgfSksIGNtLm1hcmtzLmxlbmd0aCAtIDEpXG4gICAgICBjbS5tYXJrcyA9IFtdXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgY20ubWFya3MucHVzaChjdXJzb3IpXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0TGluZSA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9LFxuICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgbGluZTogaS5hbmNob3IubGluZSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIClcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zZWxlY3RXb3JkID0gZnVuY3Rpb24oY20pIHtcbiAgY20uc2V0U2VsZWN0aW9ucyhcbiAgICBjbS5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gY20uZmluZFdvcmRBdChpLmFuY2hvcilcbiAgICB9KVxuICApXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc3BsaXRJbnRvTGluZXMgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGNtLmxpc3RTZWxlY3Rpb25zKClcbiAgaWYgKHNlbGVjdGlvbnMubGVuZ3RoICE9IDEpIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gICAgcmV0dXJuXG4gIH1cbiAgdmFyIGFuY2hvciA9IHNlbGVjdGlvbnNbMF0uYW5jaG9yXG4gIHZhciBoZWFkID0gc2VsZWN0aW9uc1swXS5oZWFkXG4gIHZhciBuZXdfc2VsZWN0aW9ucyA9IFtdXG4gIGZvciAodmFyIGkgPSBhbmNob3IubGluZTsgaSA8PSBoZWFkLmxpbmU7ICsraSkge1xuICAgIG5ld19zZWxlY3Rpb25zLnB1c2goe1xuICAgICAgYW5jaG9yOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGFuY2hvci5saW5lID8gYW5jaG9yLmNoIDogMCxcbiAgICAgIH0sXG4gICAgICBoZWFkOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGhlYWQubGluZSA/IGhlYWQuY2ggOiBJbmZpbml0eSxcbiAgICAgIH0sXG4gICAgfSlcbiAgfVxuICBjbS5zZXRTZWxlY3Rpb25zKG5ld19zZWxlY3Rpb25zKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmRlZmluZVNpbXBsZU1vZGUoXCJ0ZXh0XCIsIHtcbiAgc3RhcnQ6IFtdLFxuICBjb21tZW50OiBbXSxcbiAgbWV0YToge30sXG59KVxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG5cbnZhciBvcGVuID0gZnVuY3Rpb24oY29udGVudCkge1xuICB2YXIgY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICBiYWNrZHJvcC5yZW1vdmUoKVxuICB9XG4gIHJldHVybiBjbG9zZVxufVxuXG52YXIgdmlldyA9IGZ1bmN0aW9uKGNvbnRlbnQsIGNsYXNzX25hbWUpIHtcbiAgdmFyIGJhY2tkcm9wID0gJCgnPGRpdiBjbGFzcz1cImJhY2tkcm9wXCI+JykuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgdmFyIGRpYWxvZyA9ICQoJzxkaXYgY2xhc3M9XCJkaWFsb2dcIj4nKS5hcHBlbmRUbyhiYWNrZHJvcClcbiAgZGlhbG9nLmFkZENsYXNzKGNsYXNzX25hbWUpXG4gIGRpYWxvZy5hcHBlbmQoY29udGVudClcbiAgcmV0dXJuIGJhY2tkcm9wXG59XG5cbm1vZHVsZS5leHBvcnRzLnZpZXcgPSB2aWV3XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciBFZGl0b3JWaWV3ID0gcmVxdWlyZShcIi4vZWRpdG9yLXZpZXdcIilcblxudmFyIEVkaXRvck1hbmFnZXJWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIGVkaXRvcl9tZ3IpIHtcbiAgdmFyIGVkaXRvcnMgPSB7fVxuICB2YXIgJHRhYnMgPSAkKFwiPGRpdj5cIikuYXR0cihcImlkXCIsIFwiZmlsZXNcIikuYXBwZW5kVG8oJHJvb3QpXG4gIHZhciAkZWRpdG9ycyA9ICQoXCI8ZGl2PlwiKS5hdHRyKFwiaWRcIiwgXCJlZGl0b3JzXCIpLmFwcGVuZFRvKCRyb290KVxuICBcbiAgZWRpdG9yX21nci5vcGVuZWQuYWRkKGZ1bmN0aW9uKGVkaXRvcikge1xuICAgIHZhciBwYXRoID0gZWRpdG9yLmdldFBhdGgoKVxuICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIilcbiAgICB2YXIgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKVxuICAgIHZhciAkdGFiID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpclwiKS50ZXh0KGRpciksXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICApLmFwcGVuZFRvKCR0YWJzKVxuICAgIC8vIHN0YXR1cyBpbiB0YWJcbiAgICBlZGl0b3Iuc3RhdHVzLm9ic2VydmUoZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgICAkdGFiLmZpbmQoXCIuc3RhdHVzXCIpLnJlbW92ZUNsYXNzKFwiY2xlYW4gZXJyb3IgbW9kaWZpZWRcIikuYWRkQ2xhc3Moc3RhdHVzKVxuICAgIH0pXG4gICAgLy8gZWRpdG9yIHZpZXdcbiAgICB2YXIgJGVkaXRvciA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImVkaXRvclwiKS5hcHBlbmRUbygkZWRpdG9ycylcbiAgICB2YXIgZWRpdG9yX3ZpZXcgPSBFZGl0b3JWaWV3KCRlZGl0b3IsIGVkaXRvciwgZWRpdG9yX21ncilcbiAgICBcbiAgICBlZGl0b3JzW3BhdGhdID0ge1xuICAgICAgJHRhYjogJHRhYixcbiAgICAgICRlZGl0b3I6ICRlZGl0b3IsXG4gICAgfVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5jbG9zZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBlZGl0b3JzW3BhdGhdLiR0YWIucmVtb3ZlKClcbiAgICBlZGl0b3JzW3BhdGhdLiRlZGl0b3IucmVtb3ZlKClcbiAgICBkZWxldGUgZWRpdG9yc1twYXRoXVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAkdGFicy5maW5kKFwiLmZpbGUtaXRlbS5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGVkaXRvcnNbcGF0aF0uJHRhYi5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICB9KVxuICBcbiAgJHRhYnMub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIHZhciAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG4gICAgdmFyIHBhdGggPSBfLmZpbmRLZXkoZWRpdG9ycywgZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGkuJHRhYi5pcygkdGFyZ2V0KVxuICAgIH0pXG4gICAgZWRpdG9yX21nci5hY3RpdmF0ZShwYXRoKVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvck1hbmFnZXJWaWV3XG4iLCJ2YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRmlsZSA9IHJlcXVpcmUoXCIuL2ZpbGVcIilcbnZhciBFZGl0b3IgPSByZXF1aXJlKFwiLi9lZGl0b3JcIilcblxudmFyIEVkaXRvck1hbmFnZXIgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIG9wZW5lZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgY2xvc2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBhY3RpdmF0ZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGFjdGl2ZTogbnVsbCwgLy8gcGF0aCBvZiBhY3RpdmUgZmlsZVxuICAgIGVkaXRvcnM6IFtdLFxuICAgIFxuICAgIGdldEZpbGVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5lZGl0b3JzLm1hcChmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgICAgcmV0dXJuIGVkaXRvci5nZXRQYXRoKClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBvcGVuOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBcIlRoZSBwYXRoIGlzIG51bGxcIlxuICAgICAgfVxuICAgICAgLy8gdHJ5IHRvIGFjdGl2YXRlIGFscmVhZHkgb3BlbmVkIGZpbGVzXG4gICAgICBpZiAobW9kZWwuYWN0aXZhdGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgZWRpdG9yID0gRWRpdG9yKEZpbGUocGF0aCkpXG4gICAgICBlZGl0b3IubG9hZCgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGVsLmVkaXRvcnMucHVzaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLm9wZW5lZC5kaXNwYXRjaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLmFjdGl2YXRlKHBhdGgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgZ2V0QWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5hY3RpdmVcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgICBpZiAocGF0aCAhPT0gbnVsbCAmJiBtb2RlbC5pbmRleE9mKHBhdGgpID09IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZlID0gcGF0aFxuICAgICAgbW9kZWwuYWN0aXZhdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICBmaW5kZXIuc2V0UGF0aChwYXRoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFxuICAgIG5leHRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUodHJ1ZSlcbiAgICB9LFxuICAgIFxuICAgIHByZXZGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUoZmFsc2UpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGVGaWxlOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuZWRpdG9ycy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHhcbiAgICAgIGlmIChtb2RlbC5hY3RpdmUgPT09IG51bGwpIHtcbiAgICAgICAgaWR4ID0gbmV4dCA/IDAgOiBtb2RlbC5lZGl0b3JzLmxlbmd0aCAtIDFcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZHggPSBtb2RlbC5pbmRleE9mKG1vZGVsLmFjdGl2ZSlcbiAgICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICAgIGlkeCA9IChpZHggKyBtb2RlbC5lZGl0b3JzLmxlbmd0aCkgJSBtb2RlbC5lZGl0b3JzLmxlbmd0aFxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZhdGUobW9kZWwuZWRpdG9yc1tpZHhdLmdldFBhdGgoKSlcbiAgICB9LFxuICAgIFxuICAgIGNsb3NlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaW5kZXhPZihwYXRoKVxuICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgaWYgKG1vZGVsLmVkaXRvcnMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBtb2RlbC5hY3RpdmF0ZShudWxsKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1vZGVsLnByZXZGaWxlKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbW9kZWwuZWRpdG9ycy5zcGxpY2UoaWR4LCAxKVxuICAgICAgbW9kZWwuY2xvc2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICByZWxvYWQ6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5vcGVuKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBpbmRleE9mOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZ2V0RmlsZXMoKS5pbmRleE9mKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnNlbGVjdGVkLmFkZChtb2RlbC5vcGVuKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yTWFuYWdlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCIuL2NvZGVtaXJyb3JcIilcbnZhciBTZWxlY3RFbmNvZGluZ0RpYWxvZ1ZpZXcgPSByZXF1aXJlKFwiLi9zZWxlY3QtZW5jb2RpbmctZGlhbG9nLXZpZXdcIilcblxudmFyIEVkaXRvclZpZXcgPSBmdW5jdGlvbigkcm9vdCwgZWRpdG9yLCBlZGl0b3JfbWdyKSB7XG4gIHZhciBmaWxlID0gZWRpdG9yLmdldEZpbGUoKVxuICBcbiAgdmFyIGNtID0gQ29kZU1pcnJvcigkcm9vdFswXSwge1xuICAgIHZhbHVlOiBlZGl0b3IudGV4dC5nZXQoKSxcbiAgICBtb2RlOiBlZGl0b3IubW9kZS5nZXQoKSxcbiAgfSlcbiAgXG4gIC8vIGZvb3RlclxuICAkcm9vdC5hcHBlbmQoXG4gICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1lb2wgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxidXR0b24gY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmcgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgKVxuICApXG4gIFxuICBTZWxlY3RFbmNvZGluZ0RpYWxvZ1ZpZXcoXG4gICAgZWRpdG9yLnNlbGVjdF9lbmNvZGluZ19kaWFsb2dcbiAgKVxuICBcbiAgLy8gc2F2ZVxuICB2YXIgbGFzdF9nZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBnZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICAgIGVkaXRvci5zYXZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGxhc3RfZ2VuZXJhdGlvbiA9IGdlbmVyYXRpb25cbiAgICB9KVxuICB9XG4gIGNtLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IudGV4dC5zZXQoY20uZ2V0VmFsdWUoKSlcbiAgICBlZGl0b3Iuc3RhdHVzLnNldChcbiAgICAgIGNtLmlzQ2xlYW4obGFzdF9nZW5lcmF0aW9uKSA/IFwiY2xlYW5cIiA6IFwibW9kaWZpZWRcIlxuICAgIClcbiAgfSlcbiAgZWRpdG9yLnRleHQub2JzZXJ2ZShmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKHRleHQgIT0gY20uZ2V0VmFsdWUoKSkge1xuICAgICAgY20uc2V0VmFsdWUodGV4dClcbiAgICB9XG4gIH0pXG5cbiAgLy8gbW9kZVxuICB2YXIgdXBkYXRlTW9kZSA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICBjbS5zZXRPcHRpb24oXCJtb2RlXCIsIG1vZGUpXG4gICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKVxuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlKVxuICB9XG4gIGVkaXRvci5tb2RlLm9ic2VydmUodXBkYXRlTW9kZSlcbiAgdXBkYXRlTW9kZShlZGl0b3IubW9kZS5nZXQoKSlcbiAgXG4gIC8vIGluZGVudFxuICB2YXIgdXBkYXRlSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpXG4gICAgaWYgKHR5cGUgPT0gXCJUQUJcIikge1xuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjbS5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCBmYWxzZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgTnVtYmVyKHR5cGUucmVwbGFjZShcIlNQXCIsIFwiXCIpKSlcbiAgICB9XG4gIH1cbiAgZWRpdG9yLmluZGVudC5vYnNlcnZlKHVwZGF0ZUluZGVudClcbiAgdXBkYXRlSW5kZW50KGVkaXRvci5pbmRlbnQuZ2V0KCkpXG4gICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IuaW5kZW50LnJvdGF0ZSgpXG4gIH0pXG4gIFxuICAvLyBsaW5lIHNlcHJhdG9yXG4gIHZhciB1cGRhdGVFb2wgPSBmdW5jdGlvbihlb2wpIHtcbiAgICB2YXIgbmFtZXMgPSB7XG4gICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICBcIlxcblwiOiBcIkxGXCIsXG4gICAgICBcIlxcclxcblwiOiBcIkNSTEZcIixcbiAgICB9XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQobmFtZXNbZW9sXSlcbiAgfVxuICBmaWxlLmVvbC5vYnNlcnZlKHVwZGF0ZUVvbClcbiAgdXBkYXRlRW9sKGZpbGUuZW9sLmdldCgpKVxuICAkcm9vdC5maW5kKFwiLmVkaXRvci1lb2xcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgZmlsZS5lb2wucm90YXRlKClcbiAgfSlcbiAgXG4gIC8vIGVuY29kaW5nXG4gIHZhciB1cGRhdGVFbmNvZGluZyA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZylcbiAgfVxuICBmaWxlLmVuY29kaW5nLmFkZCh1cGRhdGVFbmNvZGluZylcbiAgdXBkYXRlRW5jb2RpbmcoZmlsZS5lbmNvZGluZy5nZXQoKSlcbiAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yLnNlbGVjdF9lbmNvZGluZ19kaWFsb2cuc2hvdyhcbiAgICAgIGZpbGUuZW5jb2RpbmcuZ2V0KClcbiAgICApXG4gIH0pXG4gIGVkaXRvci5zZWxlY3RfZW5jb2RpbmdfZGlhbG9nLmNvbmZpcm1lZC5hZGQoZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICBmaWxlLmVuY29kaW5nLnNldChlbmNvZGluZylcbiAgfSlcbiAgXG4gIC8vIG1lc3NhZ2VcbiAgZWRpdG9yLm1lc3NhZ2Uub2JzZXJ2ZShmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KG1lc3NhZ2UpXG4gIH0pXG4gIFxuICAvLyBhY3RpdmVcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKGFjdGl2ZSkge1xuICAgIGlmIChhY3RpdmUgPT0gZmlsZS5nZXRQYXRoKCkpIHtcbiAgICAgICRyb290LmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBjbS5mb2N1cygpXG4gICAgICBjbS5yZWZyZXNoKClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkcm9vdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH1cbiAgfSlcbiAgXG4gIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgTW91c2V0cmFwKCRyb290WzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2F2ZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcIi4vY29kZW1pcnJvclwiKVxudmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudFwiKVxudmFyIFNlbGVjdEVuY29kaW5nRGlhbG9nID0gcmVxdWlyZShcIi4vc2VsZWN0LWVuY29kaW5nLWRpYWxvZ1wiKVxuXG52YXIgRWRpdG9yID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgZWRpdG9yID0ge1xuICAgIHRleHQ6IE9ic2VydmFibGUoXCJcIiksXG4gICAgc3RhdHVzOiBPYnNlcnZhYmxlKFwiY2xlYW5cIiksXG4gICAgbW9kZTogT2JzZXJ2YWJsZShcInRleHRcIiksXG4gICAgaW5kZW50OiBJbmRlbnQoKSxcbiAgICBtZXNzYWdlOiBPYnNlcnZhYmxlKFwiXCIpLFxuICAgIHNlbGVjdF9lbmNvZGluZ19kaWFsb2c6IFNlbGVjdEVuY29kaW5nRGlhbG9nKCksXG4gICAgXG4gICAgZ2V0RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZS5nZXRQYXRoKClcbiAgICB9LFxuICAgIFxuICAgIGxvYWQ6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgIHJldHVybiBmaWxlLnJlYWQoKS50aGVuKGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgZWRpdG9yLmluZGVudC5zZXQoSW5kZW50LmRldGVjdEluZGVudFR5cGUodGV4dCkpXG4gICAgICAgIGVkaXRvci50ZXh0LnNldCh0ZXh0KVxuICAgICAgICBlZGl0b3IubWVzc2FnZS5zZXQoXCJMb2FkZWQuXCIpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2F2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZS53cml0ZShlZGl0b3IudGV4dC5nZXQoKSkuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiU2F2ZSBmYWlsZWQuIFwiICsgcmVwbHkuZXJyb3IpXG4gICAgICAgIGVkaXRvci5zdGF0dXMuc2V0KFwiZXJyb3JcIilcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGVkaXRvci5zdGF0dXMuc2V0KFwiY2xlYW5cIilcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiU2F2ZWQuXCIpXG4gICAgICB9KVxuICAgIH0sXG4gIH1cbiAgXG4gIHZhciBkZXRlY3RNb2RlID0gKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gcGF0aC5yZXBsYWNlKC8uKlsuXSguKykkLywgXCIkMVwiKVxuICAgIHZhciBtb2RlID0ge1xuICAgICAgaHRtbDogXCJwaHBcIixcbiAgICAgIHRhZzogXCJwaHBcIixcbiAgICB9W2V4dGVuc2lvbl1cbiAgICBpZiAobW9kZSkge1xuICAgICAgcmV0dXJuIG1vZGVcbiAgICB9XG4gICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pXG4gICAgaWYgKG1vZGUpIHtcbiAgICAgIHJldHVybiBtb2RlLm1vZGVcbiAgICB9XG4gICAgcmV0dXJuIFwidGV4dFwiXG4gIH0pXG4gIGVkaXRvci5tb2RlLnNldChkZXRlY3RNb2RlKGZpbGUuZ2V0UGF0aCgpKSlcbiAgXG4gIC8vIGF1dG8gc2F2ZVxuICBlZGl0b3IudGV4dC5vYnNlcnZlKF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgaWYgKGVkaXRvci5zdGF0dXMuZ2V0KCkgIT0gXCJjbGVhblwiKSB7XG4gICAgICBlZGl0b3Iuc2F2ZSgpXG4gICAgfVxuICB9LCA0MDAwKSlcbiAgXG4gIHJldHVybiBlZGl0b3Jcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JcbiIsInZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGVcIilcblxudmFyIEVvbCA9IGZ1bmN0aW9uKGVvbCkge1xuICByZXR1cm4gUm90YXRlKFtcIlxcblwiLCBcIlxcclxcblwiLCBcIlxcclwiXSwgZW9sKVxufVxuXG5Fb2wuZGV0ZWN0ID0gZnVuY3Rpb24odGV4dCkge1xuICBpZiAodGV4dC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiXG4gIH1cbiAgaWYgKHRleHQubWF0Y2goXCJcXHJcIikpIHtcbiAgICByZXR1cm4gXCJcXHJcIlxuICB9XG4gIHJldHVybiBcIlxcblwiXG59XG5cbkVvbC5yZWd1bGF0ZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvKFxcclxcbnxcXHIpLywgXCJcXG5cIilcbn0sXG5cbm1vZHVsZS5leHBvcnRzID0gRW9sXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxudmFyIEVvbCA9IHJlcXVpcmUoXCIuL2VvbFwiKVxuXG52YXIgRmlsZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGZpbGUgPSB7XG4gICAgZW9sOiBFb2woKSxcbiAgICBlbmNvZGluZzogT2JzZXJ2YWJsZSgpLFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBhdGhcbiAgICB9LFxuICAgIFxuICAgIHJlYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgICAgdXJsOiBcIi9yZWFkLnBocFwiLFxuICAgICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgICAgfSkuZmFpbChyZWplY3QpLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICBmaWxlLmVuY29kaW5nLnNldChyZXBseS5lbmNvZGluZylcbiAgICAgICAgICBmaWxlLmVvbC5zZXQoRW9sLmRldGVjdChyZXBseS5jb250ZW50KSlcbiAgICAgICAgICB2YXIgY29udGVudCA9IEVvbC5yZWd1bGF0ZShyZXBseS5jb250ZW50KVxuICAgICAgICAgIHJlc29sdmUoY29udGVudClcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB3cml0ZTogZnVuY3Rpb24odGV4dCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogXCIvd3JpdGUucGhwXCIsXG4gICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICBlbmNvZGluZzogZmlsZS5lbmNvZGluZy5nZXQoKSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IHRleHQucmVwbGFjZSgvXFxuL2csIGZpbGUuZW9sLmdldCgpKVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgICAgaWYgKHJlcGx5ID09IFwib2tcIikge1xuICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHJlcGx5LmVycm9yKVxuICAgICAgICAgIH1cbiAgICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZWplY3QoXCJcIilcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSxcbiAgfVxuICByZXR1cm4gZmlsZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuXG52YXIgRmluZGVyU3VnZ2VzdFZpZXcgPSBmdW5jdGlvbigkcm9vdCwgbW9kZWwpIHtcbiAgdmFyICRsaXN0ID0gJHJvb3RcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHVwZGF0ZUl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgJGxpc3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIikuZW1wdHkoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxICYmIGl0ZW1zWzBdID09IG1vZGVsLmdldEN1cnNvcigpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIG5hbWVfcnggPSBuZXcgUmVnRXhwKFwiLyhbXi9dKi8/KSRcIilcbiAgICAgICRsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVfcnguZXhlYyhpdGVtKVsxXVxuICAgICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgICB9KSlcbiAgICAgICRsaXN0LnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkbGlzdC5maW5kKFwiYS5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBhID0gJGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gICAgICB9KVxuICAgICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcblxuICAgICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KClcbiAgICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgICAgdmFyIHZpZXdfaGVpZ2h0ID0gJGxpc3QuaW5uZXJIZWlnaHQoKVxuICAgICAgICBpZiAodG9wIC0gJGxpc3Quc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICAgICAgJGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm90dG9tIC0gJGxpc3Quc2Nyb2xsVG9wKCkgPiB2aWV3X2hlaWdodCkge1xuICAgICAgICAgICRsaXN0LnNjcm9sbFRvcChib3R0b20gLSB2aWV3X2hlaWdodClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2Nyb2xsSW50b1ZpZXcoYSlcbiAgICB9XG4gIH1cbiAgXG4gIG1vZGVsLml0ZW1zX2NoYW5nZWQuYWRkKHZpZXcudXBkYXRlSXRlbXMpXG4gIG1vZGVsLmN1cnNvcl9tb3ZlZC5hZGQodmlldy51cGRhdGVDdXJzb3IpXG4gIFxuICAvLyB3aGVuIGl0ZW0gd2FzIHNlbGVjdGVkXG4gICRsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIFxuICAvLyBwcmV2ZW50IGZyb20gbG9vc2luZyBmb2N1c1xuICAkbGlzdC5vbihcIm1vdXNlZG93blwiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICB9KVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0Vmlld1xuIiwidmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBGaW5kZXJTdWdnZXN0ID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBpdGVtczogW10sXG4gICAgY3Vyc29yOiBudWxsLCAvLyBoaWdobGlnaHRlZCBpdGVtXG4gICAgXG4gICAgaXRlbXNfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIGN1cnNvcl9tb3ZlZDogbmV3IFNpZ25hbCgpLFxuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICB1cmw6IFwiL2ZpbmRlci5waHBcIixcbiAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZmFpbGVkIHRvIGZldGNoIHN1Z2dlc3QgZm9yIHRoZSBwYXRoOiBcIiArIHBhdGgpXG4gICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgIG1vZGVsLnNldEl0ZW1zKHJlcGx5Lml0ZW1zLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlcGx5LmJhc2UgKyBpXG4gICAgICAgIH0pKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHNldEl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG51bGwpXG4gICAgICBtb2RlbC5pdGVtcyA9IGl0ZW1zXG4gICAgICBtb2RlbC5pdGVtc19jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLml0ZW1zKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLml0ZW1zXG4gICAgfSxcbiAgICBcbiAgICBnZXRDdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmN1cnNvclxuICAgIH0sXG4gICAgXG4gICAgc2V0Q3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuY3Vyc29yKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuY3Vyc29yID0gcGF0aFxuICAgICAgbW9kZWwuY3Vyc29yX21vdmVkLmRpc3BhdGNoKG1vZGVsLmN1cnNvcilcbiAgICB9LFxuICAgIFxuICAgIG1vdmVDdXJzb3I6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5jdXJzb3IgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKG1vZGVsLml0ZW1zLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zWzBdKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IG1vZGVsLml0ZW1zLmluZGV4T2YobW9kZWwuY3Vyc29yKVxuICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICBpZHggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb2RlbC5pdGVtcy5sZW5ndGggLSAxLCBpZHgpKVxuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zW2lkeF0pXG4gICAgfSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihwYXRoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIG1vZGVsLnVwZGF0ZShmaW5kZXIuZ2V0UGF0aCgpKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKF8uZGVib3VuY2UobW9kZWwudXBkYXRlLCAyNTApKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIEZhbHNlID0gcmVxdWlyZShcIi4vcmV0dXJuLWZhbHNlXCIpXG52YXIgSW5wdXRXYXRjaGVyID0gcmVxdWlyZShcIi4vaW5wdXQtd2F0Y2hlclwiKVxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3Qtdmlld1wiKVxuXG52YXIgRmluZGVyVmlldyA9IGZ1bmN0aW9uKCRyb290LCBmaW5kZXIpIHtcbiAgdmFyICRwYXRoX2lucHV0ID0gJChcbiAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJmaW5kZXItcGF0aFwiIGNsYXNzPVwibW91c2V0cmFwXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCIgdmFsdWU9XCIvXCI+J1xuICApLmFwcGVuZFRvKCRyb290KVxuICBcbiAgdmFyIHBhdGhfd2F0Y2hlciA9IElucHV0V2F0Y2hlcigkcGF0aF9pbnB1dCwgNTApXG4gIHBhdGhfd2F0Y2hlci5jaGFuZ2VkLmFkZChmaW5kZXIuc2V0UGF0aClcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgJHJvb3QuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgICRwYXRoX2lucHV0LmZvY3VzKClcbiAgICAgIHBhdGhfd2F0Y2hlci5zdGFydCgpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICRyb290LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RvcCgpXG4gICAgfSxcbiAgfVxuICBcbiAgLy8gaGlkZSBvbiBibHVyXG4gICRwYXRoX2lucHV0LmJsdXIoZmluZGVyLmhpZGUoKSlcbiAgXG4gIGZpbmRlci52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgdmlldy5zaG93KClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2aWV3LmhpZGUoKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAkcGF0aF9pbnB1dC52YWwocGF0aClcbiAgfSlcbiAgXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcImVudGVyXCIsIEZhbHNlKGZpbmRlci5lbnRlcikpXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcInRhYlwiLCBGYWxzZShmaW5kZXIudGFiKSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwiZXNjXCIsIEZhbHNlKGZpbmRlci5oaWRlKSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwiZG93blwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc3VnZ2VzdC5tb3ZlQ3Vyc29yKHRydWUpXG4gIH0pKVxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ1cFwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc3VnZ2VzdC5tb3ZlQ3Vyc29yKGZhbHNlKVxuICB9KSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwibW9kK3VcIiwgRmFsc2UoXG4gICAgZmluZGVyLmdvVG9QYXJlbnREaXJlY3RvcnlcbiAgKSlcbiAgXG4gIC8vIHN1Z2dlc3Qgdmlld1xuICB2YXIgJGl0ZW1zID0gJCgnPGRpdiBpZD1cImZpbmRlci1pdGVtc1wiPicpLmFwcGVuZFRvKCRyb290KVxuICBGaW5kZXJTdWdnZXN0VmlldygkaXRlbXMsIGZpbmRlci5zdWdnZXN0KVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJWaWV3XG4iLCJ2YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0XCIpXG5cbnZhciBGaW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgcGF0aF9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgdmlzaWJpbGl0eV9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgcGF0aDogXCJcIixcbiAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgocGF0aClcbiAgICAgIGlmIChwYXRoLnN1YnN0cigtMSkgPT0gXCIvXCIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5oaWRlKClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSB0cnVlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IGZhbHNlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbi8vICAgICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKGVkaXRvcl9tYW5hZ2VyLmdldEFjdGl2ZSgpKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwucGF0aFxuICAgIH0sXG4gICAgXG4gICAgc2V0UGF0aDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwucGF0aCA9IHBhdGhcbiAgICAgIG1vZGVsLnBhdGhfY2hhbmdlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgZ29Ub1BhcmVudERpcmVjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKFxuICAgICAgICBtb2RlbC5wYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKVxuICAgICAgKVxuICAgIH0sXG4gICAgXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhdGggPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBtb2RlbC5zZWxlY3QocGF0aCA/IHBhdGggOiBtb2RlbC5wYXRoKVxuICAgIH0sXG4gICAgXG4gICAgdGFiOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoY3Vyc29yKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpdGVtcyA9IHN1Z2dlc3QuZ2V0SXRlbXMoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoaXRlbXNbMF0pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgc3VnZ2VzdC51cGRhdGUobW9kZWwucGF0aClcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgc3VnZ2VzdCA9IG1vZGVsLnN1Z2dlc3QgPSBGaW5kZXJTdWdnZXN0KG1vZGVsKVxuICBzdWdnZXN0LnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwuc2VsZWN0KHBhdGgpXG4gIH0pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJcbiIsInZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGVcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCI0U1BcIiwgXCIyU1BcIiwgXCJUQUJcIl0sIHR5cGUpXG59XG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBJbnB1dFdhdGNoZXIgPSBmdW5jdGlvbihpbnB1dCwgaW50ZXJ2YWwpIHtcbiAgaW5wdXQgPSAkKGlucHV0KVxuICBcbiAgdmFyIG1vZGVsID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBpbnB1dDogaW5wdXQsXG4gICAgaW50ZXJ2YWw6IGludGVydmFsLFxuICAgIGxhc3RfdmFsdWU6IGlucHV0LnZhbCgpLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIFxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnN0b3AoKVxuICAgICAgbW9kZWwudGltZXIgPSBzZXRJbnRlcnZhbChtb2RlbC5jaGVjaywgbW9kZWwuaW50ZXJ2YWwpXG4gICAgfSxcbiAgICBcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwobW9kZWwudGltZXIpXG4gICAgICBtb2RlbC50aW1lciA9IG51bGxcbiAgICB9LFxuICAgIFxuICAgIGNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbW9kZWwuaW5wdXQudmFsKClcbiAgICAgIGlmIChjdXJyZW50ID09IG1vZGVsLmxhc3RfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jaGFuZ2VkLmRpc3BhdGNoKGN1cnJlbnQsIG1vZGVsLmxhc3RfdmFsdWUpXG4gICAgICBtb2RlbC5sYXN0X3ZhbHVlID0gY3VycmVudFxuICAgIH0sXG4gICAgXG4gICAga2V5RG93bjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAobW9kZWwudGltZXIpIHtcbiAgICAgICAgbW9kZWwuY2hlY2soKVxuICAgICAgfVxuICAgIH0sXG4gIH1cbiAgXG4gIGlucHV0LmtleWRvd24obW9kZWwua2V5RG93bilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0V2F0Y2hlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgRWRpdG9yTWFuYWdlclZpZXcgPSByZXF1aXJlKFwiLi9lZGl0b3ItbWFuYWdlci12aWV3XCIpXG52YXIgRmluZGVyVmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci12aWV3XCIpXG5cbnZhciBNYWluVmlldyA9IGZ1bmN0aW9uKGVkaXRvcl9tZ3IsIGZpbmRlcikge1xuICB2YXIgJG1haW4gPSAkKFwibWFpblwiKVxuICBFZGl0b3JNYW5hZ2VyVmlldyhcbiAgICAkKCc8ZGl2IGlkPVwiZWRpdG9yX21hbmFnZXJcIj4nKS5hcHBlbmRUbygkbWFpbiksXG4gICAgZWRpdG9yX21nclxuICApXG4gIEZpbmRlclZpZXcoXG4gICAgJCgnPGZvcm0gaWQ9XCJmaW5kZXJcIj4nKS5hcHBlbmRUbygkbWFpbiksXG4gICAgZmluZGVyXG4gIClcbiAgXG4gIC8vIHNob3J0Y3V0IGtleXNcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kKztcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5uZXh0RmlsZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrc2hpZnQrO1wiLCBcIm1vZCtzaGlmdCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IuY2xvc2UoZWRpdG9yX21nci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnJlbG9hZChlZGl0b3JfbWdyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNYWluVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBvYnNlcnZhYmxlID0gbmV3IFNpZ25hbCgpXG4gIE9iamVjdC5hc3NpZ24ob2JzZXJ2YWJsZSwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUgPT09IG5ld192YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBvbGRfdmFsdWUgPSB2YWx1ZVxuICAgICAgdmFsdWUgPSBuZXdfdmFsdWVcbiAgICAgIG9ic2VydmFibGUuZGlzcGF0Y2godmFsdWUsIG9sZF92YWx1ZSwgb2JzZXJ2YWJsZSlcbiAgICB9LFxuICAgIG9ic2VydmU6IG9ic2VydmFibGUuYWRkLCAvLyBhbGlhc1xuICB9KVxuICByZXR1cm4gb2JzZXJ2YWJsZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9ic2VydmFibGVcbiIsInZhciByZXR1cm5GYWxzZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmV0dXJuRmFsc2VcbiIsInZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxuXG52YXIgUm90YXRlID0gZnVuY3Rpb24odmFsdWVzLCB2YWx1ZSkge1xuICB2YXIgaXNWYWxpZFZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZXMuaW5kZXhPZih2KSAhPSAtMVxuICB9XG4gIFxuICB2YXIgY2hlY2tWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoIWlzVmFsaWRWYWx1ZSh2KSkge1xuICAgICAgdGhyb3cgXCJpbnZhbGlkIHZhbHVlOiBcIiArIHZcbiAgICB9XG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSBPYnNlcnZhYmxlKHZhbHVlKVxuICBcbiAgcm90YXRlLmdldFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB2YWx1ZXNcbiAgfVxuICBcbiAgdmFyIF9zZXQgPSByb3RhdGUuc2V0XG4gIHJvdGF0ZS5zZXQgPSBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICBjaGVja1ZhbHVlKG5ld192YWx1ZSlcbiAgICBfc2V0KG5ld192YWx1ZSlcbiAgfVxuICBcbiAgcm90YXRlLnJvdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpZHggPSB2YWx1ZXMuaW5kZXhPZihyb3RhdGUuZ2V0KCkpXG4gICAgaWR4ID0gKGlkeCArIDEpICUgdmFsdWVzLmxlbmd0aFxuICAgIHJvdGF0ZS5zZXQodmFsdWVzW2lkeF0pXG4gIH1cbiAgXG4gIHJldHVybiByb3RhdGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSb3RhdGVcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIERpYWxvZyA9IHJlcXVpcmUoXCIuL2RpYWxvZ1wiKVxuXG52YXIgU2VsZWN0RW5jb2RpbmdEaWFsb2dWaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgdmFyICRjb250ZW50ID0gJCgnPGRpdj4nKS5hcHBlbmQoXG4gICAgJCgnPHNlbGVjdCBzaXplPVwiNFwiPicpLFxuICAgICQoJzxidXR0b24gY2xhc3M9XCJva1wiPk9LPC9idXR0b24+JyksXG4gICAgJCgnPGJ1dHRvbiBjbGFzcz1cImNhbmNlbFwiPkNhbmNlbDwvYnV0dG9uPicpXG4gIClcbiAgXG4gIHZhciAkZGlhbG9nID0gRGlhbG9nLnZpZXcoJGNvbnRlbnQsIFwic2VsZWN0LWVuY29kaW5nLWRpYWxvZ1wiKVxuXG4gIHZhciAkc2VsZWN0ID0gJGNvbnRlbnQuZmluZChcInNlbGVjdFwiKVxuICAkc2VsZWN0LmFwcGVuZChtb2RlbC5vcHRpb25zLm1hcChmdW5jdGlvbihlbmNvZGluZykge1xuICAgIHJldHVybiAkKCc8b3B0aW9uPicpLnRleHQoZW5jb2RpbmcpXG4gIH0pKVxuICBtb2RlbC5lbmNvZGluZy5vYnNlcnZlKGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHNlbGVjdC52YWwoZW5jb2RpbmcpXG4gIH0pXG4gICRzZWxlY3QudmFsKG1vZGVsLmVuY29kaW5nLmdldCgpKVxuICAkc2VsZWN0LmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLmVuY29kaW5nLnNldCgkc2VsZWN0LnZhbCgpKVxuICB9KVxuICBcbiAgLy8gb2tcbiAgJGNvbnRlbnQuZmluZChcImJ1dHRvbi5va1wiKS5jbGljayhtb2RlbC5jb25maXJtKVxuICBcbiAgLy8gY2FuY2VsXG4gICRjb250ZW50LmZpbmQoXCJidXR0b24uY2FuY2VsXCIpLmNsaWNrKG1vZGVsLmhpZGUpXG4gIFxuICBtb2RlbC52aXNpYmxlLm9ic2VydmUoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAkZGlhbG9nLmFkZENsYXNzKFwidmlzaWJsZVwiKVxuICAgICAgJGNvbnRlbnQuZmluZChcImlucHV0LCBzZWxlY3RcIikuZm9jdXMoKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICRkaWFsb2cucmVtb3ZlQ2xhc3MoXCJ2aXNpYmxlXCIpXG4gICAgfVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdEVuY29kaW5nRGlhbG9nVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcblxudmFyIFNlbGVjdEVuY29kaW5nRGlhbG9nID0gZnVuY3Rpb24oKSB7XG4gIFxuICB2YXIgZGlhbG9nID0ge1xuICAgIHZpc2libGU6IE9ic2VydmFibGUoZmFsc2UpLFxuICAgIGVuY29kaW5nOiBPYnNlcnZhYmxlKCksXG4gICAgb3B0aW9uczogW1xuICAgICAgXCJVVEYtOFwiLFxuICAgICAgXCJFVUMtSlBcIixcbiAgICAgIFwiU0pJUy1XSU5cIixcbiAgICBdLFxuICAgIGNvbmZpcm1lZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIGNvbmZpcm06IGZ1bmN0aW9uKCkge1xuICAgICAgZGlhbG9nLnZpc2libGUuc2V0KGZhbHNlKVxuICAgICAgZGlhbG9nLmNvbmZpcm1lZC5kaXNwYXRjaChkaWFsb2cuZW5jb2RpbmcuZ2V0KCkpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbihlbmNvZGluZykge1xuICAgICAgZGlhbG9nLmVuY29kaW5nLnNldChlbmNvZGluZylcbiAgICAgIGRpYWxvZy52aXNpYmxlLnNldCh0cnVlKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICBkaWFsb2cudmlzaWJsZS5zZXQoZmFsc2UpXG4gICAgfSxcbiAgfVxuICByZXR1cm4gZGlhbG9nXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0RW5jb2RpbmdEaWFsb2dcbiIsInZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG52YXIgRWRpdG9yTWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci1tYW5hZ2VyXCIpXG52YXIgRmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyXCIpXG52YXIgTWFpblZpZXcgPSByZXF1aXJlKFwiLi9tYWluLXZpZXdcIilcblxubW9kdWxlLmV4cG9ydHMucnVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmaW5kZXIgPSBGaW5kZXIoKVxuICB2YXIgZWRpdG9yX21nciA9IEVkaXRvck1hbmFnZXIoZmluZGVyKVxuICB2YXIgdmlldyA9IE1haW5WaWV3KGVkaXRvcl9tZ3IsIGZpbmRlcilcbiAgXG4gIHZhciBzYXZlRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmlsZXMgPSBlZGl0b3JfbWdyLmdldEZpbGVzKClcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm9wZW4tZmlsZXNcIiwgSlNPTi5zdHJpbmdpZnkoZmlsZXMpKVxuICB9XG4gIHZhciBsb2FkRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm9wZW4tZmlsZXNcIikgfHwgXCJbXVwiKVxuICB9XG4gIGxvYWRGaWxlTGlzdCgpLmZvckVhY2goZnVuY3Rpb24ocGF0aCkge1xuICAgIGVkaXRvcl9tZ3Iub3BlbihwYXRoKVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5vcGVuZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgZWRpdG9yX21nci5jbG9zZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgXG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zaG93KClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG59XG4iXX0=
=======
  Mousetrap.bind(["mod+o", "mod+p"], function () {
    finder.show();
    return false;
  }, "keydown");
};

<<<<<<< HEAD
},{"./editor-manager":10,"./finder":20,"./main-view":23,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZGlhbG9nLmpzIiwianMvZWRpdG9yLW1hbmFnZXItdmlldy5qcyIsImpzL2VkaXRvci1tYW5hZ2VyLmpzIiwianMvZWRpdG9yLXZpZXcuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9lb2wuanMiLCJqcy9maWxlLXRhYi1saXN0LmpzeCIsImpzL2ZpbGUtdGFiLmpzeCIsImpzL2ZpbGUuanMiLCJqcy9maW5kZXItc3VnZ2VzdC12aWV3LmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXItdmlldy5qcyIsImpzL2ZpbmRlci5qcyIsImpzL2luZGVudC5qcyIsImpzL2lucHV0LXdhdGNoZXIuanMiLCJqcy9tYWluLXZpZXcuanMiLCJqcy9vYnNlcnZhYmxlLmpzIiwianMvcmV0dXJuLWZhbHNlLmpzIiwianMvcm90YXRlLmpzIiwianMvc2VsZWN0LWVuY29kaW5nLWRpYWxvZy12aWV3LmpzIiwianMvc2VsZWN0LWVuY29kaW5nLWRpYWxvZy5qcyIsImpzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQUksYUFBYSxRQUFRLFlBQVIsQ0FBakI7O0FBRUEsSUFBSSxtQkFBbUIsU0FBbkIsZ0JBQW1CLENBQVMsRUFBVCxFQUFhLE1BQWIsRUFBcUI7QUFDMUMsTUFBSSxPQUFPLE1BQVAsSUFBaUIsT0FBckIsRUFBOEI7QUFDNUI7QUFDRDtBQUNELE1BQUksV0FBVyxNQUFYLENBQWtCLE9BQU8sSUFBekIsRUFBK0IsT0FBTyxFQUF0QyxDQUFKLEVBQStDO0FBQzdDO0FBQ0Q7QUFDRDtBQUNBLE1BQUksT0FBTyxHQUFHLE9BQUgsQ0FBVyxPQUFPLElBQVAsQ0FBWSxJQUF2QixDQUFYO0FBQ0EsTUFBSSxLQUFLLE1BQUwsSUFBZSxPQUFPLElBQVAsQ0FBWSxFQUEvQixFQUFtQztBQUNqQztBQUNEO0FBQ0Q7QUFDQSxNQUFJLEtBQUssS0FBTCxDQUFXLFFBQVgsQ0FBSixFQUEwQjtBQUN4QjtBQUNEO0FBQ0Q7QUFDQSxNQUFJLE9BQU8sSUFBUCxDQUFZLE9BQU8sSUFBUCxDQUFZLE1BQVosR0FBcUIsQ0FBakMsS0FBdUMsRUFBM0MsRUFBK0M7QUFDN0MsV0FBTyxJQUFQLENBQVksR0FBWjtBQUNEO0FBQ0QsTUFBSSxjQUFjLE9BQU8sSUFBUCxDQUFZLENBQVosRUFBZSxLQUFmLENBQXFCLFNBQXJCLEVBQWdDLENBQWhDLENBQWxCO0FBQ0EsU0FBTyxJQUFQLEdBQWMsT0FBTyxJQUFQLENBQVksR0FBWixDQUFnQixVQUFTLElBQVQsRUFBZSxDQUFmLEVBQWtCO0FBQzlDLFdBQU8sS0FBSyxLQUFMLENBQVcsZUFBWCxDQUFQO0FBQ0EsUUFBSSxTQUFTLEtBQUssQ0FBTCxDQUFiO0FBQ0EsUUFBSSxPQUFPLEtBQUssQ0FBTCxDQUFYO0FBQ0EsYUFBUyxDQUFDLE9BQU8sTUFBUixFQUFnQixNQUFoQixDQUF1QixDQUF2QixFQUEwQixLQUFLLE1BQUwsR0FBYyxPQUFPLE1BQXJCLEdBQThCLFlBQVksTUFBcEUsQ0FBVDtBQUNBLFdBQU8sU0FBUyxJQUFoQjtBQUNELEdBTmEsQ0FBZDtBQU9BLFNBQU8sSUFBUCxDQUFZLENBQVosSUFBaUIsT0FBTyxJQUFQLENBQVksQ0FBWixFQUFlLE1BQWYsQ0FBc0IsS0FBSyxNQUEzQixDQUFqQjtBQUNELENBN0JEOztBQStCQSxPQUFPLE9BQVAsR0FBaUIsZ0JBQWpCOzs7OztBQ2pDQSxJQUFJLGFBQWEsUUFBUSxZQUFSLENBQWpCO0FBQ0EsSUFBSSxJQUFJLFFBQVEsWUFBUixDQUFSO0FBQ0EsUUFBUSxrQkFBUjtBQUNBLFFBQVEsUUFBUjtBQUNBLFFBQVEsZUFBUjtBQUNBLFFBQVEsZUFBUjtBQUNBLFFBQVEsb0JBQVI7QUFDQSxRQUFRLGFBQVI7O0FBRUEsT0FBTyxNQUFQLENBQWMsV0FBVyxRQUF6QixFQUFtQztBQUNqQyxlQUFhLElBRG9CO0FBRWpDLFdBQVMsQ0FGd0I7QUFHakMsMkJBQXlCLElBSFE7QUFJakMscUJBQW1CLElBSmM7QUFLakMsaUJBQWUsSUFMa0I7QUFNakMsYUFBVyxJQU5zQjtBQU9qQyxpQkFBZSxJQVBrQjtBQVFqQyxtQkFBaUIsRUFBQyxVQUFVLElBQVgsRUFSZ0I7QUFTakMscUJBQW1CLElBVGM7QUFVakMsWUFBVSxLQVZ1QjtBQVdqQyxhQUFXO0FBQ1Qsa0JBQWMsY0FETDtBQUVULGNBQVUsY0FGRDtBQUdULGNBQVUsZUFIRDtBQUlULGFBQVMsZUFKQTtBQUtULFdBQU8sWUFMRTtBQU1ULGNBQVUsS0FORDtBQU9ULGFBQVM7QUFQQTtBQVhzQixDQUFuQzs7QUFzQkEsV0FBVyxjQUFYLENBQTBCLFVBQVMsRUFBVCxFQUFhO0FBQ3JDO0FBQ0EsS0FBRyxFQUFILENBQU0sY0FBTixFQUFzQixRQUFRLHNCQUFSLENBQXRCOztBQUVBO0FBQ0EsTUFBSSxRQUFRLEdBQUcsYUFBSCxFQUFaO0FBQ0EsUUFBTSxTQUFOLElBQW1CLFlBQW5CLENBTnFDLENBTUw7QUFDaEMsTUFBSSxTQUFTO0FBQ1gsYUFBUyxZQURFO0FBRVgsYUFBUyxhQUZFO0FBR1gsYUFBUyxlQUhFO0FBSVgsYUFBUyxjQUpFO0FBS1gsYUFBUyxNQUxFO0FBTVgsYUFBUyxZQU5FO0FBT1gsYUFBUyxZQVBFO0FBUVgsbUJBQWU7QUFSSixHQUFiO0FBVUEsSUFBRSxJQUFGLENBQU8sTUFBUCxFQUFlLFVBQVMsT0FBVCxFQUFrQixHQUFsQixFQUF1QjtBQUNwQyxjQUFVLEtBQVYsRUFBaUIsSUFBakIsQ0FBc0IsR0FBdEIsRUFBMkIsWUFBVztBQUNwQyxTQUFHLFdBQUgsQ0FBZSxPQUFmO0FBQ0EsYUFBTyxLQUFQO0FBQ0QsS0FIRDtBQUlELEdBTEQ7QUFNRCxDQXZCRDs7QUF5QkEsT0FBTyxPQUFQLEdBQWlCLFVBQWpCOzs7OztBQ3hEQSxJQUFJLGFBQWEsUUFBUSxZQUFSLENBQWpCOztBQUVBLFdBQVcsY0FBWCxDQUEwQixVQUFTLEVBQVQsRUFBYTtBQUNyQyxLQUFHLEtBQUgsR0FBVyxFQUFYO0FBQ0QsQ0FGRDs7QUFJQSxXQUFXLFFBQVgsQ0FBb0IsSUFBcEIsR0FBMkIsVUFBUyxFQUFULEVBQWE7QUFDdEMsTUFBSSxTQUFTLEdBQUcsU0FBSCxFQUFiO0FBQ0EsTUFBSSxNQUFNLE1BQVYsRUFBa0I7QUFDaEIsUUFBSSxPQUFPLEdBQUcsS0FBSCxDQUFTLEdBQUcsS0FBSCxDQUFTLE1BQVQsR0FBa0IsQ0FBM0IsQ0FBWDtBQUNBLFFBQUksS0FBSyxJQUFMLElBQWEsT0FBTyxJQUFwQixJQUE0QixLQUFLLEVBQUwsSUFBVyxPQUFPLEVBQWxELEVBQXNEO0FBQ3BELFNBQUcsYUFBSCxDQUFpQixHQUFHLEtBQUgsQ0FBUyxHQUFULENBQWEsVUFBUyxDQUFULEVBQVk7QUFDeEMsZUFBTyxFQUFDLE1BQU0sQ0FBUCxFQUFVLFFBQVEsQ0FBbEIsRUFBUDtBQUNELE9BRmdCLENBQWpCLEVBRUksR0FBRyxLQUFILENBQVMsTUFBVCxHQUFrQixDQUZ0QjtBQUdBLFNBQUcsS0FBSCxHQUFXLEVBQVg7QUFDQTtBQUNEO0FBQ0Y7QUFDRCxLQUFHLEtBQUgsQ0FBUyxJQUFULENBQWMsTUFBZDtBQUNELENBYkQ7Ozs7O0FDTkEsSUFBSSxhQUFhLFFBQVEsWUFBUixDQUFqQjs7QUFFQSxXQUFXLFFBQVgsQ0FBb0IsVUFBcEIsR0FBaUMsVUFBUyxFQUFULEVBQWE7QUFDNUMsS0FBRyxhQUFILENBQ0UsR0FBRyxjQUFILEdBQW9CLEdBQXBCLENBQXdCLFVBQVMsQ0FBVCxFQUFZO0FBQ2xDLFdBQU87QUFDTCxjQUFRO0FBQ04sY0FBTSxFQUFFLElBQUYsQ0FBTyxJQUFQLEdBQWMsQ0FEZDtBQUVOLFlBQUk7QUFGRSxPQURIO0FBS0wsWUFBTTtBQUNKLGNBQU0sRUFBRSxNQUFGLENBQVMsSUFEWDtBQUVKLFlBQUk7QUFGQTtBQUxELEtBQVA7QUFVRCxHQVhELENBREY7QUFjRCxDQWZEOzs7OztBQ0ZBLElBQUksYUFBYSxRQUFRLFlBQVIsQ0FBakI7O0FBRUEsV0FBVyxRQUFYLENBQW9CLFVBQXBCLEdBQWlDLFVBQVMsRUFBVCxFQUFhO0FBQzVDLEtBQUcsYUFBSCxDQUNFLEdBQUcsY0FBSCxHQUFvQixHQUFwQixDQUF3QixVQUFTLENBQVQsRUFBWTtBQUNsQyxXQUFPLEdBQUcsVUFBSCxDQUFjLEVBQUUsTUFBaEIsQ0FBUDtBQUNELEdBRkQsQ0FERjtBQUtELENBTkQ7Ozs7O0FDRkEsSUFBSSxhQUFhLFFBQVEsWUFBUixDQUFqQjs7QUFFQSxXQUFXLFFBQVgsQ0FBb0IsY0FBcEIsR0FBcUMsVUFBUyxFQUFULEVBQWE7QUFDaEQsTUFBSSxhQUFhLEdBQUcsY0FBSCxFQUFqQjtBQUNBLE1BQUksV0FBVyxNQUFYLElBQXFCLENBQXpCLEVBQTRCO0FBQzFCO0FBQ0E7QUFDRDtBQUNELE1BQUksU0FBUyxXQUFXLENBQVgsRUFBYyxNQUEzQjtBQUNBLE1BQUksT0FBTyxXQUFXLENBQVgsRUFBYyxJQUF6QjtBQUNBLE1BQUksaUJBQWlCLEVBQXJCO0FBQ0EsT0FBSyxJQUFJLElBQUksT0FBTyxJQUFwQixFQUEwQixLQUFLLEtBQUssSUFBcEMsRUFBMEMsRUFBRSxDQUE1QyxFQUErQztBQUM3QyxtQkFBZSxJQUFmLENBQW9CO0FBQ2xCLGNBQVE7QUFDTixjQUFNLENBREE7QUFFTixZQUFJLEtBQUssT0FBTyxJQUFaLEdBQW1CLE9BQU8sRUFBMUIsR0FBK0I7QUFGN0IsT0FEVTtBQUtsQixZQUFNO0FBQ0osY0FBTSxDQURGO0FBRUosWUFBSSxLQUFLLEtBQUssSUFBVixHQUFpQixLQUFLLEVBQXRCLEdBQTJCO0FBRjNCO0FBTFksS0FBcEI7QUFVRDtBQUNELEtBQUcsYUFBSCxDQUFpQixjQUFqQjtBQUNELENBdEJEOzs7OztBQ0ZBLElBQUksYUFBYSxRQUFRLFlBQVIsQ0FBakI7O0FBRUEsV0FBVyxnQkFBWCxDQUE0QixNQUE1QixFQUFvQztBQUNsQyxTQUFPLEVBRDJCO0FBRWxDLFdBQVMsRUFGeUI7QUFHbEMsUUFBTTtBQUg0QixDQUFwQzs7Ozs7QUNGQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7O0FBRUEsSUFBSSxPQUFPLFNBQVAsSUFBTyxDQUFTLE9BQVQsRUFBa0I7QUFDM0IsTUFBSSxRQUFRLFNBQVIsS0FBUSxHQUFXO0FBQ3JCLGFBQVMsTUFBVDtBQUNELEdBRkQ7QUFHQSxTQUFPLEtBQVA7QUFDRCxDQUxEOztBQU9BLElBQUksT0FBTyxTQUFQLElBQU8sQ0FBUyxPQUFULEVBQWtCLFVBQWxCLEVBQThCO0FBQ3ZDLE1BQUksV0FBVyxFQUFFLHdCQUFGLEVBQTRCLFFBQTVCLENBQXFDLFNBQVMsSUFBOUMsQ0FBZjtBQUNBLE1BQUksU0FBUyxFQUFFLHNCQUFGLEVBQTBCLFFBQTFCLENBQW1DLFFBQW5DLENBQWI7QUFDQSxTQUFPLFFBQVAsQ0FBZ0IsVUFBaEI7QUFDQSxTQUFPLE1BQVAsQ0FBYyxPQUFkO0FBQ0EsU0FBTyxRQUFQO0FBQ0QsQ0FORDs7QUFRQSxPQUFPLE9BQVAsQ0FBZSxJQUFmLEdBQXNCLElBQXRCOzs7OztBQ2pCQSxJQUFNLFFBQVEsUUFBUSxPQUFSLENBQWQ7QUFDQSxJQUFNLFdBQVcsUUFBUSxXQUFSLENBQWpCO0FBQ0EsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSO0FBQ0EsSUFBSSxJQUFJLFFBQVEsWUFBUixDQUFSO0FBQ0EsSUFBSSxhQUFhLFFBQVEsZUFBUixDQUFqQjtBQUNBLElBQU0sY0FBYyxRQUFRLHFCQUFSLENBQXBCOztBQUVBLElBQUksb0JBQW9CLFNBQXBCLGlCQUFvQixDQUFTLEtBQVQsRUFBZ0IsVUFBaEIsRUFBNEI7QUFDbEQsTUFBSSxRQUFRLEVBQUUsT0FBRixFQUFXLElBQVgsQ0FBZ0IsSUFBaEIsRUFBc0IsT0FBdEIsRUFBK0IsUUFBL0IsQ0FBd0MsS0FBeEMsQ0FBWjtBQUNBLE1BQUksV0FBVyxFQUFFLE9BQUYsRUFBVyxJQUFYLENBQWdCLElBQWhCLEVBQXNCLFNBQXRCLEVBQWlDLFFBQWpDLENBQTBDLEtBQTFDLENBQWY7O0FBRUEsTUFBTSxTQUFTLFNBQVQsTUFBUyxHQUFXO0FBQ3hCLGFBQVMsTUFBVCxDQUVJLG9CQUFDLFdBQUQ7QUFDRSxpQkFBVztBQURiLE1BRkosRUFNRSxNQUFNLENBQU4sQ0FORjtBQVFELEdBVEQ7O0FBV0EsYUFBVyxNQUFYLENBQWtCLEdBQWxCLENBQXNCLFVBQVMsTUFBVCxFQUFpQjtBQUNyQyxRQUFNLE9BQU8sT0FBTyxPQUFQLEVBQWI7QUFDQTtBQUNBLFdBQU8sTUFBUCxDQUFjLE9BQWQsQ0FBc0IsWUFBTTtBQUMxQjtBQUNELEtBRkQ7QUFHQTtBQUNBLFFBQUksVUFBVSxFQUFFLE9BQUYsRUFBVyxRQUFYLENBQW9CLFFBQXBCLEVBQThCLFFBQTlCLENBQXVDLFFBQXZDLENBQWQ7QUFDQSxRQUFJLGNBQWMsV0FBVyxPQUFYLEVBQW9CLE1BQXBCLEVBQTRCLFVBQTVCLENBQWxCOztBQUVBLFlBQVEsSUFBUixJQUFnQjtBQUNkLGVBQVM7QUFESyxLQUFoQjtBQUdELEdBYkQ7O0FBZUEsYUFBVyxNQUFYLENBQWtCLEdBQWxCLENBQXNCLFVBQVMsSUFBVCxFQUFlO0FBQ25DO0FBQ0EsWUFBUSxJQUFSLEVBQWMsT0FBZCxDQUFzQixNQUF0QjtBQUNBLFdBQU8sUUFBUSxJQUFSLENBQVA7QUFDRCxHQUpEOztBQU1BLGFBQVcsU0FBWCxDQUFxQixHQUFyQixDQUF5QixNQUF6QjtBQUNELENBckNEOztBQXVDQSxPQUFPLE9BQVAsR0FBaUIsaUJBQWpCOzs7OztBQzlDQSxJQUFJLFVBQVUsUUFBUSxTQUFSLENBQWQ7QUFDQSxJQUFJLElBQUksUUFBUSxZQUFSLENBQVI7QUFDQSxJQUFJLE9BQU8sUUFBUSxRQUFSLENBQVg7QUFDQSxJQUFJLFNBQVMsUUFBUSxVQUFSLENBQWI7O0FBRUEsSUFBSSxnQkFBZ0IsU0FBaEIsYUFBZ0IsQ0FBUyxNQUFULEVBQWlCO0FBQ25DLE1BQUksUUFBUTtBQUNWLFlBQVEsSUFBSSxRQUFRLE1BQVosRUFERTtBQUVWLFlBQVEsSUFBSSxRQUFRLE1BQVosRUFGRTtBQUdWLGVBQVcsSUFBSSxRQUFRLE1BQVosRUFIRDs7QUFLVixZQUFRLElBTEUsRUFLSTtBQUNkLGFBQVMsRUFOQzs7QUFRVixjQUFVLG9CQUFXO0FBQ25CLGFBQU8sTUFBTSxPQUFOLENBQWMsR0FBZCxDQUFrQixVQUFTLE1BQVQsRUFBaUI7QUFDeEMsZUFBTyxPQUFPLE9BQVAsRUFBUDtBQUNELE9BRk0sQ0FBUDtBQUdELEtBWlM7O0FBY1YsVUFBTSxjQUFTLElBQVQsRUFBZTtBQUNuQixVQUFJLFNBQVMsSUFBYixFQUFtQjtBQUNqQixjQUFNLGtCQUFOO0FBQ0Q7QUFDRDtBQUNBLFVBQUksTUFBTSxRQUFOLENBQWUsSUFBZixDQUFKLEVBQTBCO0FBQ3hCO0FBQ0Q7QUFDRCxVQUFJLFNBQVMsT0FBTyxLQUFLLElBQUwsQ0FBUCxDQUFiO0FBQ0EsYUFBTyxJQUFQLEdBQWMsSUFBZCxDQUFtQixZQUFXO0FBQzVCLGNBQU0sT0FBTixDQUFjLElBQWQsQ0FBbUIsTUFBbkI7QUFDQSxjQUFNLE1BQU4sQ0FBYSxRQUFiLENBQXNCLE1BQXRCO0FBQ0EsY0FBTSxRQUFOLENBQWUsSUFBZjtBQUNELE9BSkQ7QUFLRCxLQTVCUzs7QUE4QlYsZUFBVyxxQkFBVztBQUNwQixhQUFPLE1BQU0sTUFBYjtBQUNELEtBaENTOztBQWtDVixjQUFVLGtCQUFTLElBQVQsRUFBZTtBQUN2QixVQUFJLFNBQVMsTUFBTSxNQUFuQixFQUEyQjtBQUN6QixlQUFPLElBQVA7QUFDRDtBQUNELFVBQUksU0FBUyxJQUFULElBQWlCLE1BQU0sT0FBTixDQUFjLElBQWQsS0FBdUIsQ0FBQyxDQUE3QyxFQUFnRDtBQUM5QyxlQUFPLEtBQVA7QUFDRDtBQUNELFlBQU0sTUFBTixHQUFlLElBQWY7QUFDQSxZQUFNLFNBQU4sQ0FBZ0IsUUFBaEIsQ0FBeUIsSUFBekI7QUFDQSxhQUFPLE9BQVAsQ0FBZSxJQUFmO0FBQ0EsYUFBTyxJQUFQO0FBQ0QsS0E3Q1M7O0FBK0NWLGNBQVUsb0JBQVc7QUFDbkIsWUFBTSxVQUFOLENBQWlCLElBQWpCO0FBQ0QsS0FqRFM7O0FBbURWLGNBQVUsb0JBQVc7QUFDbkIsWUFBTSxVQUFOLENBQWlCLEtBQWpCO0FBQ0QsS0FyRFM7O0FBdURWLGdCQUFZLG9CQUFTLElBQVQsRUFBZTtBQUN6QixVQUFJLE1BQU0sT0FBTixDQUFjLE1BQWQsSUFBd0IsQ0FBNUIsRUFBK0I7QUFDN0I7QUFDRDtBQUNELFVBQUksR0FBSjtBQUNBLFVBQUksTUFBTSxNQUFOLEtBQWlCLElBQXJCLEVBQTJCO0FBQ3pCLGNBQU0sT0FBTyxDQUFQLEdBQVcsTUFBTSxPQUFOLENBQWMsTUFBZCxHQUF1QixDQUF4QztBQUNELE9BRkQsTUFHSztBQUNILGNBQU0sTUFBTSxPQUFOLENBQWMsTUFBTSxNQUFwQixDQUFOO0FBQ0EsZUFBTyxPQUFPLENBQUMsQ0FBUixHQUFZLENBQUMsQ0FBcEI7QUFDQSxjQUFNLENBQUMsTUFBTSxNQUFNLE9BQU4sQ0FBYyxNQUFyQixJQUErQixNQUFNLE9BQU4sQ0FBYyxNQUFuRDtBQUNEO0FBQ0QsWUFBTSxRQUFOLENBQWUsTUFBTSxPQUFOLENBQWMsR0FBZCxFQUFtQixPQUFuQixFQUFmO0FBQ0QsS0FyRVM7O0FBdUVWLFdBQU8sZUFBUyxJQUFULEVBQWU7QUFDcEIsVUFBSSxNQUFNLE1BQU0sT0FBTixDQUFjLElBQWQsQ0FBVjtBQUNBLFVBQUksT0FBTyxDQUFDLENBQVosRUFBZTtBQUNiO0FBQ0Q7QUFDRCxVQUFJLFNBQVMsTUFBTSxNQUFuQixFQUEyQjtBQUN6QixZQUFJLE1BQU0sT0FBTixDQUFjLE1BQWQsSUFBd0IsQ0FBNUIsRUFBK0I7QUFDN0IsZ0JBQU0sUUFBTixDQUFlLElBQWY7QUFDRCxTQUZELE1BR0s7QUFDSCxnQkFBTSxRQUFOO0FBQ0Q7QUFDRjtBQUNELFlBQU0sT0FBTixDQUFjLE1BQWQsQ0FBcUIsR0FBckIsRUFBMEIsQ0FBMUI7QUFDQSxZQUFNLE1BQU4sQ0FBYSxRQUFiLENBQXNCLElBQXRCO0FBQ0QsS0F0RlM7O0FBd0ZWLFlBQVEsZ0JBQVMsSUFBVCxFQUFlO0FBQ3JCLFlBQU0sS0FBTixDQUFZLElBQVo7QUFDQSxZQUFNLElBQU4sQ0FBVyxJQUFYO0FBQ0QsS0EzRlM7O0FBNkZWLGFBQVMsaUJBQVMsSUFBVCxFQUFlO0FBQ3RCLGFBQU8sTUFBTSxRQUFOLEdBQWlCLE9BQWpCLENBQXlCLElBQXpCLENBQVA7QUFDRDtBQS9GUyxHQUFaOztBQWtHQSxTQUFPLFFBQVAsQ0FBZ0IsR0FBaEIsQ0FBb0IsTUFBTSxJQUExQjs7QUFFQSxTQUFPLEtBQVA7QUFDRCxDQXRHRDs7QUF3R0EsT0FBTyxPQUFQLEdBQWlCLGFBQWpCOzs7OztBQzdHQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7QUFDQSxJQUFJLGFBQWEsUUFBUSxjQUFSLENBQWpCO0FBQ0EsSUFBSSwyQkFBMkIsUUFBUSwrQkFBUixDQUEvQjs7QUFFQSxJQUFJLGFBQWEsU0FBYixVQUFhLENBQVMsS0FBVCxFQUFnQixNQUFoQixFQUF3QixVQUF4QixFQUFvQztBQUNuRCxNQUFJLE9BQU8sT0FBTyxPQUFQLEVBQVg7O0FBRUEsTUFBSSxLQUFLLFdBQVcsTUFBTSxDQUFOLENBQVgsRUFBcUI7QUFDNUIsV0FBTyxPQUFPLElBQVAsQ0FBWSxHQUFaLEVBRHFCO0FBRTVCLFVBQU0sT0FBTyxJQUFQLENBQVksR0FBWjtBQUZzQixHQUFyQixDQUFUOztBQUtBO0FBQ0EsUUFBTSxNQUFOLENBQ0UsRUFBRSwyQkFBRixFQUErQixNQUEvQixDQUNFLEVBQUUsOEJBQUYsQ0FERixFQUVFLEVBQUUsbURBQUYsQ0FGRixFQUdFLEVBQUUsZ0RBQUYsQ0FIRixFQUlFLEVBQUUscURBQUYsQ0FKRixFQUtFLEVBQUUsMkJBQUYsQ0FMRixDQURGOztBQVVBLDJCQUNFLE9BQU8sc0JBRFQ7O0FBSUE7QUFDQSxNQUFJLGtCQUFrQixHQUFHLGdCQUFILENBQW9CLElBQXBCLENBQXRCO0FBQ0EsTUFBSSxPQUFPLFNBQVAsSUFBTyxHQUFXO0FBQ3BCLFFBQUksYUFBYSxHQUFHLGdCQUFILENBQW9CLElBQXBCLENBQWpCO0FBQ0EsV0FBTyxJQUFQLEdBQWMsSUFBZCxDQUFtQixZQUFXO0FBQzVCLHdCQUFrQixVQUFsQjtBQUNELEtBRkQ7QUFHRCxHQUxEO0FBTUEsS0FBRyxFQUFILENBQU0sU0FBTixFQUFpQixZQUFXO0FBQzFCLFdBQU8sSUFBUCxDQUFZLEdBQVosQ0FBZ0IsR0FBRyxRQUFILEVBQWhCO0FBQ0EsV0FBTyxNQUFQLENBQWMsR0FBZCxDQUNFLEdBQUcsT0FBSCxDQUFXLGVBQVgsSUFBOEIsT0FBOUIsR0FBd0MsVUFEMUM7QUFHRCxHQUxEO0FBTUEsU0FBTyxJQUFQLENBQVksT0FBWixDQUFvQixVQUFTLElBQVQsRUFBZTtBQUNqQyxRQUFJLFFBQVEsR0FBRyxRQUFILEVBQVosRUFBMkI7QUFDekIsU0FBRyxRQUFILENBQVksSUFBWjtBQUNEO0FBQ0YsR0FKRDs7QUFNQTtBQUNBLE1BQUksYUFBYSxTQUFiLFVBQWEsQ0FBUyxJQUFULEVBQWU7QUFDOUIsT0FBRyxTQUFILENBQWEsTUFBYixFQUFxQixJQUFyQjtBQUNBLGVBQVcsY0FBWCxDQUEwQixXQUExQixFQUF1QyxJQUF2QyxFQUE2QyxJQUE3QztBQUNBLFVBQU0sSUFBTixDQUFXLGNBQVgsRUFBMkIsSUFBM0IsQ0FBZ0MsSUFBaEM7QUFDRCxHQUpEO0FBS0EsU0FBTyxJQUFQLENBQVksT0FBWixDQUFvQixVQUFwQjtBQUNBLGFBQVcsT0FBTyxJQUFQLENBQVksR0FBWixFQUFYOztBQUVBO0FBQ0EsTUFBSSxlQUFlLFNBQWYsWUFBZSxDQUFTLElBQVQsRUFBZTtBQUNoQyxVQUFNLElBQU4sQ0FBVyxnQkFBWCxFQUE2QixJQUE3QixDQUFrQyxJQUFsQztBQUNBLFFBQUksUUFBUSxLQUFaLEVBQW1CO0FBQ2pCLFNBQUcsU0FBSCxDQUFhLGdCQUFiLEVBQStCLElBQS9CO0FBQ0EsU0FBRyxTQUFILENBQWEsWUFBYixFQUEyQixDQUEzQjtBQUNELEtBSEQsTUFJSztBQUNILFNBQUcsU0FBSCxDQUFhLGdCQUFiLEVBQStCLEtBQS9CO0FBQ0EsU0FBRyxTQUFILENBQWEsWUFBYixFQUEyQixPQUFPLEtBQUssT0FBTCxDQUFhLElBQWIsRUFBbUIsRUFBbkIsQ0FBUCxDQUEzQjtBQUNEO0FBQ0YsR0FWRDtBQVdBLFNBQU8sTUFBUCxDQUFjLE9BQWQsQ0FBc0IsWUFBdEI7QUFDQSxlQUFhLE9BQU8sTUFBUCxDQUFjLEdBQWQsRUFBYjtBQUNBLFFBQU0sSUFBTixDQUFXLGdCQUFYLEVBQTZCLEtBQTdCLENBQW1DLFlBQVc7QUFDNUMsV0FBTyxNQUFQLENBQWMsTUFBZDtBQUNELEdBRkQ7O0FBSUE7QUFDQSxNQUFJLFlBQVksU0FBWixTQUFZLENBQVMsR0FBVCxFQUFjO0FBQzVCLFFBQUksUUFBUTtBQUNWLFlBQU0sSUFESTtBQUVWLFlBQU0sSUFGSTtBQUdWLGNBQVE7QUFIRSxLQUFaO0FBS0EsVUFBTSxJQUFOLENBQVcsYUFBWCxFQUEwQixJQUExQixDQUErQixNQUFNLEdBQU4sQ0FBL0I7QUFDRCxHQVBEO0FBUUEsT0FBSyxHQUFMLENBQVMsT0FBVCxDQUFpQixTQUFqQjtBQUNBLFlBQVUsS0FBSyxHQUFMLENBQVMsR0FBVCxFQUFWO0FBQ0EsUUFBTSxJQUFOLENBQVcsYUFBWCxFQUEwQixLQUExQixDQUFnQyxZQUFXO0FBQ3pDLFNBQUssR0FBTCxDQUFTLE1BQVQ7QUFDRCxHQUZEOztBQUlBO0FBQ0EsTUFBSSxpQkFBaUIsU0FBakIsY0FBaUIsQ0FBUyxRQUFULEVBQW1CO0FBQ3RDLFVBQU0sSUFBTixDQUFXLGtCQUFYLEVBQStCLElBQS9CLENBQW9DLFFBQXBDO0FBQ0QsR0FGRDtBQUdBLE9BQUssUUFBTCxDQUFjLEdBQWQsQ0FBa0IsY0FBbEI7QUFDQSxpQkFBZSxLQUFLLFFBQUwsQ0FBYyxHQUFkLEVBQWY7QUFDQSxRQUFNLElBQU4sQ0FBVyxrQkFBWCxFQUErQixLQUEvQixDQUFxQyxZQUFXO0FBQzlDLFdBQU8sc0JBQVAsQ0FBOEIsSUFBOUIsQ0FDRSxLQUFLLFFBQUwsQ0FBYyxHQUFkLEVBREY7QUFHRCxHQUpEO0FBS0EsU0FBTyxzQkFBUCxDQUE4QixTQUE5QixDQUF3QyxHQUF4QyxDQUE0QyxVQUFTLFFBQVQsRUFBbUI7QUFDN0QsU0FBSyxRQUFMLENBQWMsR0FBZCxDQUFrQixRQUFsQjtBQUNELEdBRkQ7O0FBSUE7QUFDQSxTQUFPLE9BQVAsQ0FBZSxPQUFmLENBQXVCLFVBQVMsT0FBVCxFQUFrQjtBQUN2QyxVQUFNLElBQU4sQ0FBVyxpQkFBWCxFQUE4QixJQUE5QixDQUFtQyxPQUFuQztBQUNELEdBRkQ7O0FBSUE7QUFDQSxhQUFXLFNBQVgsQ0FBcUIsR0FBckIsQ0FBeUIsVUFBUyxNQUFULEVBQWlCO0FBQ3hDLFFBQUksVUFBVSxLQUFLLE9BQUwsRUFBZCxFQUE4QjtBQUM1QixZQUFNLFFBQU4sQ0FBZSxRQUFmO0FBQ0EsU0FBRyxLQUFIO0FBQ0EsU0FBRyxPQUFIO0FBQ0QsS0FKRCxNQUtLO0FBQ0gsWUFBTSxXQUFOLENBQWtCLFFBQWxCO0FBQ0Q7QUFDRixHQVREOztBQVdBO0FBQ0EsWUFBVSxNQUFNLENBQU4sQ0FBVixFQUFvQixJQUFwQixDQUF5QixPQUF6QixFQUFrQyxZQUFXO0FBQzNDO0FBQ0EsV0FBTyxLQUFQO0FBQ0QsR0FIRDtBQUlELENBMUhEOztBQTRIQSxPQUFPLE9BQVAsR0FBaUIsVUFBakI7Ozs7O0FDaElBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjtBQUNBLElBQUksSUFBSSxRQUFRLFlBQVIsQ0FBUjtBQUNBLElBQUksYUFBYSxRQUFRLGNBQVIsQ0FBakI7QUFDQSxJQUFJLGFBQWEsUUFBUSxjQUFSLENBQWpCO0FBQ0EsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiO0FBQ0EsSUFBSSx1QkFBdUIsUUFBUSwwQkFBUixDQUEzQjs7QUFFQSxJQUFJLFNBQVMsU0FBVCxNQUFTLENBQVMsSUFBVCxFQUFlO0FBQzFCLE1BQUksU0FBUztBQUNYLFVBQU0sV0FBVyxFQUFYLENBREs7QUFFWCxZQUFRLFdBQVcsT0FBWCxDQUZHO0FBR1gsVUFBTSxXQUFXLE1BQVgsQ0FISztBQUlYLFlBQVEsUUFKRztBQUtYLGFBQVMsV0FBVyxFQUFYLENBTEU7QUFNWCw0QkFBd0Isc0JBTmI7O0FBUVgsYUFBUyxtQkFBVztBQUNsQixhQUFPLElBQVA7QUFDRCxLQVZVOztBQVlYLGFBQVMsbUJBQVc7QUFDbEIsYUFBTyxLQUFLLE9BQUwsRUFBUDtBQUNELEtBZFU7O0FBZ0JYLFVBQU0sY0FBUyxJQUFULEVBQWU7QUFDbkIsYUFBTyxLQUFLLElBQUwsR0FBWSxJQUFaLENBQWlCLFVBQVMsSUFBVCxFQUFlO0FBQ3JDLGVBQU8sTUFBUCxDQUFjLEdBQWQsQ0FBa0IsT0FBTyxnQkFBUCxDQUF3QixJQUF4QixDQUFsQjtBQUNBLGVBQU8sSUFBUCxDQUFZLEdBQVosQ0FBZ0IsSUFBaEI7QUFDQSxlQUFPLE9BQVAsQ0FBZSxHQUFmLENBQW1CLFNBQW5CO0FBQ0QsT0FKTSxDQUFQO0FBS0QsS0F0QlU7O0FBd0JYLFVBQU0sZ0JBQVc7QUFDZixhQUFPLEtBQUssS0FBTCxDQUFXLE9BQU8sSUFBUCxDQUFZLEdBQVosRUFBWCxFQUE4QixLQUE5QixDQUFvQyxVQUFTLEtBQVQsRUFBZ0I7QUFDekQsZUFBTyxPQUFQLENBQWUsR0FBZixDQUFtQixrQkFBa0IsTUFBTSxLQUEzQztBQUNBLGVBQU8sTUFBUCxDQUFjLEdBQWQsQ0FBa0IsT0FBbEI7QUFDRCxPQUhNLEVBR0osSUFISSxDQUdDLFlBQVc7QUFDakIsZUFBTyxNQUFQLENBQWMsR0FBZCxDQUFrQixPQUFsQjtBQUNBLGVBQU8sT0FBUCxDQUFlLEdBQWYsQ0FBbUIsUUFBbkI7QUFDRCxPQU5NLENBQVA7QUFPRDtBQWhDVSxHQUFiOztBQW1DQSxNQUFJLGFBQWMsU0FBZCxVQUFjLENBQVMsSUFBVCxFQUFlO0FBQy9CLFFBQUksWUFBWSxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLElBQTNCLENBQWhCO0FBQ0EsUUFBSSxPQUFPO0FBQ1QsWUFBTSxLQURHO0FBRVQsV0FBSztBQUZJLE1BR1QsU0FIUyxDQUFYO0FBSUEsUUFBSSxJQUFKLEVBQVU7QUFDUixhQUFPLElBQVA7QUFDRDtBQUNELFdBQU8sV0FBVyxtQkFBWCxDQUErQixTQUEvQixDQUFQO0FBQ0EsUUFBSSxJQUFKLEVBQVU7QUFDUixhQUFPLEtBQUssSUFBWjtBQUNEO0FBQ0QsV0FBTyxNQUFQO0FBQ0QsR0FkRDtBQWVBLFNBQU8sSUFBUCxDQUFZLEdBQVosQ0FBZ0IsV0FBVyxLQUFLLE9BQUwsRUFBWCxDQUFoQjs7QUFFQTtBQUNBLFNBQU8sSUFBUCxDQUFZLE9BQVosQ0FBb0IsRUFBRSxRQUFGLENBQVcsWUFBVztBQUN4QyxRQUFJLE9BQU8sTUFBUCxDQUFjLEdBQWQsTUFBdUIsT0FBM0IsRUFBb0M7QUFDbEMsYUFBTyxJQUFQO0FBQ0Q7QUFDRixHQUptQixFQUlqQixJQUppQixDQUFwQjs7QUFNQSxTQUFPLE1BQVA7QUFDRCxDQTdERDs7QUErREEsT0FBTyxPQUFQLEdBQWlCLE1BQWpCOzs7OztBQ3RFQSxJQUFJLFNBQVMsUUFBUSxVQUFSLENBQWI7O0FBRUEsSUFBSSxNQUFNLFNBQU4sR0FBTSxDQUFTLEdBQVQsRUFBYztBQUN0QixTQUFPLE9BQU8sQ0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLElBQWYsQ0FBUCxFQUE2QixHQUE3QixDQUFQO0FBQ0QsQ0FGRDs7QUFJQSxJQUFJLE1BQUosR0FBYSxVQUFTLElBQVQsRUFBZTtBQUMxQixNQUFJLEtBQUssS0FBTCxDQUFXLE1BQVgsQ0FBSixFQUF3QjtBQUN0QixXQUFPLE1BQVA7QUFDRDtBQUNELE1BQUksS0FBSyxLQUFMLENBQVcsSUFBWCxDQUFKLEVBQXNCO0FBQ3BCLFdBQU8sSUFBUDtBQUNEO0FBQ0QsU0FBTyxJQUFQO0FBQ0QsQ0FSRDs7QUFVQSxJQUFJLFFBQUosR0FBZSxVQUFTLElBQVQsRUFBZTtBQUM1QixTQUFPLEtBQUssT0FBTCxDQUFhLFdBQWIsRUFBMEIsSUFBMUIsQ0FBUDtBQUNELENBRkQsRUFJQSxPQUFPLE9BQVAsR0FBaUIsR0FKakI7Ozs7O0FDaEJBLElBQU0sUUFBUSxRQUFRLE9BQVIsQ0FBZDtBQUNBLElBQU0sVUFBVSxRQUFRLGdCQUFSLENBQWhCOztBQUVBLElBQU0sY0FBYyxTQUFkLFdBQWMsQ0FBQyxLQUFELEVBQVc7QUFDN0IsTUFBTSxNQUFNLE1BQU0sU0FBbEI7QUFDQSxNQUFNLFVBQVUsU0FBVixPQUFVLENBQUMsSUFBRCxFQUFVO0FBQ3hCLFFBQUksUUFBSixDQUFhLElBQWI7QUFDRCxHQUZEO0FBR0EsTUFBTSxRQUFRLElBQUksT0FBSixDQUFZLEdBQVosQ0FBZ0IsVUFBQyxNQUFELEVBQVk7QUFDeEMsV0FDRSxvQkFBQyxPQUFEO0FBQ0UsV0FBSyxPQUFPLE9BQVAsRUFEUDtBQUVFLGNBQVEsTUFGVjtBQUdFLGNBQVEsSUFBSSxNQUFKLElBQWMsT0FBTyxPQUFQLEVBSHhCO0FBSUUsZUFBUztBQUpYLE1BREY7QUFRRCxHQVRhLENBQWQ7QUFVQSxTQUNFO0FBQUE7QUFBQSxNQUFLLElBQUcsT0FBUjtBQUFpQjtBQUFqQixHQURGO0FBR0QsQ0FsQkQ7O0FBb0JBLE9BQU8sT0FBUCxHQUFpQixXQUFqQjs7Ozs7QUN2QkEsSUFBTSxRQUFRLFFBQVEsT0FBUixDQUFkOztBQUVBLElBQU0sVUFBVSxTQUFWLE9BQVUsQ0FBQyxLQUFELEVBQVc7QUFDekIsTUFBTSxPQUFPLE1BQU0sTUFBTixDQUFhLE9BQWIsRUFBYjtBQUNBLE1BQU0sTUFBTSxLQUFLLE9BQUwsQ0FBYSxJQUFJLE1BQUosQ0FBVyxRQUFYLENBQWIsRUFBbUMsRUFBbkMsQ0FBWjtBQUNBLE1BQU0sT0FBTyxLQUFLLE9BQUwsQ0FBYSxJQUFJLE1BQUosQ0FBVyxLQUFYLENBQWIsRUFBZ0MsRUFBaEMsQ0FBYjtBQUNBLE1BQU0sVUFBVSxTQUFWLE9BQVUsQ0FBQyxDQUFELEVBQU87QUFDckIsTUFBRSxjQUFGO0FBQ0EsVUFBTSxPQUFOLENBQWMsSUFBZDtBQUNELEdBSEQ7QUFJQSxTQUNFO0FBQUE7QUFBQTtBQUNFLGlCQUFXLGdCQUFnQixNQUFNLE1BQU4sR0FBZSxRQUFmLEdBQTBCLEVBQTFDLENBRGI7QUFFRSxlQUFTLE9BRlg7QUFHRTtBQUFBO0FBQUEsUUFBSyxXQUFVLEtBQWY7QUFBc0I7QUFBdEIsS0FIRjtBQUlFO0FBQUE7QUFBQSxRQUFLLFdBQVUsTUFBZjtBQUF1QjtBQUF2QixLQUpGO0FBS0UsaUNBQUssV0FBVyxZQUFZLE1BQU0sTUFBTixDQUFhLE1BQWIsQ0FBb0IsR0FBcEIsRUFBNUI7QUFMRixHQURGO0FBU0QsQ0FqQkQ7O0FBbUJBLE9BQU8sT0FBUCxHQUFpQixPQUFqQjs7Ozs7QUNyQkEsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSO0FBQ0EsSUFBSSxhQUFhLFFBQVEsY0FBUixDQUFqQjtBQUNBLElBQUksTUFBTSxRQUFRLE9BQVIsQ0FBVjs7QUFFQSxJQUFJLE9BQU8sU0FBUCxJQUFPLENBQVMsSUFBVCxFQUFlO0FBQ3hCLE1BQUksT0FBTztBQUNULFNBQUssS0FESTtBQUVULGNBQVUsWUFGRDs7QUFJVCxhQUFTLG1CQUFXO0FBQ2xCLGFBQU8sSUFBUDtBQUNELEtBTlE7O0FBUVQsVUFBTSxnQkFBVztBQUNmLGFBQU8sSUFBSSxPQUFKLENBQVksVUFBUyxPQUFULEVBQWtCLE1BQWxCLEVBQTBCO0FBQzNDLFVBQUUsSUFBRixDQUFPO0FBQ0wsa0JBQVEsTUFESDtBQUVMLGVBQUssV0FGQTtBQUdMLG1CQUFTLElBSEo7QUFJTCxnQkFBTTtBQUNKLGtCQUFNO0FBREYsV0FKRDtBQU9MLG9CQUFVO0FBUEwsU0FBUCxFQVFHLElBUkgsQ0FRUSxNQVJSLEVBUWdCLElBUmhCLENBUXFCLFVBQVMsS0FBVCxFQUFnQjtBQUNuQyxlQUFLLFFBQUwsQ0FBYyxHQUFkLENBQWtCLE1BQU0sUUFBeEI7QUFDQSxlQUFLLEdBQUwsQ0FBUyxHQUFULENBQWEsSUFBSSxNQUFKLENBQVcsTUFBTSxPQUFqQixDQUFiO0FBQ0EsY0FBSSxVQUFVLElBQUksUUFBSixDQUFhLE1BQU0sT0FBbkIsQ0FBZDtBQUNBLGtCQUFRLE9BQVI7QUFDRCxTQWJEO0FBY0QsT0FmTSxDQUFQO0FBZ0JELEtBekJROztBQTJCVCxXQUFPLGVBQVMsSUFBVCxFQUFlO0FBQ3BCLGFBQU8sSUFBSSxPQUFKLENBQVksVUFBUyxPQUFULEVBQWtCLE1BQWxCLEVBQTBCO0FBQzNDLFVBQUUsSUFBRixDQUFPO0FBQ0wsZUFBSyxZQURBO0FBRUwsa0JBQVEsTUFGSDtBQUdMLG1CQUFTLElBSEo7QUFJTCxnQkFBTTtBQUNKLGtCQUFNLElBREY7QUFFSixzQkFBVSxLQUFLLFFBQUwsQ0FBYyxHQUFkLEVBRk47QUFHSixxQkFBUyxLQUFLLE9BQUwsQ0FBYSxLQUFiLEVBQW9CLEtBQUssR0FBTCxDQUFTLEdBQVQsRUFBcEI7QUFITCxXQUpEO0FBU0wsb0JBQVU7QUFUTCxTQUFQLEVBVUcsSUFWSCxDQVVRLFVBQVMsS0FBVCxFQUFnQjtBQUN0QixjQUFJLFNBQVMsSUFBYixFQUFtQjtBQUNqQjtBQUNELFdBRkQsTUFHSztBQUNILG1CQUFPLE1BQU0sS0FBYjtBQUNEO0FBQ0YsU0FqQkQsRUFpQkcsSUFqQkgsQ0FpQlEsWUFBVztBQUNqQixpQkFBTyxFQUFQO0FBQ0QsU0FuQkQ7QUFvQkQsT0FyQk0sQ0FBUDtBQXNCRDtBQWxEUSxHQUFYO0FBb0RBLFNBQU8sSUFBUDtBQUNELENBdEREOztBQXdEQSxPQUFPLE9BQVAsR0FBaUIsSUFBakI7Ozs7O0FDNURBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjs7QUFFQSxJQUFJLG9CQUFvQixTQUFwQixpQkFBb0IsQ0FBUyxLQUFULEVBQWdCLEtBQWhCLEVBQXVCO0FBQzdDLE1BQUksUUFBUSxLQUFaOztBQUVBLE1BQUksT0FBTztBQUNULGlCQUFhLHFCQUFTLEtBQVQsRUFBZ0I7QUFDM0IsWUFBTSxXQUFOLENBQWtCLFFBQWxCLEVBQTRCLEtBQTVCO0FBQ0EsVUFBSSxNQUFNLE1BQU4sSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDckI7QUFDRDtBQUNELFVBQUksTUFBTSxNQUFOLElBQWdCLENBQWhCLElBQXFCLE1BQU0sQ0FBTixLQUFZLE1BQU0sU0FBTixFQUFyQyxFQUF3RDtBQUN0RDtBQUNEO0FBQ0QsVUFBSSxVQUFVLElBQUksTUFBSixDQUFXLGFBQVgsQ0FBZDtBQUNBLFlBQU0sTUFBTixDQUFhLE1BQU0sR0FBTixDQUFVLFVBQVMsSUFBVCxFQUFlO0FBQ3BDLFlBQUksT0FBTyxRQUFRLElBQVIsQ0FBYSxJQUFiLEVBQW1CLENBQW5CLENBQVg7QUFDQSxlQUFPLEVBQUUsS0FBRixFQUFTLElBQVQsQ0FBYyxJQUFkLEVBQW9CLElBQXBCLENBQXlCLE1BQXpCLEVBQWlDLElBQWpDLENBQVA7QUFDRCxPQUhZLENBQWI7QUFJQSxZQUFNLFNBQU4sQ0FBZ0IsQ0FBaEIsRUFBbUIsUUFBbkIsQ0FBNEIsUUFBNUI7QUFDRCxLQWZROztBQWlCVCxrQkFBYyxzQkFBUyxJQUFULEVBQWU7QUFDM0IsWUFBTSxJQUFOLENBQVcsWUFBWCxFQUF5QixXQUF6QixDQUFxQyxVQUFyQztBQUNBLFVBQUksU0FBUyxJQUFiLEVBQW1CO0FBQ2pCO0FBQ0Q7QUFDRCxVQUFJLElBQUksTUFBTSxJQUFOLENBQVcsR0FBWCxFQUFnQixNQUFoQixDQUF1QixZQUFXO0FBQ3hDLGVBQU8sRUFBRSxJQUFGLEVBQVEsSUFBUixDQUFhLE1BQWIsS0FBd0IsSUFBL0I7QUFDRCxPQUZPLENBQVI7QUFHQSxVQUFJLEVBQUUsTUFBRixJQUFZLENBQWhCLEVBQW1CO0FBQ2pCO0FBQ0Q7QUFDRCxRQUFFLFFBQUYsQ0FBVyxVQUFYOztBQUVBO0FBQ0EsVUFBSSxpQkFBaUIsU0FBakIsY0FBaUIsQ0FBUyxNQUFULEVBQWlCO0FBQ3BDLFlBQUksU0FBUyxPQUFPLE1BQVAsRUFBYjtBQUNBLFlBQUksTUFBTSxPQUFPLE9BQVAsR0FBaUIsTUFBakIsR0FBMEIsTUFBcEM7QUFDQSxZQUFJLFNBQVMsTUFBTSxNQUFuQjtBQUNBLFlBQUksY0FBYyxNQUFNLFdBQU4sRUFBbEI7QUFDQSxZQUFJLE1BQU0sTUFBTSxTQUFOLEVBQU4sR0FBMEIsQ0FBOUIsRUFBaUM7QUFDL0IsZ0JBQU0sU0FBTixDQUFnQixHQUFoQjtBQUNEO0FBQ0QsWUFBSSxTQUFTLE1BQU0sU0FBTixFQUFULEdBQTZCLFdBQWpDLEVBQThDO0FBQzVDLGdCQUFNLFNBQU4sQ0FBZ0IsU0FBUyxXQUF6QjtBQUNEO0FBQ0YsT0FYRDtBQVlBLHFCQUFlLENBQWY7QUFDRDtBQTVDUSxHQUFYOztBQStDQSxRQUFNLGFBQU4sQ0FBb0IsR0FBcEIsQ0FBd0IsS0FBSyxXQUE3QjtBQUNBLFFBQU0sWUFBTixDQUFtQixHQUFuQixDQUF1QixLQUFLLFlBQTVCOztBQUVBO0FBQ0EsUUFBTSxFQUFOLENBQVMsT0FBVCxFQUFrQixHQUFsQixFQUF1QixVQUFTLENBQVQsRUFBWTtBQUNqQyxNQUFFLGNBQUY7QUFDQSxVQUFNLE1BQU4sQ0FBYSxFQUFFLEVBQUUsTUFBSixFQUFZLElBQVosQ0FBaUIsTUFBakIsQ0FBYjtBQUNELEdBSEQ7O0FBS0E7QUFDQSxRQUFNLEVBQU4sQ0FBUyxXQUFULEVBQXNCLEdBQXRCLEVBQTJCLFVBQVMsQ0FBVCxFQUFZO0FBQ3JDLE1BQUUsY0FBRjtBQUNELEdBRkQ7O0FBSUEsU0FBTyxJQUFQO0FBQ0QsQ0FqRUQ7O0FBbUVBLE9BQU8sT0FBUCxHQUFpQixpQkFBakI7Ozs7O0FDckVBLElBQUksSUFBSSxRQUFRLFlBQVIsQ0FBUjtBQUNBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjtBQUNBLElBQUksU0FBUyxRQUFRLFNBQVIsRUFBbUIsTUFBaEM7O0FBRUEsSUFBSSxnQkFBZ0IsU0FBaEIsYUFBZ0IsQ0FBUyxNQUFULEVBQWlCO0FBQ25DLE1BQUksUUFBUTtBQUNWLFdBQU8sRUFERztBQUVWLFlBQVEsSUFGRSxFQUVJOztBQUVkLG1CQUFlLElBQUksTUFBSixFQUpMO0FBS1Ysa0JBQWMsSUFBSSxNQUFKLEVBTEo7QUFNVixjQUFVLElBQUksTUFBSixFQU5BOztBQVFWLFlBQVEsZ0JBQVMsSUFBVCxFQUFlO0FBQ3JCLFFBQUUsSUFBRixDQUFPO0FBQ0wsZ0JBQVEsTUFESDtBQUVMLGFBQUssYUFGQTtBQUdMLGlCQUFTLElBSEo7QUFJTCxjQUFNO0FBQ0osZ0JBQU07QUFERixTQUpEO0FBT0wsa0JBQVU7QUFQTCxPQUFQLEVBUUcsSUFSSCxDQVFRLFlBQVc7QUFDakIsZ0JBQVEsR0FBUixDQUFZLDJDQUEyQyxJQUF2RDtBQUNELE9BVkQsRUFVRyxJQVZILENBVVEsVUFBUyxLQUFULEVBQWdCO0FBQ3RCLGNBQU0sUUFBTixDQUFlLE1BQU0sS0FBTixDQUFZLEdBQVosQ0FBZ0IsVUFBUyxDQUFULEVBQVk7QUFDekMsaUJBQU8sTUFBTSxJQUFOLEdBQWEsQ0FBcEI7QUFDRCxTQUZjLENBQWY7QUFHRCxPQWREO0FBZUQsS0F4QlM7O0FBMEJWLGNBQVUsa0JBQVMsS0FBVCxFQUFnQjtBQUN4QixZQUFNLFNBQU4sQ0FBZ0IsSUFBaEI7QUFDQSxZQUFNLEtBQU4sR0FBYyxLQUFkO0FBQ0EsWUFBTSxhQUFOLENBQW9CLFFBQXBCLENBQTZCLE1BQU0sS0FBbkM7QUFDRCxLQTlCUzs7QUFnQ1YsY0FBVSxvQkFBVztBQUNuQixhQUFPLE1BQU0sS0FBYjtBQUNELEtBbENTOztBQW9DVixlQUFXLHFCQUFXO0FBQ3BCLGFBQU8sTUFBTSxNQUFiO0FBQ0QsS0F0Q1M7O0FBd0NWLGVBQVcsbUJBQVMsSUFBVCxFQUFlO0FBQ3hCLFVBQUksU0FBUyxNQUFNLE1BQW5CLEVBQTJCO0FBQ3pCO0FBQ0Q7QUFDRCxZQUFNLE1BQU4sR0FBZSxJQUFmO0FBQ0EsWUFBTSxZQUFOLENBQW1CLFFBQW5CLENBQTRCLE1BQU0sTUFBbEM7QUFDRCxLQTlDUzs7QUFnRFYsZ0JBQVksb0JBQVMsSUFBVCxFQUFlO0FBQ3pCLFVBQUksTUFBTSxNQUFOLEtBQWlCLElBQXJCLEVBQTJCO0FBQ3pCLFlBQUksTUFBTSxLQUFOLENBQVksTUFBWixJQUFzQixDQUExQixFQUE2QjtBQUMzQixnQkFBTSxTQUFOLENBQWdCLE1BQU0sS0FBTixDQUFZLENBQVosQ0FBaEI7QUFDRDtBQUNEO0FBQ0Q7QUFDRCxVQUFJLE1BQU0sTUFBTSxLQUFOLENBQVksT0FBWixDQUFvQixNQUFNLE1BQTFCLENBQVY7QUFDQSxhQUFPLE9BQU8sQ0FBQyxDQUFSLEdBQVksQ0FBQyxDQUFwQjtBQUNBLFlBQU0sS0FBSyxHQUFMLENBQVMsQ0FBVCxFQUFZLEtBQUssR0FBTCxDQUFTLE1BQU0sS0FBTixDQUFZLE1BQVosR0FBcUIsQ0FBOUIsRUFBaUMsR0FBakMsQ0FBWixDQUFOO0FBQ0EsWUFBTSxTQUFOLENBQWdCLE1BQU0sS0FBTixDQUFZLEdBQVosQ0FBaEI7QUFDRCxLQTNEUzs7QUE2RFYsWUFBUSxnQkFBUyxJQUFULEVBQWU7QUFDckIsWUFBTSxTQUFOLENBQWdCLElBQWhCO0FBQ0EsWUFBTSxRQUFOLENBQWUsUUFBZixDQUF3QixJQUF4QjtBQUNEO0FBaEVTLEdBQVo7O0FBbUVBLFNBQU8sa0JBQVAsQ0FBMEIsR0FBMUIsQ0FBOEIsVUFBUyxPQUFULEVBQWtCO0FBQzlDLFFBQUksT0FBSixFQUFhO0FBQ1gsWUFBTSxNQUFOLENBQWEsT0FBTyxPQUFQLEVBQWI7QUFDRDtBQUNGLEdBSkQ7O0FBTUEsU0FBTyxZQUFQLENBQW9CLEdBQXBCLENBQXdCLEVBQUUsUUFBRixDQUFXLE1BQU0sTUFBakIsRUFBeUIsR0FBekIsQ0FBeEI7O0FBRUEsU0FBTyxLQUFQO0FBQ0QsQ0E3RUQ7O0FBK0VBLE9BQU8sT0FBUCxHQUFpQixhQUFqQjs7Ozs7QUNuRkEsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSO0FBQ0EsSUFBSSxZQUFZLFFBQVEsV0FBUixDQUFoQjtBQUNBLElBQUksUUFBUSxRQUFRLGdCQUFSLENBQVo7QUFDQSxJQUFJLGVBQWUsUUFBUSxpQkFBUixDQUFuQjtBQUNBLElBQUksb0JBQW9CLFFBQVEsdUJBQVIsQ0FBeEI7O0FBRUEsSUFBSSxhQUFhLFNBQWIsVUFBYSxDQUFTLEtBQVQsRUFBZ0IsTUFBaEIsRUFBd0I7QUFDdkMsTUFBSSxjQUFjLEVBQ2hCLHFGQURnQixFQUVoQixRQUZnQixDQUVQLEtBRk8sQ0FBbEI7O0FBSUEsTUFBSSxlQUFlLGFBQWEsV0FBYixFQUEwQixFQUExQixDQUFuQjtBQUNBLGVBQWEsT0FBYixDQUFxQixHQUFyQixDQUF5QixPQUFPLE9BQWhDOztBQUVBLE1BQUksT0FBTztBQUNULFVBQU0sZ0JBQVc7QUFDZixZQUFNLFFBQU4sQ0FBZSxRQUFmO0FBQ0Esa0JBQVksS0FBWjtBQUNBLG1CQUFhLEtBQWI7QUFDRCxLQUxROztBQU9ULFVBQU0sZ0JBQVc7QUFDZixZQUFNLFdBQU4sQ0FBa0IsUUFBbEI7QUFDQSxtQkFBYSxJQUFiO0FBQ0Q7O0FBR0g7QUFiVyxHQUFYLENBY0EsWUFBWSxJQUFaLENBQWlCLE9BQU8sSUFBUCxFQUFqQjs7QUFFQSxTQUFPLGtCQUFQLENBQTBCLEdBQTFCLENBQThCLFVBQVMsT0FBVCxFQUFrQjtBQUM5QyxRQUFJLE9BQUosRUFBYTtBQUNYLFdBQUssSUFBTDtBQUNELEtBRkQsTUFHSztBQUNILFdBQUssSUFBTDtBQUNEO0FBQ0YsR0FQRDs7QUFTQSxTQUFPLFlBQVAsQ0FBb0IsR0FBcEIsQ0FBd0IsVUFBUyxJQUFULEVBQWU7QUFDckMsZ0JBQVksR0FBWixDQUFnQixJQUFoQjtBQUNELEdBRkQ7O0FBSUEsWUFBVSxZQUFZLENBQVosQ0FBVixFQUEwQixJQUExQixDQUErQixPQUEvQixFQUF3QyxNQUFNLE9BQU8sS0FBYixDQUF4QztBQUNBLFlBQVUsWUFBWSxDQUFaLENBQVYsRUFBMEIsSUFBMUIsQ0FBK0IsS0FBL0IsRUFBc0MsTUFBTSxPQUFPLEdBQWIsQ0FBdEM7QUFDQSxZQUFVLFlBQVksQ0FBWixDQUFWLEVBQTBCLElBQTFCLENBQStCLEtBQS9CLEVBQXNDLE1BQU0sT0FBTyxJQUFiLENBQXRDO0FBQ0EsWUFBVSxZQUFZLENBQVosQ0FBVixFQUEwQixJQUExQixDQUErQixNQUEvQixFQUF1QyxNQUFNLFlBQVc7QUFDdEQsV0FBTyxPQUFQLENBQWUsVUFBZixDQUEwQixJQUExQjtBQUNELEdBRnNDLENBQXZDO0FBR0EsWUFBVSxZQUFZLENBQVosQ0FBVixFQUEwQixJQUExQixDQUErQixJQUEvQixFQUFxQyxNQUFNLFlBQVc7QUFDcEQsV0FBTyxPQUFQLENBQWUsVUFBZixDQUEwQixLQUExQjtBQUNELEdBRm9DLENBQXJDO0FBR0EsWUFBVSxZQUFZLENBQVosQ0FBVixFQUEwQixJQUExQixDQUErQixPQUEvQixFQUF3QyxNQUN0QyxPQUFPLG1CQUQrQixDQUF4Qzs7QUFJQTtBQUNBLE1BQUksU0FBUyxFQUFFLHlCQUFGLEVBQTZCLFFBQTdCLENBQXNDLEtBQXRDLENBQWI7QUFDQSxvQkFBa0IsTUFBbEIsRUFBMEIsT0FBTyxPQUFqQzs7QUFFQSxTQUFPLElBQVA7QUFDRCxDQXZERDs7QUF5REEsT0FBTyxPQUFQLEdBQWlCLFVBQWpCOzs7OztBQy9EQSxJQUFJLFNBQVMsUUFBUSxTQUFSLEVBQW1CLE1BQWhDO0FBQ0EsSUFBSSxnQkFBZ0IsUUFBUSxrQkFBUixDQUFwQjs7QUFFQSxJQUFJLFNBQVMsU0FBVCxNQUFTLEdBQVc7QUFDdEIsTUFBSSxRQUFRO0FBQ1YsY0FBVSxJQUFJLE1BQUosRUFEQTtBQUVWLGtCQUFjLElBQUksTUFBSixFQUZKO0FBR1Ysd0JBQW9CLElBQUksTUFBSixFQUhWOztBQUtWLFVBQU0sRUFMSTtBQU1WLGFBQVMsS0FOQzs7QUFRVixZQUFRLGdCQUFTLElBQVQsRUFBZTtBQUNyQixZQUFNLE9BQU4sQ0FBYyxJQUFkO0FBQ0EsVUFBSSxLQUFLLE1BQUwsQ0FBWSxDQUFDLENBQWIsS0FBbUIsR0FBdkIsRUFBNEI7QUFDMUI7QUFDRDtBQUNELFlBQU0sSUFBTjtBQUNBLFlBQU0sUUFBTixDQUFlLFFBQWYsQ0FBd0IsSUFBeEI7QUFDRCxLQWZTOztBQWlCVixVQUFNLGdCQUFXO0FBQ2YsWUFBTSxPQUFOLEdBQWdCLElBQWhCO0FBQ0EsWUFBTSxrQkFBTixDQUF5QixRQUF6QixDQUFrQyxNQUFNLE9BQXhDO0FBQ0QsS0FwQlM7O0FBc0JWLFVBQU0sZ0JBQVc7QUFDZixZQUFNLE9BQU4sR0FBZ0IsS0FBaEI7QUFDQSxZQUFNLGtCQUFOLENBQXlCLFFBQXpCLENBQWtDLE1BQU0sT0FBeEM7QUFDTjtBQUNLLEtBMUJTOztBQTRCVixhQUFTLG1CQUFXO0FBQ2xCLGFBQU8sTUFBTSxJQUFiO0FBQ0QsS0E5QlM7O0FBZ0NWLGFBQVMsaUJBQVMsSUFBVCxFQUFlO0FBQ3RCLFlBQU0sSUFBTixHQUFhLElBQWI7QUFDQSxZQUFNLFlBQU4sQ0FBbUIsUUFBbkIsQ0FBNEIsSUFBNUI7QUFDRCxLQW5DUzs7QUFxQ1YseUJBQXFCLCtCQUFXO0FBQzlCLFlBQU0sT0FBTixDQUNFLE1BQU0sSUFBTixDQUFXLE9BQVgsQ0FBbUIsSUFBSSxNQUFKLENBQVcsVUFBWCxDQUFuQixFQUEyQyxFQUEzQyxDQURGO0FBR0QsS0F6Q1M7O0FBMkNWLFdBQU8saUJBQVc7QUFDaEIsVUFBSSxPQUFPLFFBQVEsU0FBUixFQUFYO0FBQ0EsWUFBTSxNQUFOLENBQWEsT0FBTyxJQUFQLEdBQWMsTUFBTSxJQUFqQztBQUNELEtBOUNTOztBQWdEVixTQUFLLGVBQVc7QUFDZCxVQUFJLFNBQVMsUUFBUSxTQUFSLEVBQWI7QUFDQSxVQUFJLE1BQUosRUFBWTtBQUNWLGNBQU0sT0FBTixDQUFjLE1BQWQ7QUFDQTtBQUNEO0FBQ0QsVUFBSSxRQUFRLFFBQVEsUUFBUixFQUFaO0FBQ0EsVUFBSSxNQUFNLE1BQU4sSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDckIsY0FBTSxPQUFOLENBQWMsTUFBTSxDQUFOLENBQWQ7QUFDQTtBQUNEO0FBQ0QsY0FBUSxNQUFSLENBQWUsTUFBTSxJQUFyQjtBQUNEO0FBNURTLEdBQVo7O0FBK0RBLE1BQUksVUFBVSxNQUFNLE9BQU4sR0FBZ0IsY0FBYyxLQUFkLENBQTlCO0FBQ0EsVUFBUSxRQUFSLENBQWlCLEdBQWpCLENBQXFCLFVBQVMsSUFBVCxFQUFlO0FBQ2xDLFVBQU0sTUFBTixDQUFhLElBQWI7QUFDRCxHQUZEOztBQUlBLFNBQU8sS0FBUDtBQUNELENBdEVEOztBQXdFQSxPQUFPLE9BQVAsR0FBaUIsTUFBakI7Ozs7O0FDM0VBLElBQUksU0FBUyxRQUFRLFVBQVIsQ0FBYjs7QUFFQSxJQUFJLFNBQVMsU0FBVCxNQUFTLENBQVMsSUFBVCxFQUFlO0FBQzFCLFNBQU8sT0FBTyxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsS0FBZixDQUFQLEVBQThCLElBQTlCLENBQVA7QUFDRCxDQUZEOztBQUlBLE9BQU8sZ0JBQVAsR0FBMEIsVUFBUyxPQUFULEVBQWtCO0FBQzFDLE1BQUksUUFBUSxLQUFSLENBQWMsV0FBZCxDQUFKLEVBQWdDO0FBQzlCLFdBQU8sS0FBUDtBQUNEO0FBQ0QsTUFBSSxRQUFRLFFBQVEsS0FBUixDQUFjLFNBQWQsQ0FBWjtBQUNBLE9BQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxNQUFNLE1BQTFCLEVBQWtDLEVBQUUsQ0FBcEMsRUFBdUM7QUFDckMsUUFBSSxTQUFTLE1BQU0sQ0FBTixFQUFTLE9BQVQsQ0FBaUIsU0FBakIsRUFBNEIsSUFBNUIsQ0FBYjtBQUNBLFFBQUksT0FBTyxNQUFQLElBQWlCLENBQXJCLEVBQXdCO0FBQ3RCLGFBQU8sS0FBUDtBQUNEO0FBQ0Y7QUFDRCxTQUFPLEtBQVA7QUFDRCxDQVpEOztBQWNBLE9BQU8sT0FBUCxHQUFpQixNQUFqQjs7Ozs7QUNwQkEsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSO0FBQ0EsSUFBSSxTQUFTLFFBQVEsU0FBUixFQUFtQixNQUFoQzs7QUFFQSxJQUFJLGVBQWUsU0FBZixZQUFlLENBQVMsS0FBVCxFQUFnQixRQUFoQixFQUEwQjtBQUMzQyxVQUFRLEVBQUUsS0FBRixDQUFSOztBQUVBLE1BQUksUUFBUTtBQUNWLGFBQVMsSUFBSSxNQUFKLEVBREM7O0FBR1YsV0FBTyxLQUhHO0FBSVYsY0FBVSxRQUpBO0FBS1YsZ0JBQVksTUFBTSxHQUFOLEVBTEY7QUFNVixXQUFPLElBTkc7O0FBUVYsV0FBTyxpQkFBVztBQUNoQixZQUFNLElBQU47QUFDQSxZQUFNLEtBQU4sR0FBYyxZQUFZLE1BQU0sS0FBbEIsRUFBeUIsTUFBTSxRQUEvQixDQUFkO0FBQ0QsS0FYUzs7QUFhVixVQUFNLGdCQUFXO0FBQ2Ysb0JBQWMsTUFBTSxLQUFwQjtBQUNBLFlBQU0sS0FBTixHQUFjLElBQWQ7QUFDRCxLQWhCUzs7QUFrQlYsV0FBTyxpQkFBVztBQUNoQixVQUFJLFVBQVUsTUFBTSxLQUFOLENBQVksR0FBWixFQUFkO0FBQ0EsVUFBSSxXQUFXLE1BQU0sVUFBckIsRUFBaUM7QUFDL0I7QUFDRDtBQUNELFlBQU0sT0FBTixDQUFjLFFBQWQsQ0FBdUIsT0FBdkIsRUFBZ0MsTUFBTSxVQUF0QztBQUNBLFlBQU0sVUFBTixHQUFtQixPQUFuQjtBQUNELEtBekJTOztBQTJCVixhQUFTLG1CQUFXO0FBQ2xCLFVBQUksTUFBTSxLQUFWLEVBQWlCO0FBQ2YsY0FBTSxLQUFOO0FBQ0Q7QUFDRjtBQS9CUyxHQUFaOztBQWtDQSxRQUFNLE9BQU4sQ0FBYyxNQUFNLE9BQXBCOztBQUVBLFNBQU8sS0FBUDtBQUNELENBeENEOztBQTBDQSxPQUFPLE9BQVAsR0FBaUIsWUFBakI7Ozs7O0FDN0NBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjtBQUNBLElBQUksb0JBQW9CLFFBQVEsdUJBQVIsQ0FBeEI7QUFDQSxJQUFJLGFBQWEsUUFBUSxlQUFSLENBQWpCOztBQUVBLElBQUksV0FBVyxTQUFYLFFBQVcsQ0FBUyxVQUFULEVBQXFCLE1BQXJCLEVBQTZCO0FBQzFDLE1BQUksUUFBUSxFQUFFLE1BQUYsQ0FBWjtBQUNBLG9CQUNFLEVBQUUsMkJBQUYsRUFBK0IsUUFBL0IsQ0FBd0MsS0FBeEMsQ0FERixFQUVFLFVBRkY7QUFJQSxhQUNFLEVBQUUsb0JBQUYsRUFBd0IsUUFBeEIsQ0FBaUMsS0FBakMsQ0FERixFQUVFLE1BRkY7O0FBS0E7QUFDQSxZQUFVLElBQVYsQ0FBZSxDQUFDLE9BQUQsRUFBVSxPQUFWLENBQWYsRUFBbUMsWUFBVztBQUM1QyxlQUFXLFFBQVg7QUFDQSxXQUFPLEtBQVA7QUFDRCxHQUhELEVBR0csU0FISDtBQUlBLFlBQVUsSUFBVixDQUFlLENBQUMsYUFBRCxFQUFnQixhQUFoQixDQUFmLEVBQStDLFlBQVc7QUFDeEQsZUFBVyxRQUFYO0FBQ0EsV0FBTyxLQUFQO0FBQ0QsR0FIRCxFQUdHLFNBSEg7QUFJQSxZQUFVLElBQVYsQ0FBZSxDQUFDLE9BQUQsRUFBVSxPQUFWLENBQWYsRUFBbUMsWUFBVztBQUM1QyxlQUFXLEtBQVgsQ0FBaUIsV0FBVyxTQUFYLEVBQWpCO0FBQ0EsV0FBTyxLQUFQO0FBQ0QsR0FIRCxFQUdHLFNBSEg7QUFJQSxZQUFVLElBQVYsQ0FBZSxDQUFDLE9BQUQsQ0FBZixFQUEwQixZQUFXO0FBQ25DLGVBQVcsTUFBWCxDQUFrQixXQUFXLFNBQVgsRUFBbEI7QUFDQSxXQUFPLEtBQVA7QUFDRCxHQUhELEVBR0csU0FISDtBQUlELENBNUJEOztBQThCQSxPQUFPLE9BQVAsR0FBaUIsUUFBakI7Ozs7O0FDbENBLElBQUksU0FBUyxRQUFRLFNBQVIsRUFBbUIsTUFBaEM7O0FBRUEsSUFBSSxhQUFhLFNBQWIsVUFBYSxDQUFTLEtBQVQsRUFBZ0I7QUFDL0IsTUFBSSxhQUFhLElBQUksTUFBSixFQUFqQjtBQUNBLFNBQU8sTUFBUCxDQUFjLFVBQWQsRUFBMEI7QUFDeEIsU0FBSyxlQUFXO0FBQ2QsYUFBTyxLQUFQO0FBQ0QsS0FIdUI7QUFJeEIsU0FBSyxhQUFTLFNBQVQsRUFBb0I7QUFDdkIsVUFBSSxVQUFVLFNBQWQsRUFBeUI7QUFDdkI7QUFDRDtBQUNELFVBQUksWUFBWSxLQUFoQjtBQUNBLGNBQVEsU0FBUjtBQUNBLGlCQUFXLFFBQVgsQ0FBb0IsS0FBcEIsRUFBMkIsU0FBM0IsRUFBc0MsVUFBdEM7QUFDRCxLQVh1QjtBQVl4QixhQUFTLFdBQVcsR0FaSSxDQVlDO0FBWkQsR0FBMUI7QUFjQSxTQUFPLFVBQVA7QUFDRCxDQWpCRDs7QUFtQkEsT0FBTyxPQUFQLEdBQWlCLFVBQWpCOzs7OztBQ3JCQSxJQUFJLGNBQWMsU0FBZCxXQUFjLENBQVMsSUFBVCxFQUFlO0FBQy9CLFNBQU8sWUFBVztBQUNoQixTQUFLLEtBQUwsQ0FBVyxJQUFYLEVBQWlCLFNBQWpCO0FBQ0EsV0FBTyxLQUFQO0FBQ0QsR0FIRDtBQUlELENBTEQ7O0FBT0EsT0FBTyxPQUFQLEdBQWlCLFdBQWpCOzs7OztBQ1BBLElBQUksYUFBYSxRQUFRLGNBQVIsQ0FBakI7O0FBRUEsSUFBSSxTQUFTLFNBQVQsTUFBUyxDQUFTLE1BQVQsRUFBaUIsS0FBakIsRUFBd0I7QUFDbkMsTUFBSSxlQUFlLFNBQWYsWUFBZSxDQUFTLENBQVQsRUFBWTtBQUM3QixXQUFPLE1BQU0sSUFBTixJQUFjLE1BQU0sU0FBcEIsSUFBaUMsT0FBTyxPQUFQLENBQWUsQ0FBZixLQUFxQixDQUFDLENBQTlEO0FBQ0QsR0FGRDs7QUFJQSxNQUFJLGFBQWEsU0FBYixVQUFhLENBQVMsQ0FBVCxFQUFZO0FBQzNCLFFBQUksQ0FBQyxhQUFhLENBQWIsQ0FBTCxFQUFzQjtBQUNwQixZQUFNLG9CQUFvQixDQUExQjtBQUNEO0FBQ0YsR0FKRDtBQUtBLGFBQVcsS0FBWDs7QUFFQSxNQUFJLFNBQVMsV0FBVyxLQUFYLENBQWI7O0FBRUEsU0FBTyxTQUFQLEdBQW1CLFlBQVc7QUFDNUIsV0FBTyxNQUFQO0FBQ0QsR0FGRDs7QUFJQSxNQUFJLE9BQU8sT0FBTyxHQUFsQjtBQUNBLFNBQU8sR0FBUCxHQUFhLFVBQVMsU0FBVCxFQUFvQjtBQUMvQixlQUFXLFNBQVg7QUFDQSxTQUFLLFNBQUw7QUFDRCxHQUhEOztBQUtBLFNBQU8sTUFBUCxHQUFnQixZQUFXO0FBQ3pCLFFBQUksTUFBTSxPQUFPLE9BQVAsQ0FBZSxPQUFPLEdBQVAsRUFBZixDQUFWO0FBQ0EsVUFBTSxDQUFDLE1BQU0sQ0FBUCxJQUFZLE9BQU8sTUFBekI7QUFDQSxXQUFPLEdBQVAsQ0FBVyxPQUFPLEdBQVAsQ0FBWDtBQUNELEdBSkQ7O0FBTUEsU0FBTyxNQUFQO0FBQ0QsQ0EvQkQ7O0FBaUNBLE9BQU8sT0FBUCxHQUFpQixNQUFqQjs7Ozs7QUNuQ0EsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSO0FBQ0EsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiOztBQUVBLElBQUksMkJBQTJCLFNBQTNCLHdCQUEyQixDQUFTLEtBQVQsRUFBZ0I7QUFDN0MsTUFBSSxXQUFXLEVBQUUsT0FBRixFQUFXLE1BQVgsQ0FDYixFQUFFLG1CQUFGLENBRGEsRUFFYixFQUFFLGdDQUFGLENBRmEsRUFHYixFQUFFLHdDQUFGLENBSGEsQ0FBZjs7QUFNQSxNQUFJLFVBQVUsT0FBTyxJQUFQLENBQVksUUFBWixFQUFzQix3QkFBdEIsQ0FBZDs7QUFFQSxNQUFJLFVBQVUsU0FBUyxJQUFULENBQWMsUUFBZCxDQUFkO0FBQ0EsVUFBUSxNQUFSLENBQWUsTUFBTSxPQUFOLENBQWMsR0FBZCxDQUFrQixVQUFTLFFBQVQsRUFBbUI7QUFDbEQsV0FBTyxFQUFFLFVBQUYsRUFBYyxJQUFkLENBQW1CLFFBQW5CLENBQVA7QUFDRCxHQUZjLENBQWY7QUFHQSxRQUFNLFFBQU4sQ0FBZSxPQUFmLENBQXVCLFVBQVMsUUFBVCxFQUFtQjtBQUN4QyxZQUFRLEdBQVIsQ0FBWSxRQUFaO0FBQ0QsR0FGRDtBQUdBLFVBQVEsR0FBUixDQUFZLE1BQU0sUUFBTixDQUFlLEdBQWYsRUFBWjtBQUNBLFVBQVEsS0FBUixDQUFjLFlBQVc7QUFDdkIsVUFBTSxRQUFOLENBQWUsR0FBZixDQUFtQixRQUFRLEdBQVIsRUFBbkI7QUFDRCxHQUZEOztBQUlBO0FBQ0EsV0FBUyxJQUFULENBQWMsV0FBZCxFQUEyQixLQUEzQixDQUFpQyxNQUFNLE9BQXZDOztBQUVBO0FBQ0EsV0FBUyxJQUFULENBQWMsZUFBZCxFQUErQixLQUEvQixDQUFxQyxNQUFNLElBQTNDOztBQUVBLFFBQU0sT0FBTixDQUFjLE9BQWQsQ0FBc0IsVUFBUyxPQUFULEVBQWtCO0FBQ3RDLFFBQUksT0FBSixFQUFhO0FBQ1gsY0FBUSxRQUFSLENBQWlCLFNBQWpCO0FBQ0EsZUFBUyxJQUFULENBQWMsZUFBZCxFQUErQixLQUEvQjtBQUNELEtBSEQsTUFJSztBQUNILGNBQVEsV0FBUixDQUFvQixTQUFwQjtBQUNEO0FBQ0YsR0FSRDtBQVNELENBcENEOztBQXNDQSxPQUFPLE9BQVAsR0FBaUIsd0JBQWpCOzs7OztBQ3pDQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7QUFDQSxJQUFJLFNBQVMsUUFBUSxTQUFSLEVBQW1CLE1BQWhDO0FBQ0EsSUFBSSxhQUFhLFFBQVEsY0FBUixDQUFqQjs7QUFFQSxJQUFJLHVCQUF1QixTQUF2QixvQkFBdUIsR0FBVzs7QUFFcEMsTUFBSSxTQUFTO0FBQ1gsYUFBUyxXQUFXLEtBQVgsQ0FERTtBQUVYLGNBQVUsWUFGQztBQUdYLGFBQVMsQ0FDUCxPQURPLEVBRVAsUUFGTyxFQUdQLFVBSE8sQ0FIRTtBQVFYLGVBQVcsSUFBSSxNQUFKLEVBUkE7O0FBVVgsYUFBUyxtQkFBVztBQUNsQixhQUFPLE9BQVAsQ0FBZSxHQUFmLENBQW1CLEtBQW5CO0FBQ0EsYUFBTyxTQUFQLENBQWlCLFFBQWpCLENBQTBCLE9BQU8sUUFBUCxDQUFnQixHQUFoQixFQUExQjtBQUNELEtBYlU7O0FBZVgsVUFBTSxjQUFTLFFBQVQsRUFBbUI7QUFDdkIsYUFBTyxRQUFQLENBQWdCLEdBQWhCLENBQW9CLFFBQXBCO0FBQ0EsYUFBTyxPQUFQLENBQWUsR0FBZixDQUFtQixJQUFuQjtBQUNELEtBbEJVOztBQW9CWCxVQUFNLGdCQUFXO0FBQ2YsYUFBTyxPQUFQLENBQWUsR0FBZixDQUFtQixLQUFuQjtBQUNEO0FBdEJVLEdBQWI7QUF3QkEsU0FBTyxNQUFQO0FBQ0QsQ0EzQkQ7O0FBNkJBLE9BQU8sT0FBUCxHQUFpQixvQkFBakI7Ozs7O0FDakNBLElBQUksWUFBWSxRQUFRLFdBQVIsQ0FBaEI7QUFDQSxJQUFJLGdCQUFnQixRQUFRLGtCQUFSLENBQXBCO0FBQ0EsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiO0FBQ0EsSUFBSSxXQUFXLFFBQVEsYUFBUixDQUFmOztBQUVBLE9BQU8sT0FBUCxDQUFlLEdBQWYsR0FBcUIsWUFBVztBQUM5QixNQUFJLFNBQVMsUUFBYjtBQUNBLE1BQUksYUFBYSxjQUFjLE1BQWQsQ0FBakI7QUFDQSxNQUFJLE9BQU8sU0FBUyxVQUFULEVBQXFCLE1BQXJCLENBQVg7O0FBRUEsTUFBSSxlQUFlLFNBQWYsWUFBZSxHQUFXO0FBQzVCLFFBQUksUUFBUSxXQUFXLFFBQVgsRUFBWjtBQUNBLGlCQUFhLE9BQWIsQ0FBcUIsWUFBckIsRUFBbUMsS0FBSyxTQUFMLENBQWUsS0FBZixDQUFuQztBQUNELEdBSEQ7QUFJQSxNQUFJLGVBQWUsU0FBZixZQUFlLEdBQVc7QUFDNUIsV0FBTyxLQUFLLEtBQUwsQ0FBVyxhQUFhLE9BQWIsQ0FBcUIsWUFBckIsS0FBc0MsSUFBakQsQ0FBUDtBQUNELEdBRkQ7QUFHQSxpQkFBZSxPQUFmLENBQXVCLFVBQVMsSUFBVCxFQUFlO0FBQ3BDLGVBQVcsSUFBWCxDQUFnQixJQUFoQjtBQUNELEdBRkQ7O0FBSUEsYUFBVyxNQUFYLENBQWtCLEdBQWxCLENBQXNCLFlBQXRCO0FBQ0EsYUFBVyxNQUFYLENBQWtCLEdBQWxCLENBQXNCLFlBQXRCOztBQUVBO0FBQ0EsWUFBVSxJQUFWLENBQWUsQ0FBQyxPQUFELEVBQVUsT0FBVixDQUFmLEVBQW1DLFlBQVc7QUFDNUMsV0FBTyxJQUFQO0FBQ0EsV0FBTyxLQUFQO0FBQ0QsR0FIRCxFQUdHLFNBSEg7QUFJRCxDQXhCRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbnZhciBpbmRlbnRBZnRlclBhc3RlID0gZnVuY3Rpb24oY20sIGNoYW5nZSkge1xuICBpZiAoY2hhbmdlLm9yaWdpbiAhPSBcInBhc3RlXCIpIHtcbiAgICByZXR1cm5cbiAgfVxuICBpZiAoQ29kZU1pcnJvci5jbXBQb3MoY2hhbmdlLmZyb20sIGNoYW5nZS50bykpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyBjaGVjayBpZiB0aGUgaW5zZXJ0aW9uIHBvaW50IGlzIGF0IHRoZSBlbmQgb2YgdGhlIGxpbmVcbiAgdmFyIGRlc3QgPSBjbS5nZXRMaW5lKGNoYW5nZS5mcm9tLmxpbmUpXG4gIGlmIChkZXN0Lmxlbmd0aCAhPSBjaGFuZ2UuZnJvbS5jaCkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIGNoZWNrIGlmIHRoZSBsaW5lIGNvbnNpc3RzIG9mIG9ubHkgd2hpdGUgc3BhY2VzXG4gIGlmIChkZXN0Lm1hdGNoKC9bXiBcXHRdLykpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyByZW1vdmUgdGhlIGxhc3QgZW1wdHkgbGluZVxuICBpZiAoY2hhbmdlLnRleHRbY2hhbmdlLnRleHQubGVuZ3RoIC0gMV0gPT0gXCJcIikge1xuICAgIGNoYW5nZS50ZXh0LnBvcCgpXG4gIH1cbiAgdmFyIGJhc2VfaW5kZW50ID0gY2hhbmdlLnRleHRbMF0ubWF0Y2goL15bIFxcdF0qLylbMF1cbiAgY2hhbmdlLnRleHQgPSBjaGFuZ2UudGV4dC5tYXAoZnVuY3Rpb24obGluZSwgaSkge1xuICAgIGxpbmUgPSBsaW5lLm1hdGNoKC9eKFsgXFx0XSopKC4qKS8pXG4gICAgdmFyIGluZGVudCA9IGxpbmVbMV1cbiAgICB2YXIgdGV4dCA9IGxpbmVbMl1cbiAgICBpbmRlbnQgPSAoZGVzdCArIGluZGVudCkuc3Vic3RyKDAsIGRlc3QubGVuZ3RoICsgaW5kZW50Lmxlbmd0aCAtIGJhc2VfaW5kZW50Lmxlbmd0aClcbiAgICByZXR1cm4gaW5kZW50ICsgdGV4dFxuICB9KVxuICBjaGFuZ2UudGV4dFswXSA9IGNoYW5nZS50ZXh0WzBdLnN1YnN0cihkZXN0Lmxlbmd0aClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbmRlbnRBZnRlclBhc3RlXG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG5yZXF1aXJlKFwiY29kZW1pcnJvci1hZGRvblwiKVxucmVxdWlyZShcIi4vbWFya1wiKVxucmVxdWlyZShcIi4vc2VsZWN0LWxpbmVcIilcbnJlcXVpcmUoXCIuL3NlbGVjdC13b3JkXCIpXG5yZXF1aXJlKFwiLi9zcGxpdC1pbnRvLWxpbmVzXCIpXG5yZXF1aXJlKFwiLi90ZXh0LW1vZGVcIilcblxuT2JqZWN0LmFzc2lnbihDb2RlTWlycm9yLmRlZmF1bHRzLCB7XG4gIGxpbmVOdW1iZXJzOiB0cnVlLFxuICB0YWJTaXplOiA0LFxuICBzaG93Q3Vyc29yV2hlblNlbGVjdGluZzogdHJ1ZSxcbiAgYXV0b0Nsb3NlQnJhY2tldHM6IHRydWUsXG4gIG1hdGNoQnJhY2tldHM6IHRydWUsXG4gIG1hdGNoVGFnczogdHJ1ZSxcbiAgYXV0b0Nsb3NlVGFnczogdHJ1ZSxcbiAgc3R5bGVBY3RpdmVMaW5lOiB7bm9uRW1wdHk6IHRydWV9LFxuICBzdHlsZVNlbGVjdGVkVGV4dDogdHJ1ZSxcbiAgZHJhZ0Ryb3A6IGZhbHNlLFxuICBleHRyYUtleXM6IHtcbiAgICBcIkN0cmwtU3BhY2VcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICBcIkN0cmwtVVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgIFwiQ3RybC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgIFwiQ21kLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgXCJUYWJcIjogXCJpbmRlbnRBdXRvXCIsXG4gICAgXCJDdHJsLURcIjogZmFsc2UsXG4gICAgXCJDbWQtRFwiOiBmYWxzZSxcbiAgfSxcbn0pXG5cbkNvZGVNaXJyb3IuZGVmaW5lSW5pdEhvb2soZnVuY3Rpb24oY20pIHtcbiAgLy8gbWFpbnRhaW4gaW5kZW50YXRpb24gb24gcGFzdGVcbiAgY20ub24oXCJiZWZvcmVDaGFuZ2VcIiwgcmVxdWlyZShcIi4vaW5kZW50LWFmdGVyLXBhc3RlXCIpKVxuICBcbiAgLy8ga2V5IGJpbmRpbmdzXG4gIHZhciBpbnB1dCA9IGNtLmdldElucHV0RmllbGQoKVxuICBpbnB1dC5jbGFzc05hbWUgKz0gXCIgbW91c2V0cmFwXCIgLy8gZW5hYmxlIGhvdGtleVxuICB2YXIga2V5bWFwID0ge1xuICAgIFwiYWx0K2JcIjogXCJnb1dvcmRMZWZ0XCIsXG4gICAgXCJhbHQrZlwiOiBcImdvV29yZFJpZ2h0XCIsXG4gICAgXCJhbHQraFwiOiBcImRlbFdvcmRCZWZvcmVcIixcbiAgICBcImFsdCtkXCI6IFwiZGVsV29yZEFmdGVyXCIsXG4gICAgXCJtb2QrbVwiOiBcIm1hcmtcIixcbiAgICBcIm1vZCtkXCI6IFwic2VsZWN0V29yZFwiLFxuICAgIFwibW9kK2xcIjogXCJzZWxlY3RMaW5lXCIsXG4gICAgXCJtb2Qrc2hpZnQrbFwiOiBcInNwbGl0SW50b0xpbmVzXCIsXG4gIH1cbiAgXy5lYWNoKGtleW1hcCwgZnVuY3Rpb24oY29tbWFuZCwga2V5KSB7XG4gICAgTW91c2V0cmFwKGlucHV0KS5iaW5kKGtleSwgZnVuY3Rpb24oKSB7XG4gICAgICBjbS5leGVjQ29tbWFuZChjb21tYW5kKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfSlcbiAgfSlcbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gQ29kZU1pcnJvclxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmRlZmluZUluaXRIb29rKGZ1bmN0aW9uKGNtKSB7XG4gIGNtLm1hcmtzID0gW11cbn0pXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMubWFyayA9IGZ1bmN0aW9uKGNtKSB7XG4gIHZhciBjdXJzb3IgPSBjbS5nZXRDdXJzb3IoKVxuICBpZiAobWFya3MubGVuZ3RoKSB7XG4gICAgdmFyIGxhc3QgPSBjbS5tYXJrc1tjbS5tYXJrcy5sZW5ndGggLSAxXVxuICAgIGlmIChsYXN0LmxpbmUgPT0gY3Vyc29yLmxpbmUgJiYgbGFzdC5jaCA9PSBjdXJzb3IuY2gpIHtcbiAgICAgIGNtLnNldFNlbGVjdGlvbnMoY20ubWFya3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgcmV0dXJuIHtoZWFkOiBtLCBhbmNob3I6IG19XG4gICAgICB9KSwgY20ubWFya3MubGVuZ3RoIC0gMSlcbiAgICAgIGNtLm1hcmtzID0gW11cbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBjbS5tYXJrcy5wdXNoKGN1cnNvcilcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zZWxlY3RMaW5lID0gZnVuY3Rpb24oY20pIHtcbiAgY20uc2V0U2VsZWN0aW9ucyhcbiAgICBjbS5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICBsaW5lOiBpLmhlYWQubGluZSArIDEsXG4gICAgICAgICAgY2g6IDAsXG4gICAgICAgIH0sXG4gICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICBsaW5lOiBpLmFuY2hvci5saW5lLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNlbGVjdFdvcmQgPSBmdW5jdGlvbihjbSkge1xuICBjbS5zZXRTZWxlY3Rpb25zKFxuICAgIGNtLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBjbS5maW5kV29yZEF0KGkuYW5jaG9yKVxuICAgIH0pXG4gIClcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zcGxpdEludG9MaW5lcyA9IGZ1bmN0aW9uKGNtKSB7XG4gIHZhciBzZWxlY3Rpb25zID0gY20ubGlzdFNlbGVjdGlvbnMoKVxuICBpZiAoc2VsZWN0aW9ucy5sZW5ndGggIT0gMSkge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgYW5jaG9yID0gc2VsZWN0aW9uc1swXS5hbmNob3JcbiAgdmFyIGhlYWQgPSBzZWxlY3Rpb25zWzBdLmhlYWRcbiAgdmFyIG5ld19zZWxlY3Rpb25zID0gW11cbiAgZm9yICh2YXIgaSA9IGFuY2hvci5saW5lOyBpIDw9IGhlYWQubGluZTsgKytpKSB7XG4gICAgbmV3X3NlbGVjdGlvbnMucHVzaCh7XG4gICAgICBhbmNob3I6IHtcbiAgICAgICAgbGluZTogaSxcbiAgICAgICAgY2g6IGkgPT0gYW5jaG9yLmxpbmUgPyBhbmNob3IuY2ggOiAwLFxuICAgICAgfSxcbiAgICAgIGhlYWQ6IHtcbiAgICAgICAgbGluZTogaSxcbiAgICAgICAgY2g6IGkgPT0gaGVhZC5saW5lID8gaGVhZC5jaCA6IEluZmluaXR5LFxuICAgICAgfSxcbiAgICB9KVxuICB9XG4gIGNtLnNldFNlbGVjdGlvbnMobmV3X3NlbGVjdGlvbnMpXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuZGVmaW5lU2ltcGxlTW9kZShcInRleHRcIiwge1xuICBzdGFydDogW10sXG4gIGNvbW1lbnQ6IFtdLFxuICBtZXRhOiB7fSxcbn0pXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcblxudmFyIG9wZW4gPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIHZhciBjbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIGJhY2tkcm9wLnJlbW92ZSgpXG4gIH1cbiAgcmV0dXJuIGNsb3NlXG59XG5cbnZhciB2aWV3ID0gZnVuY3Rpb24oY29udGVudCwgY2xhc3NfbmFtZSkge1xuICB2YXIgYmFja2Ryb3AgPSAkKCc8ZGl2IGNsYXNzPVwiYmFja2Ryb3BcIj4nKS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICB2YXIgZGlhbG9nID0gJCgnPGRpdiBjbGFzcz1cImRpYWxvZ1wiPicpLmFwcGVuZFRvKGJhY2tkcm9wKVxuICBkaWFsb2cuYWRkQ2xhc3MoY2xhc3NfbmFtZSlcbiAgZGlhbG9nLmFwcGVuZChjb250ZW50KVxuICByZXR1cm4gYmFja2Ryb3Bcbn1cblxubW9kdWxlLmV4cG9ydHMudmlldyA9IHZpZXdcbiIsImNvbnN0IFJlYWN0ID0gcmVxdWlyZShcInJlYWN0XCIpXG5jb25zdCBSZWFjdERPTSA9IHJlcXVpcmUoXCJyZWFjdC1kb21cIilcbnZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIEVkaXRvclZpZXcgPSByZXF1aXJlKFwiLi9lZGl0b3Itdmlld1wiKVxuY29uc3QgRmlsZVRhYkxpc3QgPSByZXF1aXJlKFwiLi9maWxlLXRhYi1saXN0LmpzeFwiKVxuXG52YXIgRWRpdG9yTWFuYWdlclZpZXcgPSBmdW5jdGlvbigkcm9vdCwgZWRpdG9yX21ncikge1xuICB2YXIgJHRhYnMgPSAkKFwiPGRpdj5cIikuYXR0cihcImlkXCIsIFwiZmlsZXNcIikuYXBwZW5kVG8oJHJvb3QpXG4gIHZhciAkZWRpdG9ycyA9ICQoXCI8ZGl2PlwiKS5hdHRyKFwiaWRcIiwgXCJlZGl0b3JzXCIpLmFwcGVuZFRvKCRyb290KVxuICBcbiAgY29uc3QgcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgUmVhY3RET00ucmVuZGVyKFxuICAgICAgKFxuICAgICAgICA8RmlsZVRhYkxpc3RcbiAgICAgICAgICBlZGl0b3JNZ3I9e2VkaXRvcl9tZ3J9XG4gICAgICAgICAgLz5cbiAgICAgICksXG4gICAgICAkdGFic1swXVxuICAgIClcbiAgfVxuICBcbiAgZWRpdG9yX21nci5vcGVuZWQuYWRkKGZ1bmN0aW9uKGVkaXRvcikge1xuICAgIGNvbnN0IHBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpXG4gICAgcmVuZGVyKClcbiAgICBlZGl0b3Iuc3RhdHVzLm9ic2VydmUoKCkgPT4ge1xuICAgICAgcmVuZGVyKClcbiAgICB9KVxuICAgIC8vIGVkaXRvciB2aWV3XG4gICAgdmFyICRlZGl0b3IgPSAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJlZGl0b3JcIikuYXBwZW5kVG8oJGVkaXRvcnMpXG4gICAgdmFyIGVkaXRvcl92aWV3ID0gRWRpdG9yVmlldygkZWRpdG9yLCBlZGl0b3IsIGVkaXRvcl9tZ3IpXG4gICAgXG4gICAgZWRpdG9yc1twYXRoXSA9IHtcbiAgICAgICRlZGl0b3I6ICRlZGl0b3IsXG4gICAgfVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5jbG9zZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICByZW5kZXIoKVxuICAgIGVkaXRvcnNbcGF0aF0uJGVkaXRvci5yZW1vdmUoKVxuICAgIGRlbGV0ZSBlZGl0b3JzW3BhdGhdXG4gIH0pXG4gIFxuICBlZGl0b3JfbWdyLmFjdGl2YXRlZC5hZGQocmVuZGVyKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvck1hbmFnZXJWaWV3XG4iLCJ2YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRmlsZSA9IHJlcXVpcmUoXCIuL2ZpbGVcIilcbnZhciBFZGl0b3IgPSByZXF1aXJlKFwiLi9lZGl0b3JcIilcblxudmFyIEVkaXRvck1hbmFnZXIgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIG9wZW5lZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgY2xvc2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBhY3RpdmF0ZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGFjdGl2ZTogbnVsbCwgLy8gcGF0aCBvZiBhY3RpdmUgZmlsZVxuICAgIGVkaXRvcnM6IFtdLFxuICAgIFxuICAgIGdldEZpbGVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5lZGl0b3JzLm1hcChmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgICAgcmV0dXJuIGVkaXRvci5nZXRQYXRoKClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBvcGVuOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBcIlRoZSBwYXRoIGlzIG51bGxcIlxuICAgICAgfVxuICAgICAgLy8gdHJ5IHRvIGFjdGl2YXRlIGFscmVhZHkgb3BlbmVkIGZpbGVzXG4gICAgICBpZiAobW9kZWwuYWN0aXZhdGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgZWRpdG9yID0gRWRpdG9yKEZpbGUocGF0aCkpXG4gICAgICBlZGl0b3IubG9hZCgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGVsLmVkaXRvcnMucHVzaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLm9wZW5lZC5kaXNwYXRjaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLmFjdGl2YXRlKHBhdGgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgZ2V0QWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5hY3RpdmVcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgICBpZiAocGF0aCAhPT0gbnVsbCAmJiBtb2RlbC5pbmRleE9mKHBhdGgpID09IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZlID0gcGF0aFxuICAgICAgbW9kZWwuYWN0aXZhdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICBmaW5kZXIuc2V0UGF0aChwYXRoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFxuICAgIG5leHRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUodHJ1ZSlcbiAgICB9LFxuICAgIFxuICAgIHByZXZGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUoZmFsc2UpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGVGaWxlOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuZWRpdG9ycy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHhcbiAgICAgIGlmIChtb2RlbC5hY3RpdmUgPT09IG51bGwpIHtcbiAgICAgICAgaWR4ID0gbmV4dCA/IDAgOiBtb2RlbC5lZGl0b3JzLmxlbmd0aCAtIDFcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZHggPSBtb2RlbC5pbmRleE9mKG1vZGVsLmFjdGl2ZSlcbiAgICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICAgIGlkeCA9IChpZHggKyBtb2RlbC5lZGl0b3JzLmxlbmd0aCkgJSBtb2RlbC5lZGl0b3JzLmxlbmd0aFxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZhdGUobW9kZWwuZWRpdG9yc1tpZHhdLmdldFBhdGgoKSlcbiAgICB9LFxuICAgIFxuICAgIGNsb3NlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaW5kZXhPZihwYXRoKVxuICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgaWYgKG1vZGVsLmVkaXRvcnMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBtb2RlbC5hY3RpdmF0ZShudWxsKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1vZGVsLnByZXZGaWxlKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbW9kZWwuZWRpdG9ycy5zcGxpY2UoaWR4LCAxKVxuICAgICAgbW9kZWwuY2xvc2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICByZWxvYWQ6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5vcGVuKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBpbmRleE9mOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZ2V0RmlsZXMoKS5pbmRleE9mKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnNlbGVjdGVkLmFkZChtb2RlbC5vcGVuKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yTWFuYWdlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCIuL2NvZGVtaXJyb3JcIilcbnZhciBTZWxlY3RFbmNvZGluZ0RpYWxvZ1ZpZXcgPSByZXF1aXJlKFwiLi9zZWxlY3QtZW5jb2RpbmctZGlhbG9nLXZpZXdcIilcblxudmFyIEVkaXRvclZpZXcgPSBmdW5jdGlvbigkcm9vdCwgZWRpdG9yLCBlZGl0b3JfbWdyKSB7XG4gIHZhciBmaWxlID0gZWRpdG9yLmdldEZpbGUoKVxuICBcbiAgdmFyIGNtID0gQ29kZU1pcnJvcigkcm9vdFswXSwge1xuICAgIHZhbHVlOiBlZGl0b3IudGV4dC5nZXQoKSxcbiAgICBtb2RlOiBlZGl0b3IubW9kZS5nZXQoKSxcbiAgfSlcbiAgXG4gIC8vIGZvb3RlclxuICAkcm9vdC5hcHBlbmQoXG4gICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1lb2wgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxidXR0b24gY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmcgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgKVxuICApXG4gIFxuICBTZWxlY3RFbmNvZGluZ0RpYWxvZ1ZpZXcoXG4gICAgZWRpdG9yLnNlbGVjdF9lbmNvZGluZ19kaWFsb2dcbiAgKVxuICBcbiAgLy8gc2F2ZVxuICB2YXIgbGFzdF9nZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBnZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICAgIGVkaXRvci5zYXZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGxhc3RfZ2VuZXJhdGlvbiA9IGdlbmVyYXRpb25cbiAgICB9KVxuICB9XG4gIGNtLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IudGV4dC5zZXQoY20uZ2V0VmFsdWUoKSlcbiAgICBlZGl0b3Iuc3RhdHVzLnNldChcbiAgICAgIGNtLmlzQ2xlYW4obGFzdF9nZW5lcmF0aW9uKSA/IFwiY2xlYW5cIiA6IFwibW9kaWZpZWRcIlxuICAgIClcbiAgfSlcbiAgZWRpdG9yLnRleHQub2JzZXJ2ZShmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKHRleHQgIT0gY20uZ2V0VmFsdWUoKSkge1xuICAgICAgY20uc2V0VmFsdWUodGV4dClcbiAgICB9XG4gIH0pXG5cbiAgLy8gbW9kZVxuICB2YXIgdXBkYXRlTW9kZSA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICBjbS5zZXRPcHRpb24oXCJtb2RlXCIsIG1vZGUpXG4gICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKVxuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlKVxuICB9XG4gIGVkaXRvci5tb2RlLm9ic2VydmUodXBkYXRlTW9kZSlcbiAgdXBkYXRlTW9kZShlZGl0b3IubW9kZS5nZXQoKSlcbiAgXG4gIC8vIGluZGVudFxuICB2YXIgdXBkYXRlSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpXG4gICAgaWYgKHR5cGUgPT0gXCJUQUJcIikge1xuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjbS5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCBmYWxzZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgTnVtYmVyKHR5cGUucmVwbGFjZShcIlNQXCIsIFwiXCIpKSlcbiAgICB9XG4gIH1cbiAgZWRpdG9yLmluZGVudC5vYnNlcnZlKHVwZGF0ZUluZGVudClcbiAgdXBkYXRlSW5kZW50KGVkaXRvci5pbmRlbnQuZ2V0KCkpXG4gICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IuaW5kZW50LnJvdGF0ZSgpXG4gIH0pXG4gIFxuICAvLyBsaW5lIHNlcHJhdG9yXG4gIHZhciB1cGRhdGVFb2wgPSBmdW5jdGlvbihlb2wpIHtcbiAgICB2YXIgbmFtZXMgPSB7XG4gICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICBcIlxcblwiOiBcIkxGXCIsXG4gICAgICBcIlxcclxcblwiOiBcIkNSTEZcIixcbiAgICB9XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQobmFtZXNbZW9sXSlcbiAgfVxuICBmaWxlLmVvbC5vYnNlcnZlKHVwZGF0ZUVvbClcbiAgdXBkYXRlRW9sKGZpbGUuZW9sLmdldCgpKVxuICAkcm9vdC5maW5kKFwiLmVkaXRvci1lb2xcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgZmlsZS5lb2wucm90YXRlKClcbiAgfSlcbiAgXG4gIC8vIGVuY29kaW5nXG4gIHZhciB1cGRhdGVFbmNvZGluZyA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZylcbiAgfVxuICBmaWxlLmVuY29kaW5nLmFkZCh1cGRhdGVFbmNvZGluZylcbiAgdXBkYXRlRW5jb2RpbmcoZmlsZS5lbmNvZGluZy5nZXQoKSlcbiAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yLnNlbGVjdF9lbmNvZGluZ19kaWFsb2cuc2hvdyhcbiAgICAgIGZpbGUuZW5jb2RpbmcuZ2V0KClcbiAgICApXG4gIH0pXG4gIGVkaXRvci5zZWxlY3RfZW5jb2RpbmdfZGlhbG9nLmNvbmZpcm1lZC5hZGQoZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICBmaWxlLmVuY29kaW5nLnNldChlbmNvZGluZylcbiAgfSlcbiAgXG4gIC8vIG1lc3NhZ2VcbiAgZWRpdG9yLm1lc3NhZ2Uub2JzZXJ2ZShmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KG1lc3NhZ2UpXG4gIH0pXG4gIFxuICAvLyBhY3RpdmVcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKGFjdGl2ZSkge1xuICAgIGlmIChhY3RpdmUgPT0gZmlsZS5nZXRQYXRoKCkpIHtcbiAgICAgICRyb290LmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBjbS5mb2N1cygpXG4gICAgICBjbS5yZWZyZXNoKClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkcm9vdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH1cbiAgfSlcbiAgXG4gIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgTW91c2V0cmFwKCRyb290WzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2F2ZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcIi4vY29kZW1pcnJvclwiKVxudmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudFwiKVxudmFyIFNlbGVjdEVuY29kaW5nRGlhbG9nID0gcmVxdWlyZShcIi4vc2VsZWN0LWVuY29kaW5nLWRpYWxvZ1wiKVxuXG52YXIgRWRpdG9yID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgZWRpdG9yID0ge1xuICAgIHRleHQ6IE9ic2VydmFibGUoXCJcIiksXG4gICAgc3RhdHVzOiBPYnNlcnZhYmxlKFwiY2xlYW5cIiksXG4gICAgbW9kZTogT2JzZXJ2YWJsZShcInRleHRcIiksXG4gICAgaW5kZW50OiBJbmRlbnQoKSxcbiAgICBtZXNzYWdlOiBPYnNlcnZhYmxlKFwiXCIpLFxuICAgIHNlbGVjdF9lbmNvZGluZ19kaWFsb2c6IFNlbGVjdEVuY29kaW5nRGlhbG9nKCksXG4gICAgXG4gICAgZ2V0RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZS5nZXRQYXRoKClcbiAgICB9LFxuICAgIFxuICAgIGxvYWQ6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgIHJldHVybiBmaWxlLnJlYWQoKS50aGVuKGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgZWRpdG9yLmluZGVudC5zZXQoSW5kZW50LmRldGVjdEluZGVudFR5cGUodGV4dCkpXG4gICAgICAgIGVkaXRvci50ZXh0LnNldCh0ZXh0KVxuICAgICAgICBlZGl0b3IubWVzc2FnZS5zZXQoXCJMb2FkZWQuXCIpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2F2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZS53cml0ZShlZGl0b3IudGV4dC5nZXQoKSkuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiU2F2ZSBmYWlsZWQuIFwiICsgcmVwbHkuZXJyb3IpXG4gICAgICAgIGVkaXRvci5zdGF0dXMuc2V0KFwiZXJyb3JcIilcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGVkaXRvci5zdGF0dXMuc2V0KFwiY2xlYW5cIilcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiU2F2ZWQuXCIpXG4gICAgICB9KVxuICAgIH0sXG4gIH1cbiAgXG4gIHZhciBkZXRlY3RNb2RlID0gKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gcGF0aC5yZXBsYWNlKC8uKlsuXSguKykkLywgXCIkMVwiKVxuICAgIHZhciBtb2RlID0ge1xuICAgICAgaHRtbDogXCJwaHBcIixcbiAgICAgIHRhZzogXCJwaHBcIixcbiAgICB9W2V4dGVuc2lvbl1cbiAgICBpZiAobW9kZSkge1xuICAgICAgcmV0dXJuIG1vZGVcbiAgICB9XG4gICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pXG4gICAgaWYgKG1vZGUpIHtcbiAgICAgIHJldHVybiBtb2RlLm1vZGVcbiAgICB9XG4gICAgcmV0dXJuIFwidGV4dFwiXG4gIH0pXG4gIGVkaXRvci5tb2RlLnNldChkZXRlY3RNb2RlKGZpbGUuZ2V0UGF0aCgpKSlcbiAgXG4gIC8vIGF1dG8gc2F2ZVxuICBlZGl0b3IudGV4dC5vYnNlcnZlKF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgaWYgKGVkaXRvci5zdGF0dXMuZ2V0KCkgIT0gXCJjbGVhblwiKSB7XG4gICAgICBlZGl0b3Iuc2F2ZSgpXG4gICAgfVxuICB9LCA0MDAwKSlcbiAgXG4gIHJldHVybiBlZGl0b3Jcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JcbiIsInZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGVcIilcblxudmFyIEVvbCA9IGZ1bmN0aW9uKGVvbCkge1xuICByZXR1cm4gUm90YXRlKFtcIlxcblwiLCBcIlxcclxcblwiLCBcIlxcclwiXSwgZW9sKVxufVxuXG5Fb2wuZGV0ZWN0ID0gZnVuY3Rpb24odGV4dCkge1xuICBpZiAodGV4dC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiXG4gIH1cbiAgaWYgKHRleHQubWF0Y2goXCJcXHJcIikpIHtcbiAgICByZXR1cm4gXCJcXHJcIlxuICB9XG4gIHJldHVybiBcIlxcblwiXG59XG5cbkVvbC5yZWd1bGF0ZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvKFxcclxcbnxcXHIpLywgXCJcXG5cIilcbn0sXG5cbm1vZHVsZS5leHBvcnRzID0gRW9sXG4iLCJjb25zdCBSZWFjdCA9IHJlcXVpcmUoXCJyZWFjdFwiKVxuY29uc3QgRmlsZVRhYiA9IHJlcXVpcmUoXCIuL2ZpbGUtdGFiLmpzeFwiKVxuXG5jb25zdCBGaWxlVGFiTGlzdCA9IChwcm9wcykgPT4ge1xuICBjb25zdCBtZ3IgPSBwcm9wcy5lZGl0b3JNZ3JcbiAgY29uc3Qgb25DbGljayA9IChwYXRoKSA9PiB7XG4gICAgbWdyLmFjdGl2YXRlKHBhdGgpXG4gIH1cbiAgY29uc3QgaXRlbXMgPSBtZ3IuZWRpdG9ycy5tYXAoKGVkaXRvcikgPT4ge1xuICAgIHJldHVybiAoXG4gICAgICA8RmlsZVRhYlxuICAgICAgICBrZXk9e2VkaXRvci5nZXRQYXRoKCl9XG4gICAgICAgIGVkaXRvcj17ZWRpdG9yfVxuICAgICAgICBhY3RpdmU9e21nci5hY3RpdmUgPT0gZWRpdG9yLmdldFBhdGgoKX1cbiAgICAgICAgb25DbGljaz17b25DbGlja31cbiAgICAgICAgLz5cbiAgICApXG4gIH0pXG4gIHJldHVybiAoXG4gICAgPGRpdiBpZD1cImZpbGVzXCI+e2l0ZW1zfTwvZGl2PlxuICApXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZVRhYkxpc3RcbiIsImNvbnN0IFJlYWN0ID0gcmVxdWlyZShcInJlYWN0XCIpXG5cbmNvbnN0IEZpbGVUYWIgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgcGF0aCA9IHByb3BzLmVkaXRvci5nZXRQYXRoKClcbiAgY29uc3QgZGlyID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKyRcIiksIFwiXCIpXG4gIGNvbnN0IG5hbWUgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIi4qL1wiKSwgXCJcIilcbiAgY29uc3Qgb25DbGljayA9IChlKSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgcHJvcHMub25DbGljayhwYXRoKVxuICB9XG4gIHJldHVybiAoXG4gICAgPGRpdlxuICAgICAgY2xhc3NOYW1lPXtcImZpbGUtaXRlbSBcIiArIChwcm9wcy5hY3RpdmUgPyBcImFjdGl2ZVwiIDogXCJcIil9XG4gICAgICBvbkNsaWNrPXtvbkNsaWNrfT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZGlyXCI+e2Rpcn08L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibmFtZVwiPntuYW1lfTwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9e1wic3RhdHVzIFwiICsgcHJvcHMuZWRpdG9yLnN0YXR1cy5nZXQoKX0+PC9kaXY+XG4gICAgPC9kaXY+XG4gIClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlVGFiXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxudmFyIEVvbCA9IHJlcXVpcmUoXCIuL2VvbFwiKVxuXG52YXIgRmlsZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGZpbGUgPSB7XG4gICAgZW9sOiBFb2woKSxcbiAgICBlbmNvZGluZzogT2JzZXJ2YWJsZSgpLFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBhdGhcbiAgICB9LFxuICAgIFxuICAgIHJlYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgICAgdXJsOiBcIi9yZWFkLnBocFwiLFxuICAgICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgICAgfSkuZmFpbChyZWplY3QpLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICBmaWxlLmVuY29kaW5nLnNldChyZXBseS5lbmNvZGluZylcbiAgICAgICAgICBmaWxlLmVvbC5zZXQoRW9sLmRldGVjdChyZXBseS5jb250ZW50KSlcbiAgICAgICAgICB2YXIgY29udGVudCA9IEVvbC5yZWd1bGF0ZShyZXBseS5jb250ZW50KVxuICAgICAgICAgIHJlc29sdmUoY29udGVudClcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB3cml0ZTogZnVuY3Rpb24odGV4dCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogXCIvd3JpdGUucGhwXCIsXG4gICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICBlbmNvZGluZzogZmlsZS5lbmNvZGluZy5nZXQoKSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IHRleHQucmVwbGFjZSgvXFxuL2csIGZpbGUuZW9sLmdldCgpKVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgICAgaWYgKHJlcGx5ID09IFwib2tcIikge1xuICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHJlcGx5LmVycm9yKVxuICAgICAgICAgIH1cbiAgICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZWplY3QoXCJcIilcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSxcbiAgfVxuICByZXR1cm4gZmlsZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuXG52YXIgRmluZGVyU3VnZ2VzdFZpZXcgPSBmdW5jdGlvbigkcm9vdCwgbW9kZWwpIHtcbiAgdmFyICRsaXN0ID0gJHJvb3RcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHVwZGF0ZUl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgJGxpc3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIikuZW1wdHkoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxICYmIGl0ZW1zWzBdID09IG1vZGVsLmdldEN1cnNvcigpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIG5hbWVfcnggPSBuZXcgUmVnRXhwKFwiLyhbXi9dKi8/KSRcIilcbiAgICAgICRsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVfcnguZXhlYyhpdGVtKVsxXVxuICAgICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgICB9KSlcbiAgICAgICRsaXN0LnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkbGlzdC5maW5kKFwiYS5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBhID0gJGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gICAgICB9KVxuICAgICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcblxuICAgICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KClcbiAgICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgICAgdmFyIHZpZXdfaGVpZ2h0ID0gJGxpc3QuaW5uZXJIZWlnaHQoKVxuICAgICAgICBpZiAodG9wIC0gJGxpc3Quc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICAgICAgJGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm90dG9tIC0gJGxpc3Quc2Nyb2xsVG9wKCkgPiB2aWV3X2hlaWdodCkge1xuICAgICAgICAgICRsaXN0LnNjcm9sbFRvcChib3R0b20gLSB2aWV3X2hlaWdodClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2Nyb2xsSW50b1ZpZXcoYSlcbiAgICB9XG4gIH1cbiAgXG4gIG1vZGVsLml0ZW1zX2NoYW5nZWQuYWRkKHZpZXcudXBkYXRlSXRlbXMpXG4gIG1vZGVsLmN1cnNvcl9tb3ZlZC5hZGQodmlldy51cGRhdGVDdXJzb3IpXG4gIFxuICAvLyB3aGVuIGl0ZW0gd2FzIHNlbGVjdGVkXG4gICRsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIFxuICAvLyBwcmV2ZW50IGZyb20gbG9vc2luZyBmb2N1c1xuICAkbGlzdC5vbihcIm1vdXNlZG93blwiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICB9KVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0Vmlld1xuIiwidmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBGaW5kZXJTdWdnZXN0ID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBpdGVtczogW10sXG4gICAgY3Vyc29yOiBudWxsLCAvLyBoaWdobGlnaHRlZCBpdGVtXG4gICAgXG4gICAgaXRlbXNfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIGN1cnNvcl9tb3ZlZDogbmV3IFNpZ25hbCgpLFxuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICB1cmw6IFwiL2ZpbmRlci5waHBcIixcbiAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZmFpbGVkIHRvIGZldGNoIHN1Z2dlc3QgZm9yIHRoZSBwYXRoOiBcIiArIHBhdGgpXG4gICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgIG1vZGVsLnNldEl0ZW1zKHJlcGx5Lml0ZW1zLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlcGx5LmJhc2UgKyBpXG4gICAgICAgIH0pKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHNldEl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG51bGwpXG4gICAgICBtb2RlbC5pdGVtcyA9IGl0ZW1zXG4gICAgICBtb2RlbC5pdGVtc19jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLml0ZW1zKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLml0ZW1zXG4gICAgfSxcbiAgICBcbiAgICBnZXRDdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmN1cnNvclxuICAgIH0sXG4gICAgXG4gICAgc2V0Q3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuY3Vyc29yKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuY3Vyc29yID0gcGF0aFxuICAgICAgbW9kZWwuY3Vyc29yX21vdmVkLmRpc3BhdGNoKG1vZGVsLmN1cnNvcilcbiAgICB9LFxuICAgIFxuICAgIG1vdmVDdXJzb3I6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5jdXJzb3IgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKG1vZGVsLml0ZW1zLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zWzBdKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IG1vZGVsLml0ZW1zLmluZGV4T2YobW9kZWwuY3Vyc29yKVxuICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICBpZHggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb2RlbC5pdGVtcy5sZW5ndGggLSAxLCBpZHgpKVxuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zW2lkeF0pXG4gICAgfSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihwYXRoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIG1vZGVsLnVwZGF0ZShmaW5kZXIuZ2V0UGF0aCgpKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKF8uZGVib3VuY2UobW9kZWwudXBkYXRlLCAyNTApKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIEZhbHNlID0gcmVxdWlyZShcIi4vcmV0dXJuLWZhbHNlXCIpXG52YXIgSW5wdXRXYXRjaGVyID0gcmVxdWlyZShcIi4vaW5wdXQtd2F0Y2hlclwiKVxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3Qtdmlld1wiKVxuXG52YXIgRmluZGVyVmlldyA9IGZ1bmN0aW9uKCRyb290LCBmaW5kZXIpIHtcbiAgdmFyICRwYXRoX2lucHV0ID0gJChcbiAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJmaW5kZXItcGF0aFwiIGNsYXNzPVwibW91c2V0cmFwXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCIgdmFsdWU9XCIvXCI+J1xuICApLmFwcGVuZFRvKCRyb290KVxuICBcbiAgdmFyIHBhdGhfd2F0Y2hlciA9IElucHV0V2F0Y2hlcigkcGF0aF9pbnB1dCwgNTApXG4gIHBhdGhfd2F0Y2hlci5jaGFuZ2VkLmFkZChmaW5kZXIuc2V0UGF0aClcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgJHJvb3QuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgICRwYXRoX2lucHV0LmZvY3VzKClcbiAgICAgIHBhdGhfd2F0Y2hlci5zdGFydCgpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICRyb290LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RvcCgpXG4gICAgfSxcbiAgfVxuICBcbiAgLy8gaGlkZSBvbiBibHVyXG4gICRwYXRoX2lucHV0LmJsdXIoZmluZGVyLmhpZGUoKSlcbiAgXG4gIGZpbmRlci52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgdmlldy5zaG93KClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2aWV3LmhpZGUoKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAkcGF0aF9pbnB1dC52YWwocGF0aClcbiAgfSlcbiAgXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcImVudGVyXCIsIEZhbHNlKGZpbmRlci5lbnRlcikpXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcInRhYlwiLCBGYWxzZShmaW5kZXIudGFiKSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwiZXNjXCIsIEZhbHNlKGZpbmRlci5oaWRlKSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwiZG93blwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc3VnZ2VzdC5tb3ZlQ3Vyc29yKHRydWUpXG4gIH0pKVxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ1cFwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc3VnZ2VzdC5tb3ZlQ3Vyc29yKGZhbHNlKVxuICB9KSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwibW9kK3VcIiwgRmFsc2UoXG4gICAgZmluZGVyLmdvVG9QYXJlbnREaXJlY3RvcnlcbiAgKSlcbiAgXG4gIC8vIHN1Z2dlc3Qgdmlld1xuICB2YXIgJGl0ZW1zID0gJCgnPGRpdiBpZD1cImZpbmRlci1pdGVtc1wiPicpLmFwcGVuZFRvKCRyb290KVxuICBGaW5kZXJTdWdnZXN0VmlldygkaXRlbXMsIGZpbmRlci5zdWdnZXN0KVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJWaWV3XG4iLCJ2YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0XCIpXG5cbnZhciBGaW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgcGF0aF9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgdmlzaWJpbGl0eV9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgcGF0aDogXCJcIixcbiAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgocGF0aClcbiAgICAgIGlmIChwYXRoLnN1YnN0cigtMSkgPT0gXCIvXCIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5oaWRlKClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSB0cnVlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IGZhbHNlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbi8vICAgICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKGVkaXRvcl9tYW5hZ2VyLmdldEFjdGl2ZSgpKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwucGF0aFxuICAgIH0sXG4gICAgXG4gICAgc2V0UGF0aDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwucGF0aCA9IHBhdGhcbiAgICAgIG1vZGVsLnBhdGhfY2hhbmdlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgZ29Ub1BhcmVudERpcmVjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKFxuICAgICAgICBtb2RlbC5wYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKVxuICAgICAgKVxuICAgIH0sXG4gICAgXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhdGggPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBtb2RlbC5zZWxlY3QocGF0aCA/IHBhdGggOiBtb2RlbC5wYXRoKVxuICAgIH0sXG4gICAgXG4gICAgdGFiOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoY3Vyc29yKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpdGVtcyA9IHN1Z2dlc3QuZ2V0SXRlbXMoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoaXRlbXNbMF0pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgc3VnZ2VzdC51cGRhdGUobW9kZWwucGF0aClcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgc3VnZ2VzdCA9IG1vZGVsLnN1Z2dlc3QgPSBGaW5kZXJTdWdnZXN0KG1vZGVsKVxuICBzdWdnZXN0LnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwuc2VsZWN0KHBhdGgpXG4gIH0pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJcbiIsInZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGVcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCI0U1BcIiwgXCIyU1BcIiwgXCJUQUJcIl0sIHR5cGUpXG59XG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBJbnB1dFdhdGNoZXIgPSBmdW5jdGlvbihpbnB1dCwgaW50ZXJ2YWwpIHtcbiAgaW5wdXQgPSAkKGlucHV0KVxuICBcbiAgdmFyIG1vZGVsID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBpbnB1dDogaW5wdXQsXG4gICAgaW50ZXJ2YWw6IGludGVydmFsLFxuICAgIGxhc3RfdmFsdWU6IGlucHV0LnZhbCgpLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIFxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnN0b3AoKVxuICAgICAgbW9kZWwudGltZXIgPSBzZXRJbnRlcnZhbChtb2RlbC5jaGVjaywgbW9kZWwuaW50ZXJ2YWwpXG4gICAgfSxcbiAgICBcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwobW9kZWwudGltZXIpXG4gICAgICBtb2RlbC50aW1lciA9IG51bGxcbiAgICB9LFxuICAgIFxuICAgIGNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbW9kZWwuaW5wdXQudmFsKClcbiAgICAgIGlmIChjdXJyZW50ID09IG1vZGVsLmxhc3RfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jaGFuZ2VkLmRpc3BhdGNoKGN1cnJlbnQsIG1vZGVsLmxhc3RfdmFsdWUpXG4gICAgICBtb2RlbC5sYXN0X3ZhbHVlID0gY3VycmVudFxuICAgIH0sXG4gICAgXG4gICAga2V5RG93bjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAobW9kZWwudGltZXIpIHtcbiAgICAgICAgbW9kZWwuY2hlY2soKVxuICAgICAgfVxuICAgIH0sXG4gIH1cbiAgXG4gIGlucHV0LmtleWRvd24obW9kZWwua2V5RG93bilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0V2F0Y2hlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgRWRpdG9yTWFuYWdlclZpZXcgPSByZXF1aXJlKFwiLi9lZGl0b3ItbWFuYWdlci12aWV3XCIpXG52YXIgRmluZGVyVmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci12aWV3XCIpXG5cbnZhciBNYWluVmlldyA9IGZ1bmN0aW9uKGVkaXRvcl9tZ3IsIGZpbmRlcikge1xuICB2YXIgJG1haW4gPSAkKFwibWFpblwiKVxuICBFZGl0b3JNYW5hZ2VyVmlldyhcbiAgICAkKCc8ZGl2IGlkPVwiZWRpdG9yX21hbmFnZXJcIj4nKS5hcHBlbmRUbygkbWFpbiksXG4gICAgZWRpdG9yX21nclxuICApXG4gIEZpbmRlclZpZXcoXG4gICAgJCgnPGZvcm0gaWQ9XCJmaW5kZXJcIj4nKS5hcHBlbmRUbygkbWFpbiksXG4gICAgZmluZGVyXG4gIClcbiAgXG4gIC8vIHNob3J0Y3V0IGtleXNcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kKztcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5uZXh0RmlsZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrc2hpZnQrO1wiLCBcIm1vZCtzaGlmdCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IuY2xvc2UoZWRpdG9yX21nci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnJlbG9hZChlZGl0b3JfbWdyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNYWluVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBvYnNlcnZhYmxlID0gbmV3IFNpZ25hbCgpXG4gIE9iamVjdC5hc3NpZ24ob2JzZXJ2YWJsZSwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUgPT09IG5ld192YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBvbGRfdmFsdWUgPSB2YWx1ZVxuICAgICAgdmFsdWUgPSBuZXdfdmFsdWVcbiAgICAgIG9ic2VydmFibGUuZGlzcGF0Y2godmFsdWUsIG9sZF92YWx1ZSwgb2JzZXJ2YWJsZSlcbiAgICB9LFxuICAgIG9ic2VydmU6IG9ic2VydmFibGUuYWRkLCAvLyBhbGlhc1xuICB9KVxuICByZXR1cm4gb2JzZXJ2YWJsZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9ic2VydmFibGVcbiIsInZhciByZXR1cm5GYWxzZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmV0dXJuRmFsc2VcbiIsInZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxuXG52YXIgUm90YXRlID0gZnVuY3Rpb24odmFsdWVzLCB2YWx1ZSkge1xuICB2YXIgaXNWYWxpZFZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZXMuaW5kZXhPZih2KSAhPSAtMVxuICB9XG4gIFxuICB2YXIgY2hlY2tWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoIWlzVmFsaWRWYWx1ZSh2KSkge1xuICAgICAgdGhyb3cgXCJpbnZhbGlkIHZhbHVlOiBcIiArIHZcbiAgICB9XG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSBPYnNlcnZhYmxlKHZhbHVlKVxuICBcbiAgcm90YXRlLmdldFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB2YWx1ZXNcbiAgfVxuICBcbiAgdmFyIF9zZXQgPSByb3RhdGUuc2V0XG4gIHJvdGF0ZS5zZXQgPSBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICBjaGVja1ZhbHVlKG5ld192YWx1ZSlcbiAgICBfc2V0KG5ld192YWx1ZSlcbiAgfVxuICBcbiAgcm90YXRlLnJvdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpZHggPSB2YWx1ZXMuaW5kZXhPZihyb3RhdGUuZ2V0KCkpXG4gICAgaWR4ID0gKGlkeCArIDEpICUgdmFsdWVzLmxlbmd0aFxuICAgIHJvdGF0ZS5zZXQodmFsdWVzW2lkeF0pXG4gIH1cbiAgXG4gIHJldHVybiByb3RhdGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSb3RhdGVcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIERpYWxvZyA9IHJlcXVpcmUoXCIuL2RpYWxvZ1wiKVxuXG52YXIgU2VsZWN0RW5jb2RpbmdEaWFsb2dWaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgdmFyICRjb250ZW50ID0gJCgnPGRpdj4nKS5hcHBlbmQoXG4gICAgJCgnPHNlbGVjdCBzaXplPVwiNFwiPicpLFxuICAgICQoJzxidXR0b24gY2xhc3M9XCJva1wiPk9LPC9idXR0b24+JyksXG4gICAgJCgnPGJ1dHRvbiBjbGFzcz1cImNhbmNlbFwiPkNhbmNlbDwvYnV0dG9uPicpXG4gIClcbiAgXG4gIHZhciAkZGlhbG9nID0gRGlhbG9nLnZpZXcoJGNvbnRlbnQsIFwic2VsZWN0LWVuY29kaW5nLWRpYWxvZ1wiKVxuXG4gIHZhciAkc2VsZWN0ID0gJGNvbnRlbnQuZmluZChcInNlbGVjdFwiKVxuICAkc2VsZWN0LmFwcGVuZChtb2RlbC5vcHRpb25zLm1hcChmdW5jdGlvbihlbmNvZGluZykge1xuICAgIHJldHVybiAkKCc8b3B0aW9uPicpLnRleHQoZW5jb2RpbmcpXG4gIH0pKVxuICBtb2RlbC5lbmNvZGluZy5vYnNlcnZlKGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHNlbGVjdC52YWwoZW5jb2RpbmcpXG4gIH0pXG4gICRzZWxlY3QudmFsKG1vZGVsLmVuY29kaW5nLmdldCgpKVxuICAkc2VsZWN0LmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLmVuY29kaW5nLnNldCgkc2VsZWN0LnZhbCgpKVxuICB9KVxuICBcbiAgLy8gb2tcbiAgJGNvbnRlbnQuZmluZChcImJ1dHRvbi5va1wiKS5jbGljayhtb2RlbC5jb25maXJtKVxuICBcbiAgLy8gY2FuY2VsXG4gICRjb250ZW50LmZpbmQoXCJidXR0b24uY2FuY2VsXCIpLmNsaWNrKG1vZGVsLmhpZGUpXG4gIFxuICBtb2RlbC52aXNpYmxlLm9ic2VydmUoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAkZGlhbG9nLmFkZENsYXNzKFwidmlzaWJsZVwiKVxuICAgICAgJGNvbnRlbnQuZmluZChcImlucHV0LCBzZWxlY3RcIikuZm9jdXMoKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICRkaWFsb2cucmVtb3ZlQ2xhc3MoXCJ2aXNpYmxlXCIpXG4gICAgfVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdEVuY29kaW5nRGlhbG9nVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcblxudmFyIFNlbGVjdEVuY29kaW5nRGlhbG9nID0gZnVuY3Rpb24oKSB7XG4gIFxuICB2YXIgZGlhbG9nID0ge1xuICAgIHZpc2libGU6IE9ic2VydmFibGUoZmFsc2UpLFxuICAgIGVuY29kaW5nOiBPYnNlcnZhYmxlKCksXG4gICAgb3B0aW9uczogW1xuICAgICAgXCJVVEYtOFwiLFxuICAgICAgXCJFVUMtSlBcIixcbiAgICAgIFwiU0pJUy1XSU5cIixcbiAgICBdLFxuICAgIGNvbmZpcm1lZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIGNvbmZpcm06IGZ1bmN0aW9uKCkge1xuICAgICAgZGlhbG9nLnZpc2libGUuc2V0KGZhbHNlKVxuICAgICAgZGlhbG9nLmNvbmZpcm1lZC5kaXNwYXRjaChkaWFsb2cuZW5jb2RpbmcuZ2V0KCkpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbihlbmNvZGluZykge1xuICAgICAgZGlhbG9nLmVuY29kaW5nLnNldChlbmNvZGluZylcbiAgICAgIGRpYWxvZy52aXNpYmxlLnNldCh0cnVlKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICBkaWFsb2cudmlzaWJsZS5zZXQoZmFsc2UpXG4gICAgfSxcbiAgfVxuICByZXR1cm4gZGlhbG9nXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0RW5jb2RpbmdEaWFsb2dcbiIsInZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG52YXIgRWRpdG9yTWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci1tYW5hZ2VyXCIpXG52YXIgRmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyXCIpXG52YXIgTWFpblZpZXcgPSByZXF1aXJlKFwiLi9tYWluLXZpZXdcIilcblxubW9kdWxlLmV4cG9ydHMucnVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmaW5kZXIgPSBGaW5kZXIoKVxuICB2YXIgZWRpdG9yX21nciA9IEVkaXRvck1hbmFnZXIoZmluZGVyKVxuICB2YXIgdmlldyA9IE1haW5WaWV3KGVkaXRvcl9tZ3IsIGZpbmRlcilcbiAgXG4gIHZhciBzYXZlRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmlsZXMgPSBlZGl0b3JfbWdyLmdldEZpbGVzKClcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm9wZW4tZmlsZXNcIiwgSlNPTi5zdHJpbmdpZnkoZmlsZXMpKVxuICB9XG4gIHZhciBsb2FkRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm9wZW4tZmlsZXNcIikgfHwgXCJbXVwiKVxuICB9XG4gIGxvYWRGaWxlTGlzdCgpLmZvckVhY2goZnVuY3Rpb24ocGF0aCkge1xuICAgIGVkaXRvcl9tZ3Iub3BlbihwYXRoKVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5vcGVuZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgZWRpdG9yX21nci5jbG9zZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgXG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zaG93KClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG59XG4iXX0=
>>>>>>> Use React for file tabs
=======
},{"./editor-manager":10,"./finder":21,"./main-view":24,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZGlhbG9nLmpzIiwianMvZWRpdG9yLW1hbmFnZXItdmlldy5qcyIsImpzL2VkaXRvci1tYW5hZ2VyLmpzIiwianMvZWRpdG9yLXZpZXcuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9lb2wuanMiLCJqcy9maWxlLXRhYi1saXN0LmpzeCIsImpzL2ZpbGUtdGFiLmpzeCIsImpzL2ZpbGUuanMiLCJqcy9maW5kZXItc3VnZ2VzdC1pdGVtLmpzeCIsImpzL2ZpbmRlci1zdWdnZXN0LmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanN4IiwianMvZmluZGVyLXZpZXcuanMiLCJqcy9maW5kZXIuanMiLCJqcy9maW5kZXIuanN4IiwianMvaW5kZW50LmpzIiwianMvbWFpbi12aWV3LmpzIiwianMvb2JzZXJ2YWJsZS5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL3NlbGVjdC1lbmNvZGluZy1kaWFsb2ctdmlldy5qcyIsImpzL3NlbGVjdC1lbmNvZGluZy1kaWFsb2cuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSxJQUFJLGFBQWEsUUFBUSxZQUFSLENBQWpCOztBQUVBLElBQUksbUJBQW1CLFNBQW5CLGdCQUFtQixDQUFTLEVBQVQsRUFBYSxNQUFiLEVBQXFCO0FBQzFDLE1BQUksT0FBTyxNQUFQLElBQWlCLE9BQXJCLEVBQThCO0FBQzVCO0FBQ0Q7QUFDRCxNQUFJLFdBQVcsTUFBWCxDQUFrQixPQUFPLElBQXpCLEVBQStCLE9BQU8sRUFBdEMsQ0FBSixFQUErQztBQUM3QztBQUNEO0FBQ0Q7QUFDQSxNQUFJLE9BQU8sR0FBRyxPQUFILENBQVcsT0FBTyxJQUFQLENBQVksSUFBdkIsQ0FBWDtBQUNBLE1BQUksS0FBSyxNQUFMLElBQWUsT0FBTyxJQUFQLENBQVksRUFBL0IsRUFBbUM7QUFDakM7QUFDRDtBQUNEO0FBQ0EsTUFBSSxLQUFLLEtBQUwsQ0FBVyxRQUFYLENBQUosRUFBMEI7QUFDeEI7QUFDRDtBQUNEO0FBQ0EsTUFBSSxPQUFPLElBQVAsQ0FBWSxPQUFPLElBQVAsQ0FBWSxNQUFaLEdBQXFCLENBQWpDLEtBQXVDLEVBQTNDLEVBQStDO0FBQzdDLFdBQU8sSUFBUCxDQUFZLEdBQVo7QUFDRDtBQUNELE1BQUksY0FBYyxPQUFPLElBQVAsQ0FBWSxDQUFaLEVBQWUsS0FBZixDQUFxQixTQUFyQixFQUFnQyxDQUFoQyxDQUFsQjtBQUNBLFNBQU8sSUFBUCxHQUFjLE9BQU8sSUFBUCxDQUFZLEdBQVosQ0FBZ0IsVUFBUyxJQUFULEVBQWUsQ0FBZixFQUFrQjtBQUM5QyxXQUFPLEtBQUssS0FBTCxDQUFXLGVBQVgsQ0FBUDtBQUNBLFFBQUksU0FBUyxLQUFLLENBQUwsQ0FBYjtBQUNBLFFBQUksT0FBTyxLQUFLLENBQUwsQ0FBWDtBQUNBLGFBQVMsQ0FBQyxPQUFPLE1BQVIsRUFBZ0IsTUFBaEIsQ0FBdUIsQ0FBdkIsRUFBMEIsS0FBSyxNQUFMLEdBQWMsT0FBTyxNQUFyQixHQUE4QixZQUFZLE1BQXBFLENBQVQ7QUFDQSxXQUFPLFNBQVMsSUFBaEI7QUFDRCxHQU5hLENBQWQ7QUFPQSxTQUFPLElBQVAsQ0FBWSxDQUFaLElBQWlCLE9BQU8sSUFBUCxDQUFZLENBQVosRUFBZSxNQUFmLENBQXNCLEtBQUssTUFBM0IsQ0FBakI7QUFDRCxDQTdCRDs7QUErQkEsT0FBTyxPQUFQLEdBQWlCLGdCQUFqQjs7Ozs7QUNqQ0EsSUFBSSxhQUFhLFFBQVEsWUFBUixDQUFqQjtBQUNBLElBQUksSUFBSSxRQUFRLFlBQVIsQ0FBUjtBQUNBLFFBQVEsa0JBQVI7QUFDQSxRQUFRLFFBQVI7QUFDQSxRQUFRLGVBQVI7QUFDQSxRQUFRLGVBQVI7QUFDQSxRQUFRLG9CQUFSO0FBQ0EsUUFBUSxhQUFSOztBQUVBLE9BQU8sTUFBUCxDQUFjLFdBQVcsUUFBekIsRUFBbUM7QUFDakMsZUFBYSxJQURvQjtBQUVqQyxXQUFTLENBRndCO0FBR2pDLDJCQUF5QixJQUhRO0FBSWpDLHFCQUFtQixJQUpjO0FBS2pDLGlCQUFlLElBTGtCO0FBTWpDLGFBQVcsSUFOc0I7QUFPakMsaUJBQWUsSUFQa0I7QUFRakMsbUJBQWlCLEVBQUMsVUFBVSxJQUFYLEVBUmdCO0FBU2pDLHFCQUFtQixJQVRjO0FBVWpDLFlBQVUsS0FWdUI7QUFXakMsYUFBVztBQUNULGtCQUFjLGNBREw7QUFFVCxjQUFVLGNBRkQ7QUFHVCxjQUFVLGVBSEQ7QUFJVCxhQUFTLGVBSkE7QUFLVCxXQUFPLFlBTEU7QUFNVCxjQUFVLEtBTkQ7QUFPVCxhQUFTO0FBUEE7QUFYc0IsQ0FBbkM7O0FBc0JBLFdBQVcsY0FBWCxDQUEwQixVQUFTLEVBQVQsRUFBYTtBQUNyQztBQUNBLEtBQUcsRUFBSCxDQUFNLGNBQU4sRUFBc0IsUUFBUSxzQkFBUixDQUF0Qjs7QUFFQTtBQUNBLE1BQUksUUFBUSxHQUFHLGFBQUgsRUFBWjtBQUNBLFFBQU0sU0FBTixJQUFtQixZQUFuQixDQU5xQyxDQU1MO0FBQ2hDLE1BQUksU0FBUztBQUNYLGFBQVMsWUFERTtBQUVYLGFBQVMsYUFGRTtBQUdYLGFBQVMsZUFIRTtBQUlYLGFBQVMsY0FKRTtBQUtYLGFBQVMsTUFMRTtBQU1YLGFBQVMsWUFORTtBQU9YLGFBQVMsWUFQRTtBQVFYLG1CQUFlO0FBUkosR0FBYjtBQVVBLElBQUUsSUFBRixDQUFPLE1BQVAsRUFBZSxVQUFTLE9BQVQsRUFBa0IsR0FBbEIsRUFBdUI7QUFDcEMsY0FBVSxLQUFWLEVBQWlCLElBQWpCLENBQXNCLEdBQXRCLEVBQTJCLFlBQVc7QUFDcEMsU0FBRyxXQUFILENBQWUsT0FBZjtBQUNBLGFBQU8sS0FBUDtBQUNELEtBSEQ7QUFJRCxHQUxEO0FBTUQsQ0F2QkQ7O0FBeUJBLE9BQU8sT0FBUCxHQUFpQixVQUFqQjs7Ozs7QUN4REEsSUFBSSxhQUFhLFFBQVEsWUFBUixDQUFqQjs7QUFFQSxXQUFXLGNBQVgsQ0FBMEIsVUFBUyxFQUFULEVBQWE7QUFDckMsS0FBRyxLQUFILEdBQVcsRUFBWDtBQUNELENBRkQ7O0FBSUEsV0FBVyxRQUFYLENBQW9CLElBQXBCLEdBQTJCLFVBQVMsRUFBVCxFQUFhO0FBQ3RDLE1BQUksU0FBUyxHQUFHLFNBQUgsRUFBYjtBQUNBLE1BQUksTUFBTSxNQUFWLEVBQWtCO0FBQ2hCLFFBQUksT0FBTyxHQUFHLEtBQUgsQ0FBUyxHQUFHLEtBQUgsQ0FBUyxNQUFULEdBQWtCLENBQTNCLENBQVg7QUFDQSxRQUFJLEtBQUssSUFBTCxJQUFhLE9BQU8sSUFBcEIsSUFBNEIsS0FBSyxFQUFMLElBQVcsT0FBTyxFQUFsRCxFQUFzRDtBQUNwRCxTQUFHLGFBQUgsQ0FBaUIsR0FBRyxLQUFILENBQVMsR0FBVCxDQUFhLFVBQVMsQ0FBVCxFQUFZO0FBQ3hDLGVBQU8sRUFBQyxNQUFNLENBQVAsRUFBVSxRQUFRLENBQWxCLEVBQVA7QUFDRCxPQUZnQixDQUFqQixFQUVJLEdBQUcsS0FBSCxDQUFTLE1BQVQsR0FBa0IsQ0FGdEI7QUFHQSxTQUFHLEtBQUgsR0FBVyxFQUFYO0FBQ0E7QUFDRDtBQUNGO0FBQ0QsS0FBRyxLQUFILENBQVMsSUFBVCxDQUFjLE1BQWQ7QUFDRCxDQWJEOzs7OztBQ05BLElBQUksYUFBYSxRQUFRLFlBQVIsQ0FBakI7O0FBRUEsV0FBVyxRQUFYLENBQW9CLFVBQXBCLEdBQWlDLFVBQVMsRUFBVCxFQUFhO0FBQzVDLEtBQUcsYUFBSCxDQUNFLEdBQUcsY0FBSCxHQUFvQixHQUFwQixDQUF3QixVQUFTLENBQVQsRUFBWTtBQUNsQyxXQUFPO0FBQ0wsY0FBUTtBQUNOLGNBQU0sRUFBRSxJQUFGLENBQU8sSUFBUCxHQUFjLENBRGQ7QUFFTixZQUFJO0FBRkUsT0FESDtBQUtMLFlBQU07QUFDSixjQUFNLEVBQUUsTUFBRixDQUFTLElBRFg7QUFFSixZQUFJO0FBRkE7QUFMRCxLQUFQO0FBVUQsR0FYRCxDQURGO0FBY0QsQ0FmRDs7Ozs7QUNGQSxJQUFJLGFBQWEsUUFBUSxZQUFSLENBQWpCOztBQUVBLFdBQVcsUUFBWCxDQUFvQixVQUFwQixHQUFpQyxVQUFTLEVBQVQsRUFBYTtBQUM1QyxLQUFHLGFBQUgsQ0FDRSxHQUFHLGNBQUgsR0FBb0IsR0FBcEIsQ0FBd0IsVUFBUyxDQUFULEVBQVk7QUFDbEMsV0FBTyxHQUFHLFVBQUgsQ0FBYyxFQUFFLE1BQWhCLENBQVA7QUFDRCxHQUZELENBREY7QUFLRCxDQU5EOzs7OztBQ0ZBLElBQUksYUFBYSxRQUFRLFlBQVIsQ0FBakI7O0FBRUEsV0FBVyxRQUFYLENBQW9CLGNBQXBCLEdBQXFDLFVBQVMsRUFBVCxFQUFhO0FBQ2hELE1BQUksYUFBYSxHQUFHLGNBQUgsRUFBakI7QUFDQSxNQUFJLFdBQVcsTUFBWCxJQUFxQixDQUF6QixFQUE0QjtBQUMxQjtBQUNBO0FBQ0Q7QUFDRCxNQUFJLFNBQVMsV0FBVyxDQUFYLEVBQWMsTUFBM0I7QUFDQSxNQUFJLE9BQU8sV0FBVyxDQUFYLEVBQWMsSUFBekI7QUFDQSxNQUFJLGlCQUFpQixFQUFyQjtBQUNBLE9BQUssSUFBSSxJQUFJLE9BQU8sSUFBcEIsRUFBMEIsS0FBSyxLQUFLLElBQXBDLEVBQTBDLEVBQUUsQ0FBNUMsRUFBK0M7QUFDN0MsbUJBQWUsSUFBZixDQUFvQjtBQUNsQixjQUFRO0FBQ04sY0FBTSxDQURBO0FBRU4sWUFBSSxLQUFLLE9BQU8sSUFBWixHQUFtQixPQUFPLEVBQTFCLEdBQStCO0FBRjdCLE9BRFU7QUFLbEIsWUFBTTtBQUNKLGNBQU0sQ0FERjtBQUVKLFlBQUksS0FBSyxLQUFLLElBQVYsR0FBaUIsS0FBSyxFQUF0QixHQUEyQjtBQUYzQjtBQUxZLEtBQXBCO0FBVUQ7QUFDRCxLQUFHLGFBQUgsQ0FBaUIsY0FBakI7QUFDRCxDQXRCRDs7Ozs7QUNGQSxJQUFJLGFBQWEsUUFBUSxZQUFSLENBQWpCOztBQUVBLFdBQVcsZ0JBQVgsQ0FBNEIsTUFBNUIsRUFBb0M7QUFDbEMsU0FBTyxFQUQyQjtBQUVsQyxXQUFTLEVBRnlCO0FBR2xDLFFBQU07QUFINEIsQ0FBcEM7Ozs7O0FDRkEsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSOztBQUVBLElBQUksT0FBTyxTQUFQLElBQU8sQ0FBUyxPQUFULEVBQWtCO0FBQzNCLE1BQUksUUFBUSxTQUFSLEtBQVEsR0FBVztBQUNyQixhQUFTLE1BQVQ7QUFDRCxHQUZEO0FBR0EsU0FBTyxLQUFQO0FBQ0QsQ0FMRDs7QUFPQSxJQUFJLE9BQU8sU0FBUCxJQUFPLENBQVMsT0FBVCxFQUFrQixVQUFsQixFQUE4QjtBQUN2QyxNQUFJLFdBQVcsRUFBRSx3QkFBRixFQUE0QixRQUE1QixDQUFxQyxTQUFTLElBQTlDLENBQWY7QUFDQSxNQUFJLFNBQVMsRUFBRSxzQkFBRixFQUEwQixRQUExQixDQUFtQyxRQUFuQyxDQUFiO0FBQ0EsU0FBTyxRQUFQLENBQWdCLFVBQWhCO0FBQ0EsU0FBTyxNQUFQLENBQWMsT0FBZDtBQUNBLFNBQU8sUUFBUDtBQUNELENBTkQ7O0FBUUEsT0FBTyxPQUFQLENBQWUsSUFBZixHQUFzQixJQUF0Qjs7Ozs7QUNqQkEsSUFBTSxRQUFRLFFBQVEsT0FBUixDQUFkO0FBQ0EsSUFBTSxXQUFXLFFBQVEsV0FBUixDQUFqQjtBQUNBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjtBQUNBLElBQUksSUFBSSxRQUFRLFlBQVIsQ0FBUjtBQUNBLElBQUksYUFBYSxRQUFRLGVBQVIsQ0FBakI7QUFDQSxJQUFNLGNBQWMsUUFBUSxxQkFBUixDQUFwQjs7QUFFQSxJQUFJLG9CQUFvQixTQUFwQixpQkFBb0IsQ0FBUyxLQUFULEVBQWdCLFVBQWhCLEVBQTRCO0FBQ2xELE1BQUksUUFBUSxFQUFFLE9BQUYsRUFBVyxJQUFYLENBQWdCLElBQWhCLEVBQXNCLE9BQXRCLEVBQStCLFFBQS9CLENBQXdDLEtBQXhDLENBQVo7QUFDQSxNQUFJLFdBQVcsRUFBRSxPQUFGLEVBQVcsSUFBWCxDQUFnQixJQUFoQixFQUFzQixTQUF0QixFQUFpQyxRQUFqQyxDQUEwQyxLQUExQyxDQUFmOztBQUVBLE1BQU0sU0FBUyxTQUFULE1BQVMsR0FBVztBQUN4QixhQUFTLE1BQVQsQ0FFSSxvQkFBQyxXQUFEO0FBQ0UsaUJBQVc7QUFEYixNQUZKLEVBTUUsTUFBTSxDQUFOLENBTkY7QUFRRCxHQVREOztBQVdBLGFBQVcsTUFBWCxDQUFrQixHQUFsQixDQUFzQixVQUFTLE1BQVQsRUFBaUI7QUFDckMsUUFBTSxPQUFPLE9BQU8sT0FBUCxFQUFiO0FBQ0E7QUFDQSxXQUFPLE1BQVAsQ0FBYyxPQUFkLENBQXNCLFlBQU07QUFDMUI7QUFDRCxLQUZEO0FBR0E7QUFDQSxRQUFJLFVBQVUsRUFBRSxPQUFGLEVBQVcsUUFBWCxDQUFvQixRQUFwQixFQUE4QixRQUE5QixDQUF1QyxRQUF2QyxDQUFkO0FBQ0EsUUFBSSxjQUFjLFdBQVcsT0FBWCxFQUFvQixNQUFwQixFQUE0QixVQUE1QixDQUFsQjs7QUFFQSxZQUFRLElBQVIsSUFBZ0I7QUFDZCxlQUFTO0FBREssS0FBaEI7QUFHRCxHQWJEOztBQWVBLGFBQVcsTUFBWCxDQUFrQixHQUFsQixDQUFzQixVQUFTLElBQVQsRUFBZTtBQUNuQztBQUNBLFlBQVEsSUFBUixFQUFjLE9BQWQsQ0FBc0IsTUFBdEI7QUFDQSxXQUFPLFFBQVEsSUFBUixDQUFQO0FBQ0QsR0FKRDs7QUFNQSxhQUFXLFNBQVgsQ0FBcUIsR0FBckIsQ0FBeUIsTUFBekI7QUFDRCxDQXJDRDs7QUF1Q0EsT0FBTyxPQUFQLEdBQWlCLGlCQUFqQjs7Ozs7QUM5Q0EsSUFBSSxVQUFVLFFBQVEsU0FBUixDQUFkO0FBQ0EsSUFBSSxJQUFJLFFBQVEsWUFBUixDQUFSO0FBQ0EsSUFBSSxPQUFPLFFBQVEsUUFBUixDQUFYO0FBQ0EsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiOztBQUVBLElBQUksZ0JBQWdCLFNBQWhCLGFBQWdCLENBQVMsTUFBVCxFQUFpQjtBQUNuQyxNQUFJLFFBQVE7QUFDVixZQUFRLElBQUksUUFBUSxNQUFaLEVBREU7QUFFVixZQUFRLElBQUksUUFBUSxNQUFaLEVBRkU7QUFHVixlQUFXLElBQUksUUFBUSxNQUFaLEVBSEQ7O0FBS1YsWUFBUSxJQUxFLEVBS0k7QUFDZCxhQUFTLEVBTkM7O0FBUVYsY0FBVSxvQkFBVztBQUNuQixhQUFPLE1BQU0sT0FBTixDQUFjLEdBQWQsQ0FBa0IsVUFBUyxNQUFULEVBQWlCO0FBQ3hDLGVBQU8sT0FBTyxPQUFQLEVBQVA7QUFDRCxPQUZNLENBQVA7QUFHRCxLQVpTOztBQWNWLFVBQU0sY0FBUyxJQUFULEVBQWU7QUFDbkIsVUFBSSxTQUFTLElBQWIsRUFBbUI7QUFDakIsY0FBTSxrQkFBTjtBQUNEO0FBQ0Q7QUFDQSxVQUFJLE1BQU0sUUFBTixDQUFlLElBQWYsQ0FBSixFQUEwQjtBQUN4QjtBQUNEO0FBQ0QsVUFBSSxTQUFTLE9BQU8sS0FBSyxJQUFMLENBQVAsQ0FBYjtBQUNBLGFBQU8sSUFBUCxHQUFjLElBQWQsQ0FBbUIsWUFBVztBQUM1QixjQUFNLE9BQU4sQ0FBYyxJQUFkLENBQW1CLE1BQW5CO0FBQ0EsY0FBTSxNQUFOLENBQWEsUUFBYixDQUFzQixNQUF0QjtBQUNBLGNBQU0sUUFBTixDQUFlLElBQWY7QUFDRCxPQUpEO0FBS0QsS0E1QlM7O0FBOEJWLGVBQVcscUJBQVc7QUFDcEIsYUFBTyxNQUFNLE1BQWI7QUFDRCxLQWhDUzs7QUFrQ1YsY0FBVSxrQkFBUyxJQUFULEVBQWU7QUFDdkIsVUFBSSxTQUFTLE1BQU0sTUFBbkIsRUFBMkI7QUFDekIsZUFBTyxJQUFQO0FBQ0Q7QUFDRCxVQUFJLFNBQVMsSUFBVCxJQUFpQixNQUFNLE9BQU4sQ0FBYyxJQUFkLEtBQXVCLENBQUMsQ0FBN0MsRUFBZ0Q7QUFDOUMsZUFBTyxLQUFQO0FBQ0Q7QUFDRCxZQUFNLE1BQU4sR0FBZSxJQUFmO0FBQ0EsWUFBTSxTQUFOLENBQWdCLFFBQWhCLENBQXlCLElBQXpCO0FBQ0EsYUFBTyxPQUFQLENBQWUsSUFBZjtBQUNBLGFBQU8sSUFBUDtBQUNELEtBN0NTOztBQStDVixjQUFVLG9CQUFXO0FBQ25CLFlBQU0sVUFBTixDQUFpQixJQUFqQjtBQUNELEtBakRTOztBQW1EVixjQUFVLG9CQUFXO0FBQ25CLFlBQU0sVUFBTixDQUFpQixLQUFqQjtBQUNELEtBckRTOztBQXVEVixnQkFBWSxvQkFBUyxJQUFULEVBQWU7QUFDekIsVUFBSSxNQUFNLE9BQU4sQ0FBYyxNQUFkLElBQXdCLENBQTVCLEVBQStCO0FBQzdCO0FBQ0Q7QUFDRCxVQUFJLEdBQUo7QUFDQSxVQUFJLE1BQU0sTUFBTixLQUFpQixJQUFyQixFQUEyQjtBQUN6QixjQUFNLE9BQU8sQ0FBUCxHQUFXLE1BQU0sT0FBTixDQUFjLE1BQWQsR0FBdUIsQ0FBeEM7QUFDRCxPQUZELE1BR0s7QUFDSCxjQUFNLE1BQU0sT0FBTixDQUFjLE1BQU0sTUFBcEIsQ0FBTjtBQUNBLGVBQU8sT0FBTyxDQUFDLENBQVIsR0FBWSxDQUFDLENBQXBCO0FBQ0EsY0FBTSxDQUFDLE1BQU0sTUFBTSxPQUFOLENBQWMsTUFBckIsSUFBK0IsTUFBTSxPQUFOLENBQWMsTUFBbkQ7QUFDRDtBQUNELFlBQU0sUUFBTixDQUFlLE1BQU0sT0FBTixDQUFjLEdBQWQsRUFBbUIsT0FBbkIsRUFBZjtBQUNELEtBckVTOztBQXVFVixXQUFPLGVBQVMsSUFBVCxFQUFlO0FBQ3BCLFVBQUksTUFBTSxNQUFNLE9BQU4sQ0FBYyxJQUFkLENBQVY7QUFDQSxVQUFJLE9BQU8sQ0FBQyxDQUFaLEVBQWU7QUFDYjtBQUNEO0FBQ0QsVUFBSSxTQUFTLE1BQU0sTUFBbkIsRUFBMkI7QUFDekIsWUFBSSxNQUFNLE9BQU4sQ0FBYyxNQUFkLElBQXdCLENBQTVCLEVBQStCO0FBQzdCLGdCQUFNLFFBQU4sQ0FBZSxJQUFmO0FBQ0QsU0FGRCxNQUdLO0FBQ0gsZ0JBQU0sUUFBTjtBQUNEO0FBQ0Y7QUFDRCxZQUFNLE9BQU4sQ0FBYyxNQUFkLENBQXFCLEdBQXJCLEVBQTBCLENBQTFCO0FBQ0EsWUFBTSxNQUFOLENBQWEsUUFBYixDQUFzQixJQUF0QjtBQUNELEtBdEZTOztBQXdGVixZQUFRLGdCQUFTLElBQVQsRUFBZTtBQUNyQixZQUFNLEtBQU4sQ0FBWSxJQUFaO0FBQ0EsWUFBTSxJQUFOLENBQVcsSUFBWDtBQUNELEtBM0ZTOztBQTZGVixhQUFTLGlCQUFTLElBQVQsRUFBZTtBQUN0QixhQUFPLE1BQU0sUUFBTixHQUFpQixPQUFqQixDQUF5QixJQUF6QixDQUFQO0FBQ0Q7QUEvRlMsR0FBWjs7QUFrR0EsU0FBTyxRQUFQLENBQWdCLEdBQWhCLENBQW9CLE1BQU0sSUFBMUI7O0FBRUEsU0FBTyxLQUFQO0FBQ0QsQ0F0R0Q7O0FBd0dBLE9BQU8sT0FBUCxHQUFpQixhQUFqQjs7Ozs7QUM3R0EsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSO0FBQ0EsSUFBSSxhQUFhLFFBQVEsY0FBUixDQUFqQjtBQUNBLElBQUksMkJBQTJCLFFBQVEsK0JBQVIsQ0FBL0I7O0FBRUEsSUFBSSxhQUFhLFNBQWIsVUFBYSxDQUFTLEtBQVQsRUFBZ0IsTUFBaEIsRUFBd0IsVUFBeEIsRUFBb0M7QUFDbkQsTUFBSSxPQUFPLE9BQU8sT0FBUCxFQUFYOztBQUVBLE1BQUksS0FBSyxXQUFXLE1BQU0sQ0FBTixDQUFYLEVBQXFCO0FBQzVCLFdBQU8sT0FBTyxJQUFQLENBQVksR0FBWixFQURxQjtBQUU1QixVQUFNLE9BQU8sSUFBUCxDQUFZLEdBQVo7QUFGc0IsR0FBckIsQ0FBVDs7QUFLQTtBQUNBLFFBQU0sTUFBTixDQUNFLEVBQUUsMkJBQUYsRUFBK0IsTUFBL0IsQ0FDRSxFQUFFLDhCQUFGLENBREYsRUFFRSxFQUFFLG1EQUFGLENBRkYsRUFHRSxFQUFFLGdEQUFGLENBSEYsRUFJRSxFQUFFLHFEQUFGLENBSkYsRUFLRSxFQUFFLDJCQUFGLENBTEYsQ0FERjs7QUFVQSwyQkFDRSxPQUFPLHNCQURUOztBQUlBO0FBQ0EsTUFBSSxrQkFBa0IsR0FBRyxnQkFBSCxDQUFvQixJQUFwQixDQUF0QjtBQUNBLE1BQUksT0FBTyxTQUFQLElBQU8sR0FBVztBQUNwQixRQUFJLGFBQWEsR0FBRyxnQkFBSCxDQUFvQixJQUFwQixDQUFqQjtBQUNBLFdBQU8sSUFBUCxHQUFjLElBQWQsQ0FBbUIsWUFBVztBQUM1Qix3QkFBa0IsVUFBbEI7QUFDRCxLQUZEO0FBR0QsR0FMRDtBQU1BLEtBQUcsRUFBSCxDQUFNLFNBQU4sRUFBaUIsWUFBVztBQUMxQixXQUFPLElBQVAsQ0FBWSxHQUFaLENBQWdCLEdBQUcsUUFBSCxFQUFoQjtBQUNBLFdBQU8sTUFBUCxDQUFjLEdBQWQsQ0FDRSxHQUFHLE9BQUgsQ0FBVyxlQUFYLElBQThCLE9BQTlCLEdBQXdDLFVBRDFDO0FBR0QsR0FMRDtBQU1BLFNBQU8sSUFBUCxDQUFZLE9BQVosQ0FBb0IsVUFBUyxJQUFULEVBQWU7QUFDakMsUUFBSSxRQUFRLEdBQUcsUUFBSCxFQUFaLEVBQTJCO0FBQ3pCLFNBQUcsUUFBSCxDQUFZLElBQVo7QUFDRDtBQUNGLEdBSkQ7O0FBTUE7QUFDQSxNQUFJLGFBQWEsU0FBYixVQUFhLENBQVMsSUFBVCxFQUFlO0FBQzlCLE9BQUcsU0FBSCxDQUFhLE1BQWIsRUFBcUIsSUFBckI7QUFDQSxlQUFXLGNBQVgsQ0FBMEIsV0FBMUIsRUFBdUMsSUFBdkMsRUFBNkMsSUFBN0M7QUFDQSxVQUFNLElBQU4sQ0FBVyxjQUFYLEVBQTJCLElBQTNCLENBQWdDLElBQWhDO0FBQ0QsR0FKRDtBQUtBLFNBQU8sSUFBUCxDQUFZLE9BQVosQ0FBb0IsVUFBcEI7QUFDQSxhQUFXLE9BQU8sSUFBUCxDQUFZLEdBQVosRUFBWDs7QUFFQTtBQUNBLE1BQUksZUFBZSxTQUFmLFlBQWUsQ0FBUyxJQUFULEVBQWU7QUFDaEMsVUFBTSxJQUFOLENBQVcsZ0JBQVgsRUFBNkIsSUFBN0IsQ0FBa0MsSUFBbEM7QUFDQSxRQUFJLFFBQVEsS0FBWixFQUFtQjtBQUNqQixTQUFHLFNBQUgsQ0FBYSxnQkFBYixFQUErQixJQUEvQjtBQUNBLFNBQUcsU0FBSCxDQUFhLFlBQWIsRUFBMkIsQ0FBM0I7QUFDRCxLQUhELE1BSUs7QUFDSCxTQUFHLFNBQUgsQ0FBYSxnQkFBYixFQUErQixLQUEvQjtBQUNBLFNBQUcsU0FBSCxDQUFhLFlBQWIsRUFBMkIsT0FBTyxLQUFLLE9BQUwsQ0FBYSxJQUFiLEVBQW1CLEVBQW5CLENBQVAsQ0FBM0I7QUFDRDtBQUNGLEdBVkQ7QUFXQSxTQUFPLE1BQVAsQ0FBYyxPQUFkLENBQXNCLFlBQXRCO0FBQ0EsZUFBYSxPQUFPLE1BQVAsQ0FBYyxHQUFkLEVBQWI7QUFDQSxRQUFNLElBQU4sQ0FBVyxnQkFBWCxFQUE2QixLQUE3QixDQUFtQyxZQUFXO0FBQzVDLFdBQU8sTUFBUCxDQUFjLE1BQWQ7QUFDRCxHQUZEOztBQUlBO0FBQ0EsTUFBSSxZQUFZLFNBQVosU0FBWSxDQUFTLEdBQVQsRUFBYztBQUM1QixRQUFJLFFBQVE7QUFDVixZQUFNLElBREk7QUFFVixZQUFNLElBRkk7QUFHVixjQUFRO0FBSEUsS0FBWjtBQUtBLFVBQU0sSUFBTixDQUFXLGFBQVgsRUFBMEIsSUFBMUIsQ0FBK0IsTUFBTSxHQUFOLENBQS9CO0FBQ0QsR0FQRDtBQVFBLE9BQUssR0FBTCxDQUFTLE9BQVQsQ0FBaUIsU0FBakI7QUFDQSxZQUFVLEtBQUssR0FBTCxDQUFTLEdBQVQsRUFBVjtBQUNBLFFBQU0sSUFBTixDQUFXLGFBQVgsRUFBMEIsS0FBMUIsQ0FBZ0MsWUFBVztBQUN6QyxTQUFLLEdBQUwsQ0FBUyxNQUFUO0FBQ0QsR0FGRDs7QUFJQTtBQUNBLE1BQUksaUJBQWlCLFNBQWpCLGNBQWlCLENBQVMsUUFBVCxFQUFtQjtBQUN0QyxVQUFNLElBQU4sQ0FBVyxrQkFBWCxFQUErQixJQUEvQixDQUFvQyxRQUFwQztBQUNELEdBRkQ7QUFHQSxPQUFLLFFBQUwsQ0FBYyxHQUFkLENBQWtCLGNBQWxCO0FBQ0EsaUJBQWUsS0FBSyxRQUFMLENBQWMsR0FBZCxFQUFmO0FBQ0EsUUFBTSxJQUFOLENBQVcsa0JBQVgsRUFBK0IsS0FBL0IsQ0FBcUMsWUFBVztBQUM5QyxXQUFPLHNCQUFQLENBQThCLElBQTlCLENBQ0UsS0FBSyxRQUFMLENBQWMsR0FBZCxFQURGO0FBR0QsR0FKRDtBQUtBLFNBQU8sc0JBQVAsQ0FBOEIsU0FBOUIsQ0FBd0MsR0FBeEMsQ0FBNEMsVUFBUyxRQUFULEVBQW1CO0FBQzdELFNBQUssUUFBTCxDQUFjLEdBQWQsQ0FBa0IsUUFBbEI7QUFDRCxHQUZEOztBQUlBO0FBQ0EsU0FBTyxPQUFQLENBQWUsT0FBZixDQUF1QixVQUFTLE9BQVQsRUFBa0I7QUFDdkMsVUFBTSxJQUFOLENBQVcsaUJBQVgsRUFBOEIsSUFBOUIsQ0FBbUMsT0FBbkM7QUFDRCxHQUZEOztBQUlBO0FBQ0EsYUFBVyxTQUFYLENBQXFCLEdBQXJCLENBQXlCLFVBQVMsTUFBVCxFQUFpQjtBQUN4QyxRQUFJLFVBQVUsS0FBSyxPQUFMLEVBQWQsRUFBOEI7QUFDNUIsWUFBTSxRQUFOLENBQWUsUUFBZjtBQUNBLFNBQUcsS0FBSDtBQUNBLFNBQUcsT0FBSDtBQUNELEtBSkQsTUFLSztBQUNILFlBQU0sV0FBTixDQUFrQixRQUFsQjtBQUNEO0FBQ0YsR0FURDs7QUFXQTtBQUNBLFlBQVUsTUFBTSxDQUFOLENBQVYsRUFBb0IsSUFBcEIsQ0FBeUIsT0FBekIsRUFBa0MsWUFBVztBQUMzQztBQUNBLFdBQU8sS0FBUDtBQUNELEdBSEQ7QUFJRCxDQTFIRDs7QUE0SEEsT0FBTyxPQUFQLEdBQWlCLFVBQWpCOzs7OztBQ2hJQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7QUFDQSxJQUFJLElBQUksUUFBUSxZQUFSLENBQVI7QUFDQSxJQUFJLGFBQWEsUUFBUSxjQUFSLENBQWpCO0FBQ0EsSUFBSSxhQUFhLFFBQVEsY0FBUixDQUFqQjtBQUNBLElBQUksU0FBUyxRQUFRLFVBQVIsQ0FBYjtBQUNBLElBQUksdUJBQXVCLFFBQVEsMEJBQVIsQ0FBM0I7O0FBRUEsSUFBSSxTQUFTLFNBQVQsTUFBUyxDQUFTLElBQVQsRUFBZTtBQUMxQixNQUFJLFNBQVM7QUFDWCxVQUFNLFdBQVcsRUFBWCxDQURLO0FBRVgsWUFBUSxXQUFXLE9BQVgsQ0FGRztBQUdYLFVBQU0sV0FBVyxNQUFYLENBSEs7QUFJWCxZQUFRLFFBSkc7QUFLWCxhQUFTLFdBQVcsRUFBWCxDQUxFO0FBTVgsNEJBQXdCLHNCQU5iOztBQVFYLGFBQVMsbUJBQVc7QUFDbEIsYUFBTyxJQUFQO0FBQ0QsS0FWVTs7QUFZWCxhQUFTLG1CQUFXO0FBQ2xCLGFBQU8sS0FBSyxPQUFMLEVBQVA7QUFDRCxLQWRVOztBQWdCWCxVQUFNLGNBQVMsSUFBVCxFQUFlO0FBQ25CLGFBQU8sS0FBSyxJQUFMLEdBQVksSUFBWixDQUFpQixVQUFTLElBQVQsRUFBZTtBQUNyQyxlQUFPLE1BQVAsQ0FBYyxHQUFkLENBQWtCLE9BQU8sZ0JBQVAsQ0FBd0IsSUFBeEIsQ0FBbEI7QUFDQSxlQUFPLElBQVAsQ0FBWSxHQUFaLENBQWdCLElBQWhCO0FBQ0EsZUFBTyxPQUFQLENBQWUsR0FBZixDQUFtQixTQUFuQjtBQUNELE9BSk0sQ0FBUDtBQUtELEtBdEJVOztBQXdCWCxVQUFNLGdCQUFXO0FBQ2YsYUFBTyxLQUFLLEtBQUwsQ0FBVyxPQUFPLElBQVAsQ0FBWSxHQUFaLEVBQVgsRUFBOEIsS0FBOUIsQ0FBb0MsVUFBUyxLQUFULEVBQWdCO0FBQ3pELGVBQU8sT0FBUCxDQUFlLEdBQWYsQ0FBbUIsa0JBQWtCLE1BQU0sS0FBM0M7QUFDQSxlQUFPLE1BQVAsQ0FBYyxHQUFkLENBQWtCLE9BQWxCO0FBQ0QsT0FITSxFQUdKLElBSEksQ0FHQyxZQUFXO0FBQ2pCLGVBQU8sTUFBUCxDQUFjLEdBQWQsQ0FBa0IsT0FBbEI7QUFDQSxlQUFPLE9BQVAsQ0FBZSxHQUFmLENBQW1CLFFBQW5CO0FBQ0QsT0FOTSxDQUFQO0FBT0Q7QUFoQ1UsR0FBYjs7QUFtQ0EsTUFBSSxhQUFjLFNBQWQsVUFBYyxDQUFTLElBQVQsRUFBZTtBQUMvQixRQUFJLFlBQVksS0FBSyxPQUFMLENBQWEsWUFBYixFQUEyQixJQUEzQixDQUFoQjtBQUNBLFFBQUksT0FBTztBQUNULFlBQU0sS0FERztBQUVULFdBQUs7QUFGSSxNQUdULFNBSFMsQ0FBWDtBQUlBLFFBQUksSUFBSixFQUFVO0FBQ1IsYUFBTyxJQUFQO0FBQ0Q7QUFDRCxXQUFPLFdBQVcsbUJBQVgsQ0FBK0IsU0FBL0IsQ0FBUDtBQUNBLFFBQUksSUFBSixFQUFVO0FBQ1IsYUFBTyxLQUFLLElBQVo7QUFDRDtBQUNELFdBQU8sTUFBUDtBQUNELEdBZEQ7QUFlQSxTQUFPLElBQVAsQ0FBWSxHQUFaLENBQWdCLFdBQVcsS0FBSyxPQUFMLEVBQVgsQ0FBaEI7O0FBRUE7QUFDQSxTQUFPLElBQVAsQ0FBWSxPQUFaLENBQW9CLEVBQUUsUUFBRixDQUFXLFlBQVc7QUFDeEMsUUFBSSxPQUFPLE1BQVAsQ0FBYyxHQUFkLE1BQXVCLE9BQTNCLEVBQW9DO0FBQ2xDLGFBQU8sSUFBUDtBQUNEO0FBQ0YsR0FKbUIsRUFJakIsSUFKaUIsQ0FBcEI7O0FBTUEsU0FBTyxNQUFQO0FBQ0QsQ0E3REQ7O0FBK0RBLE9BQU8sT0FBUCxHQUFpQixNQUFqQjs7Ozs7QUN0RUEsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiOztBQUVBLElBQUksTUFBTSxTQUFOLEdBQU0sQ0FBUyxHQUFULEVBQWM7QUFDdEIsU0FBTyxPQUFPLENBQUMsSUFBRCxFQUFPLE1BQVAsRUFBZSxJQUFmLENBQVAsRUFBNkIsR0FBN0IsQ0FBUDtBQUNELENBRkQ7O0FBSUEsSUFBSSxNQUFKLEdBQWEsVUFBUyxJQUFULEVBQWU7QUFDMUIsTUFBSSxLQUFLLEtBQUwsQ0FBVyxNQUFYLENBQUosRUFBd0I7QUFDdEIsV0FBTyxNQUFQO0FBQ0Q7QUFDRCxNQUFJLEtBQUssS0FBTCxDQUFXLElBQVgsQ0FBSixFQUFzQjtBQUNwQixXQUFPLElBQVA7QUFDRDtBQUNELFNBQU8sSUFBUDtBQUNELENBUkQ7O0FBVUEsSUFBSSxRQUFKLEdBQWUsVUFBUyxJQUFULEVBQWU7QUFDNUIsU0FBTyxLQUFLLE9BQUwsQ0FBYSxXQUFiLEVBQTBCLElBQTFCLENBQVA7QUFDRCxDQUZELEVBSUEsT0FBTyxPQUFQLEdBQWlCLEdBSmpCOzs7OztBQ2hCQSxJQUFNLFFBQVEsUUFBUSxPQUFSLENBQWQ7QUFDQSxJQUFNLFVBQVUsUUFBUSxnQkFBUixDQUFoQjs7QUFFQSxJQUFNLGNBQWMsU0FBZCxXQUFjLENBQUMsS0FBRCxFQUFXO0FBQzdCLE1BQU0sTUFBTSxNQUFNLFNBQWxCO0FBQ0EsTUFBTSxVQUFVLFNBQVYsT0FBVSxDQUFDLElBQUQsRUFBVTtBQUN4QixRQUFJLFFBQUosQ0FBYSxJQUFiO0FBQ0QsR0FGRDtBQUdBLE1BQU0sUUFBUSxJQUFJLE9BQUosQ0FBWSxHQUFaLENBQWdCLFVBQUMsTUFBRCxFQUFZO0FBQ3hDLFdBQ0Usb0JBQUMsT0FBRDtBQUNFLFdBQUssT0FBTyxPQUFQLEVBRFA7QUFFRSxjQUFRLE1BRlY7QUFHRSxjQUFRLElBQUksTUFBSixJQUFjLE9BQU8sT0FBUCxFQUh4QjtBQUlFLGVBQVM7QUFKWCxNQURGO0FBUUQsR0FUYSxDQUFkO0FBVUEsU0FDRTtBQUFBO0FBQUEsTUFBSyxJQUFHLE9BQVI7QUFBaUI7QUFBakIsR0FERjtBQUdELENBbEJEOztBQW9CQSxPQUFPLE9BQVAsR0FBaUIsV0FBakI7Ozs7O0FDdkJBLElBQU0sUUFBUSxRQUFRLE9BQVIsQ0FBZDs7QUFFQSxJQUFNLFVBQVUsU0FBVixPQUFVLENBQUMsS0FBRCxFQUFXO0FBQ3pCLE1BQU0sT0FBTyxNQUFNLE1BQU4sQ0FBYSxPQUFiLEVBQWI7QUFDQSxNQUFNLE1BQU0sS0FBSyxPQUFMLENBQWEsSUFBSSxNQUFKLENBQVcsUUFBWCxDQUFiLEVBQW1DLEVBQW5DLENBQVo7QUFDQSxNQUFNLE9BQU8sS0FBSyxPQUFMLENBQWEsSUFBSSxNQUFKLENBQVcsS0FBWCxDQUFiLEVBQWdDLEVBQWhDLENBQWI7QUFDQSxNQUFNLFVBQVUsU0FBVixPQUFVLENBQUMsQ0FBRCxFQUFPO0FBQ3JCLE1BQUUsY0FBRjtBQUNBLFVBQU0sT0FBTixDQUFjLElBQWQ7QUFDRCxHQUhEO0FBSUEsU0FDRTtBQUFBO0FBQUE7QUFDRSxpQkFBVyxnQkFBZ0IsTUFBTSxNQUFOLEdBQWUsUUFBZixHQUEwQixFQUExQyxDQURiO0FBRUUsZUFBUyxPQUZYO0FBR0U7QUFBQTtBQUFBLFFBQUssV0FBVSxLQUFmO0FBQXNCO0FBQXRCLEtBSEY7QUFJRTtBQUFBO0FBQUEsUUFBSyxXQUFVLE1BQWY7QUFBdUI7QUFBdkIsS0FKRjtBQUtFLGlDQUFLLFdBQVcsWUFBWSxNQUFNLE1BQU4sQ0FBYSxNQUFiLENBQW9CLEdBQXBCLEVBQTVCO0FBTEYsR0FERjtBQVNELENBakJEOztBQW1CQSxPQUFPLE9BQVAsR0FBaUIsT0FBakI7Ozs7O0FDckJBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjtBQUNBLElBQUksYUFBYSxRQUFRLGNBQVIsQ0FBakI7QUFDQSxJQUFJLE1BQU0sUUFBUSxPQUFSLENBQVY7O0FBRUEsSUFBSSxPQUFPLFNBQVAsSUFBTyxDQUFTLElBQVQsRUFBZTtBQUN4QixNQUFJLE9BQU87QUFDVCxTQUFLLEtBREk7QUFFVCxjQUFVLFlBRkQ7O0FBSVQsYUFBUyxtQkFBVztBQUNsQixhQUFPLElBQVA7QUFDRCxLQU5ROztBQVFULFVBQU0sZ0JBQVc7QUFDZixhQUFPLElBQUksT0FBSixDQUFZLFVBQVMsT0FBVCxFQUFrQixNQUFsQixFQUEwQjtBQUMzQyxVQUFFLElBQUYsQ0FBTztBQUNMLGtCQUFRLE1BREg7QUFFTCxlQUFLLFdBRkE7QUFHTCxtQkFBUyxJQUhKO0FBSUwsZ0JBQU07QUFDSixrQkFBTTtBQURGLFdBSkQ7QUFPTCxvQkFBVTtBQVBMLFNBQVAsRUFRRyxJQVJILENBUVEsTUFSUixFQVFnQixJQVJoQixDQVFxQixVQUFTLEtBQVQsRUFBZ0I7QUFDbkMsZUFBSyxRQUFMLENBQWMsR0FBZCxDQUFrQixNQUFNLFFBQXhCO0FBQ0EsZUFBSyxHQUFMLENBQVMsR0FBVCxDQUFhLElBQUksTUFBSixDQUFXLE1BQU0sT0FBakIsQ0FBYjtBQUNBLGNBQUksVUFBVSxJQUFJLFFBQUosQ0FBYSxNQUFNLE9BQW5CLENBQWQ7QUFDQSxrQkFBUSxPQUFSO0FBQ0QsU0FiRDtBQWNELE9BZk0sQ0FBUDtBQWdCRCxLQXpCUTs7QUEyQlQsV0FBTyxlQUFTLElBQVQsRUFBZTtBQUNwQixhQUFPLElBQUksT0FBSixDQUFZLFVBQVMsT0FBVCxFQUFrQixNQUFsQixFQUEwQjtBQUMzQyxVQUFFLElBQUYsQ0FBTztBQUNMLGVBQUssWUFEQTtBQUVMLGtCQUFRLE1BRkg7QUFHTCxtQkFBUyxJQUhKO0FBSUwsZ0JBQU07QUFDSixrQkFBTSxJQURGO0FBRUosc0JBQVUsS0FBSyxRQUFMLENBQWMsR0FBZCxFQUZOO0FBR0oscUJBQVMsS0FBSyxPQUFMLENBQWEsS0FBYixFQUFvQixLQUFLLEdBQUwsQ0FBUyxHQUFULEVBQXBCO0FBSEwsV0FKRDtBQVNMLG9CQUFVO0FBVEwsU0FBUCxFQVVHLElBVkgsQ0FVUSxVQUFTLEtBQVQsRUFBZ0I7QUFDdEIsY0FBSSxTQUFTLElBQWIsRUFBbUI7QUFDakI7QUFDRCxXQUZELE1BR0s7QUFDSCxtQkFBTyxNQUFNLEtBQWI7QUFDRDtBQUNGLFNBakJELEVBaUJHLElBakJILENBaUJRLFlBQVc7QUFDakIsaUJBQU8sRUFBUDtBQUNELFNBbkJEO0FBb0JELE9BckJNLENBQVA7QUFzQkQ7QUFsRFEsR0FBWDtBQW9EQSxTQUFPLElBQVA7QUFDRCxDQXRERDs7QUF3REEsT0FBTyxPQUFQLEdBQWlCLElBQWpCOzs7OztBQzVEQSxJQUFNLFFBQVEsUUFBUSxPQUFSLENBQWQ7O0FBRUEsSUFBTSxVQUFVLElBQUksTUFBSixDQUFXLGFBQVgsQ0FBaEI7O0FBRUEsSUFBTSxvQkFBb0IsU0FBcEIsaUJBQW9CLENBQVMsS0FBVCxFQUFnQjtBQUN4QyxNQUFNLE9BQU8sUUFBUSxJQUFSLENBQWEsTUFBTSxJQUFuQixFQUF5QixDQUF6QixDQUFiO0FBQ0EsTUFBTSxVQUFVLFNBQVYsT0FBVSxDQUFDLENBQUQsRUFBTztBQUNyQixNQUFFLGNBQUY7QUFDQSxVQUFNLFFBQU4sQ0FBZSxNQUFNLElBQXJCO0FBQ0QsR0FIRDtBQUlBLE1BQU0sY0FBYyxTQUFkLFdBQWMsQ0FBQyxDQUFELEVBQU87QUFDekI7QUFDQSxNQUFFLGNBQUY7QUFDRCxHQUhEO0FBSUEsU0FDRTtBQUFBO0FBQUE7QUFDRSxpQkFBVyxNQUFNLE1BQU4sR0FBZSxVQUFmLEdBQTRCLEVBRHpDO0FBRUUsZUFBUyxPQUZYO0FBR0UsbUJBQWEsV0FIZjtBQUlHO0FBSkgsR0FERjtBQVFELENBbEJEOztBQW9CQSxPQUFPLE9BQVAsR0FBaUIsaUJBQWpCOzs7OztBQ3hCQSxJQUFJLElBQUksUUFBUSxZQUFSLENBQVI7QUFDQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7QUFDQSxJQUFJLFNBQVMsUUFBUSxTQUFSLEVBQW1CLE1BQWhDOztBQUVBLElBQUksZ0JBQWdCLFNBQWhCLGFBQWdCLENBQVMsTUFBVCxFQUFpQjtBQUNuQyxNQUFJLFFBQVE7QUFDVixXQUFPLEVBREc7QUFFVixZQUFRLElBRkUsRUFFSTs7QUFFZCxtQkFBZSxJQUFJLE1BQUosRUFKTDtBQUtWLGtCQUFjLElBQUksTUFBSixFQUxKO0FBTVYsY0FBVSxJQUFJLE1BQUosRUFOQTs7QUFRVixZQUFRLGdCQUFTLElBQVQsRUFBZTtBQUNyQixRQUFFLElBQUYsQ0FBTztBQUNMLGdCQUFRLE1BREg7QUFFTCxhQUFLLGFBRkE7QUFHTCxpQkFBUyxJQUhKO0FBSUwsY0FBTTtBQUNKLGdCQUFNO0FBREYsU0FKRDtBQU9MLGtCQUFVO0FBUEwsT0FBUCxFQVFHLElBUkgsQ0FRUSxZQUFXO0FBQ2pCLGdCQUFRLEdBQVIsQ0FBWSwyQ0FBMkMsSUFBdkQ7QUFDRCxPQVZELEVBVUcsSUFWSCxDQVVRLFVBQVMsS0FBVCxFQUFnQjtBQUN0QixjQUFNLFFBQU4sQ0FBZSxNQUFNLEtBQU4sQ0FBWSxHQUFaLENBQWdCLFVBQVMsQ0FBVCxFQUFZO0FBQ3pDLGlCQUFPLE1BQU0sSUFBTixHQUFhLENBQXBCO0FBQ0QsU0FGYyxDQUFmO0FBR0QsT0FkRDtBQWVELEtBeEJTOztBQTBCVixjQUFVLGtCQUFTLEtBQVQsRUFBZ0I7QUFDeEIsWUFBTSxTQUFOLENBQWdCLElBQWhCO0FBQ0EsWUFBTSxLQUFOLEdBQWMsS0FBZDtBQUNBLFlBQU0sYUFBTixDQUFvQixRQUFwQixDQUE2QixNQUFNLEtBQW5DO0FBQ0QsS0E5QlM7O0FBZ0NWLGNBQVUsb0JBQVc7QUFDbkIsYUFBTyxNQUFNLEtBQWI7QUFDRCxLQWxDUzs7QUFvQ1YsZUFBVyxxQkFBVztBQUNwQixhQUFPLE1BQU0sTUFBYjtBQUNELEtBdENTOztBQXdDVixlQUFXLG1CQUFTLElBQVQsRUFBZTtBQUN4QixVQUFJLFNBQVMsTUFBTSxNQUFuQixFQUEyQjtBQUN6QjtBQUNEO0FBQ0QsWUFBTSxNQUFOLEdBQWUsSUFBZjtBQUNBLFlBQU0sWUFBTixDQUFtQixRQUFuQixDQUE0QixNQUFNLE1BQWxDO0FBQ0QsS0E5Q1M7O0FBZ0RWLGdCQUFZLG9CQUFTLElBQVQsRUFBZTtBQUN6QixVQUFJLE1BQU0sTUFBTixLQUFpQixJQUFyQixFQUEyQjtBQUN6QixZQUFJLE1BQU0sS0FBTixDQUFZLE1BQVosSUFBc0IsQ0FBMUIsRUFBNkI7QUFDM0IsZ0JBQU0sU0FBTixDQUFnQixNQUFNLEtBQU4sQ0FBWSxDQUFaLENBQWhCO0FBQ0Q7QUFDRDtBQUNEO0FBQ0QsVUFBSSxNQUFNLE1BQU0sS0FBTixDQUFZLE9BQVosQ0FBb0IsTUFBTSxNQUExQixDQUFWO0FBQ0EsYUFBTyxPQUFPLENBQUMsQ0FBUixHQUFZLENBQUMsQ0FBcEI7QUFDQSxZQUFNLEtBQUssR0FBTCxDQUFTLENBQVQsRUFBWSxLQUFLLEdBQUwsQ0FBUyxNQUFNLEtBQU4sQ0FBWSxNQUFaLEdBQXFCLENBQTlCLEVBQWlDLEdBQWpDLENBQVosQ0FBTjtBQUNBLFlBQU0sU0FBTixDQUFnQixNQUFNLEtBQU4sQ0FBWSxHQUFaLENBQWhCO0FBQ0QsS0EzRFM7O0FBNkRWLFlBQVEsZ0JBQVMsSUFBVCxFQUFlO0FBQ3JCLFlBQU0sU0FBTixDQUFnQixJQUFoQjtBQUNBLFlBQU0sUUFBTixDQUFlLFFBQWYsQ0FBd0IsSUFBeEI7QUFDRDtBQWhFUyxHQUFaOztBQW1FQSxTQUFPLGtCQUFQLENBQTBCLEdBQTFCLENBQThCLFVBQVMsT0FBVCxFQUFrQjtBQUM5QyxRQUFJLE9BQUosRUFBYTtBQUNYLFlBQU0sTUFBTixDQUFhLE9BQU8sT0FBUCxFQUFiO0FBQ0Q7QUFDRixHQUpEOztBQU1BLFNBQU8sWUFBUCxDQUFvQixHQUFwQixDQUF3QixFQUFFLFFBQUYsQ0FBVyxNQUFNLE1BQWpCLEVBQXlCLEdBQXpCLENBQXhCOztBQUVBLFNBQU8sS0FBUDtBQUNELENBN0VEOztBQStFQSxPQUFPLE9BQVAsR0FBaUIsYUFBakI7Ozs7Ozs7Ozs7Ozs7QUNuRkEsSUFBTSxRQUFRLFFBQVEsT0FBUixDQUFkO0FBQ0EsSUFBTSxJQUFJLFFBQVEsUUFBUixDQUFWO0FBQ0EsSUFBTSxvQkFBb0IsUUFBUSwyQkFBUixDQUExQjs7SUFFTSxhOzs7QUFDSix5QkFBWSxLQUFaLEVBQW1CO0FBQUE7O0FBQUEsOEhBQ1gsS0FEVzs7QUFFakIsVUFBSyxZQUFMLEdBQW9CLE1BQUssWUFBTCxDQUFrQixJQUFsQixPQUFwQjtBQUZpQjtBQUdsQjs7OzttQ0FFYztBQUNiLFdBQUssV0FBTDtBQUNEOzs7d0NBRW1CO0FBQ2xCLFdBQUssS0FBTCxDQUFXLE9BQVgsQ0FBbUIsYUFBbkIsQ0FBaUMsR0FBakMsQ0FBcUMsS0FBSyxZQUExQztBQUNBLFdBQUssS0FBTCxDQUFXLE9BQVgsQ0FBbUIsWUFBbkIsQ0FBZ0MsR0FBaEMsQ0FBb0MsS0FBSyxZQUF6QztBQUNEOzs7MkNBRXNCO0FBQ3JCLFdBQUssS0FBTCxDQUFXLE9BQVgsQ0FBbUIsYUFBbkIsQ0FBaUMsTUFBakMsQ0FBd0MsS0FBSyxZQUE3QztBQUNBLFdBQUssS0FBTCxDQUFXLE9BQVgsQ0FBbUIsWUFBbkIsQ0FBZ0MsTUFBaEMsQ0FBdUMsS0FBSyxZQUE1QztBQUNEOzs7eUNBRW9CO0FBQ25CLFVBQUksS0FBSyxLQUFMLENBQVcsT0FBWCxDQUFtQixNQUF2QixFQUErQjtBQUM3QixhQUFLLGNBQUwsQ0FDRSxLQUFLLEtBRFAsRUFFRSxLQUFLLEtBQUwsQ0FBVyxJQUFYLENBQWdCLFdBQWhCLENBRkY7QUFJRDtBQUNGOzs7bUNBRWMsTyxFQUFTLE8sRUFBUztBQUMvQixVQUFJLFNBQVMsUUFBUSxNQUFSLEVBQWI7QUFDQSxVQUFJLE1BQU0sUUFBUSxPQUFSLEdBQWtCLE1BQWxCLEdBQTJCLE1BQXJDO0FBQ0EsVUFBSSxTQUFTLE1BQU0sTUFBbkI7QUFDQSxVQUFJLGNBQWMsUUFBUSxXQUFSLEVBQWxCO0FBQ0EsVUFBSSxNQUFNLFFBQVEsU0FBUixFQUFOLEdBQTRCLENBQWhDLEVBQW1DO0FBQ2pDLGdCQUFRLFNBQVIsQ0FBa0IsR0FBbEI7QUFDRDtBQUNELFVBQUksU0FBUyxRQUFRLFNBQVIsRUFBVCxHQUErQixXQUFuQyxFQUFnRDtBQUM5QyxnQkFBUSxTQUFSLENBQWtCLFNBQVMsV0FBM0I7QUFDRDtBQUNGOzs7NkJBRVE7QUFDUCxVQUFNLFVBQVUsS0FBSyxLQUFMLENBQVcsT0FBM0I7QUFDQSxVQUFNLE9BQU8sSUFBYjtBQUNBLGFBQ0U7QUFBQTtBQUFBO0FBQ0UsY0FBRyxjQURMO0FBRUUsZUFBSyxhQUFDLElBQUQ7QUFBQSxtQkFBVSxLQUFLLEtBQUwsR0FBYSxFQUFFLElBQUYsQ0FBdkI7QUFBQSxXQUZQO0FBR0UscUJBQVcsUUFBUSxLQUFSLENBQWMsTUFBZCxHQUF1QixRQUF2QixHQUFrQyxFQUgvQztBQUlHLGdCQUFRLEtBQVIsQ0FBYyxHQUFkLENBQWtCLFVBQUMsSUFBRDtBQUFBLGlCQUNmLG9CQUFDLGlCQUFEO0FBQ0EsaUJBQUssSUFETDtBQUVBLGtCQUFNLElBRk47QUFHQSxvQkFBUSxRQUFRLE1BQVIsS0FBbUIsSUFIM0I7QUFJQSxzQkFBVSxRQUFRLE1BSmxCLEdBRGU7QUFBQSxTQUFsQjtBQUpILE9BREY7QUFjRDs7OztFQTNEeUIsTUFBTSxTOztBQThEbEMsT0FBTyxPQUFQLEdBQWlCLGFBQWpCOzs7OztBQ2xFQSxJQUFNLFFBQVEsUUFBUSxPQUFSLENBQWQ7QUFDQSxJQUFNLFdBQVcsUUFBUSxXQUFSLENBQWpCO0FBQ0EsSUFBTSxTQUFTLFFBQVEsY0FBUixDQUFmOztBQUVBLElBQUksYUFBYSxTQUFiLFVBQWEsQ0FBUyxLQUFULEVBQWdCLE1BQWhCLEVBQXdCO0FBQ3ZDLE1BQU0sU0FBUyxTQUFULE1BQVMsR0FBTTtBQUNuQixhQUFTLE1BQVQsQ0FDRyxvQkFBQyxNQUFELElBQVEsUUFBUSxNQUFoQixHQURILEVBRUUsTUFBTSxDQUFOLENBRkY7QUFJRCxHQUxEO0FBTUE7QUFDRCxDQVJEOztBQVVBLE9BQU8sT0FBUCxHQUFpQixVQUFqQjs7Ozs7QUNkQSxJQUFJLFNBQVMsUUFBUSxTQUFSLEVBQW1CLE1BQWhDO0FBQ0EsSUFBSSxnQkFBZ0IsUUFBUSxrQkFBUixDQUFwQjs7QUFFQSxJQUFJLFNBQVMsU0FBVCxNQUFTLEdBQVc7QUFDdEIsTUFBSSxRQUFRO0FBQ1YsY0FBVSxJQUFJLE1BQUosRUFEQTtBQUVWLGtCQUFjLElBQUksTUFBSixFQUZKO0FBR1Ysd0JBQW9CLElBQUksTUFBSixFQUhWOztBQUtWLFVBQU0sR0FMSTtBQU1WLGFBQVMsS0FOQzs7QUFRVixZQUFRLGdCQUFTLElBQVQsRUFBZTtBQUNyQixZQUFNLE9BQU4sQ0FBYyxJQUFkO0FBQ0EsVUFBSSxLQUFLLE1BQUwsQ0FBWSxDQUFDLENBQWIsS0FBbUIsR0FBdkIsRUFBNEI7QUFDMUI7QUFDRDtBQUNELFlBQU0sSUFBTjtBQUNBLFlBQU0sUUFBTixDQUFlLFFBQWYsQ0FBd0IsSUFBeEI7QUFDRCxLQWZTOztBQWlCVixVQUFNLGdCQUFXO0FBQ2YsWUFBTSxPQUFOLEdBQWdCLElBQWhCO0FBQ0EsWUFBTSxrQkFBTixDQUF5QixRQUF6QixDQUFrQyxNQUFNLE9BQXhDO0FBQ0QsS0FwQlM7O0FBc0JWLFVBQU0sZ0JBQVc7QUFDZixZQUFNLE9BQU4sR0FBZ0IsS0FBaEI7QUFDQSxZQUFNLGtCQUFOLENBQXlCLFFBQXpCLENBQWtDLE1BQU0sT0FBeEM7QUFDTjtBQUNLLEtBMUJTOztBQTRCVixhQUFTLG1CQUFXO0FBQ2xCLGFBQU8sTUFBTSxJQUFiO0FBQ0QsS0E5QlM7O0FBZ0NWLGFBQVMsaUJBQVMsSUFBVCxFQUFlO0FBQ3RCLFlBQU0sSUFBTixHQUFhLElBQWI7QUFDQSxZQUFNLFlBQU4sQ0FBbUIsUUFBbkIsQ0FBNEIsSUFBNUI7QUFDRCxLQW5DUzs7QUFxQ1YseUJBQXFCLCtCQUFXO0FBQzlCLFlBQU0sT0FBTixDQUNFLE1BQU0sSUFBTixDQUFXLE9BQVgsQ0FBbUIsSUFBSSxNQUFKLENBQVcsVUFBWCxDQUFuQixFQUEyQyxFQUEzQyxDQURGO0FBR0QsS0F6Q1M7O0FBMkNWLFdBQU8saUJBQVc7QUFDaEIsVUFBSSxPQUFPLFFBQVEsU0FBUixFQUFYO0FBQ0EsWUFBTSxNQUFOLENBQWEsT0FBTyxJQUFQLEdBQWMsTUFBTSxJQUFqQztBQUNELEtBOUNTOztBQWdEVixTQUFLLGVBQVc7QUFDZCxVQUFJLFNBQVMsUUFBUSxTQUFSLEVBQWI7QUFDQSxVQUFJLE1BQUosRUFBWTtBQUNWLGNBQU0sT0FBTixDQUFjLE1BQWQ7QUFDQTtBQUNEO0FBQ0QsVUFBSSxRQUFRLFFBQVEsUUFBUixFQUFaO0FBQ0EsVUFBSSxNQUFNLE1BQU4sSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDckIsY0FBTSxPQUFOLENBQWMsTUFBTSxDQUFOLENBQWQ7QUFDQTtBQUNEO0FBQ0QsY0FBUSxNQUFSLENBQWUsTUFBTSxJQUFyQjtBQUNEO0FBNURTLEdBQVo7O0FBK0RBLE1BQUksVUFBVSxNQUFNLE9BQU4sR0FBZ0IsY0FBYyxLQUFkLENBQTlCO0FBQ0EsVUFBUSxRQUFSLENBQWlCLEdBQWpCLENBQXFCLFVBQVMsSUFBVCxFQUFlO0FBQ2xDLFVBQU0sTUFBTixDQUFhLElBQWI7QUFDRCxHQUZEOztBQUlBLFNBQU8sS0FBUDtBQUNELENBdEVEOztBQXdFQSxPQUFPLE9BQVAsR0FBaUIsTUFBakI7Ozs7Ozs7Ozs7Ozs7QUMzRUEsSUFBTSxRQUFRLFFBQVEsT0FBUixDQUFkO0FBQ0EsSUFBTSxZQUFZLFFBQVEsV0FBUixDQUFsQjtBQUNBLElBQU0sUUFBUSxRQUFRLGdCQUFSLENBQWQ7QUFDQSxJQUFNLGdCQUFnQixRQUFRLHNCQUFSLENBQXRCOztJQUVNLE07OztBQUNKLGtCQUFZLEtBQVosRUFBbUI7QUFBQTs7QUFBQSxnSEFDWCxLQURXOztBQUVqQixVQUFLLFlBQUwsR0FBb0IsTUFBSyxZQUFMLENBQWtCLElBQWxCLE9BQXBCO0FBRmlCO0FBR2xCOzs7O21DQUVjO0FBQ2IsV0FBSyxXQUFMO0FBQ0Q7Ozt3Q0FFbUI7QUFDbEIsVUFBTSxTQUFTLEtBQUssS0FBTCxDQUFXLE1BQTFCO0FBQ0EsVUFBTSxRQUFRLEtBQUssS0FBbkI7QUFDQSxhQUFPLGtCQUFQLENBQTBCLEdBQTFCLENBQThCLEtBQUssWUFBbkM7QUFDQSxhQUFPLFlBQVAsQ0FBb0IsR0FBcEIsQ0FBd0IsS0FBSyxZQUE3QjtBQUNBLGFBQU8sa0JBQVAsQ0FBMEIsR0FBMUIsQ0FBOEIsVUFBQyxVQUFELEVBQWdCO0FBQzVDLFlBQUksS0FBSixFQUFXO0FBQ1QsZ0JBQU0sS0FBTjtBQUNEO0FBQ0YsT0FKRDs7QUFNQSxnQkFBVSxLQUFWLEVBQWlCLElBQWpCLENBQXNCLE9BQXRCLEVBQStCLE1BQU0sT0FBTyxLQUFiLENBQS9CO0FBQ0EsZ0JBQVUsS0FBVixFQUFpQixJQUFqQixDQUFzQixLQUF0QixFQUE2QixNQUFNLE9BQU8sR0FBYixDQUE3QjtBQUNBLGdCQUFVLEtBQVYsRUFBaUIsSUFBakIsQ0FBc0IsS0FBdEIsRUFBNkIsTUFBTSxPQUFPLElBQWIsQ0FBN0I7QUFDQSxnQkFBVSxLQUFWLEVBQWlCLElBQWpCLENBQXNCLE1BQXRCLEVBQThCLE1BQU0sWUFBVztBQUM3QyxlQUFPLE9BQVAsQ0FBZSxVQUFmLENBQTBCLElBQTFCO0FBQ0QsT0FGNkIsQ0FBOUI7QUFHQSxnQkFBVSxLQUFWLEVBQWlCLElBQWpCLENBQXNCLElBQXRCLEVBQTRCLE1BQU0sWUFBVztBQUMzQyxlQUFPLE9BQVAsQ0FBZSxVQUFmLENBQTBCLEtBQTFCO0FBQ0QsT0FGMkIsQ0FBNUI7QUFHQSxnQkFBVSxLQUFWLEVBQWlCLElBQWpCLENBQXNCLE9BQXRCLEVBQStCLE1BQzdCLE9BQU8sbUJBRHNCLENBQS9CO0FBR0Q7OzsyQ0FFc0I7QUFDckIsV0FBSyxLQUFMLENBQVcsTUFBWCxDQUFrQixrQkFBbEIsQ0FBcUMsTUFBckMsQ0FBNEMsS0FBSyxZQUFqRDtBQUNBLFdBQUssS0FBTCxDQUFXLE1BQVgsQ0FBa0IsWUFBbEIsQ0FBK0IsTUFBL0IsQ0FBc0MsS0FBSyxZQUEzQztBQUNEOzs7NkJBRVE7QUFDUCxVQUFNLE9BQU8sSUFBYjtBQUNBLFVBQU0sU0FBUyxLQUFLLEtBQUwsQ0FBVyxNQUExQjs7QUFFQSxVQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsQ0FBRCxFQUFPO0FBQ3RCLGVBQU8sT0FBUCxDQUFlLEVBQUUsTUFBRixDQUFTLEtBQXhCO0FBQ0QsT0FGRDs7QUFJQSxhQUNFO0FBQUE7QUFBQSxVQUFNLElBQUcsUUFBVCxFQUFrQixXQUFXLE9BQU8sT0FBUCxHQUFpQixRQUFqQixHQUE0QixFQUF6RDtBQUNFO0FBQ0UsZUFBSyxhQUFDLEtBQUQ7QUFBQSxtQkFBVyxLQUFLLEtBQUwsR0FBYSxLQUF4QjtBQUFBLFdBRFA7QUFFRSxnQkFBSyxNQUZQO0FBR0UsY0FBRyxhQUhMO0FBSUUscUJBQVUsV0FKWjtBQUtFLHdCQUFhLEtBTGY7QUFNRSxpQkFBTyxPQUFPLElBTmhCO0FBT0Usb0JBQVUsUUFQWjtBQVFFLGtCQUFRLE9BQU8sSUFSakIsR0FERjtBQVVFLDRCQUFDLGFBQUQ7QUFDRSxtQkFBUyxPQUFPLE9BRGxCO0FBVkYsT0FERjtBQWVEOzs7O0VBL0RrQixNQUFNLFM7O0FBa0UzQixPQUFPLE9BQVAsR0FBaUIsTUFBakI7Ozs7O0FDdkVBLElBQUksU0FBUyxRQUFRLFVBQVIsQ0FBYjs7QUFFQSxJQUFJLFNBQVMsU0FBVCxNQUFTLENBQVMsSUFBVCxFQUFlO0FBQzFCLFNBQU8sT0FBTyxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsS0FBZixDQUFQLEVBQThCLElBQTlCLENBQVA7QUFDRCxDQUZEOztBQUlBLE9BQU8sZ0JBQVAsR0FBMEIsVUFBUyxPQUFULEVBQWtCO0FBQzFDLE1BQUksUUFBUSxLQUFSLENBQWMsV0FBZCxDQUFKLEVBQWdDO0FBQzlCLFdBQU8sS0FBUDtBQUNEO0FBQ0QsTUFBSSxRQUFRLFFBQVEsS0FBUixDQUFjLFNBQWQsQ0FBWjtBQUNBLE9BQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxNQUFNLE1BQTFCLEVBQWtDLEVBQUUsQ0FBcEMsRUFBdUM7QUFDckMsUUFBSSxTQUFTLE1BQU0sQ0FBTixFQUFTLE9BQVQsQ0FBaUIsU0FBakIsRUFBNEIsSUFBNUIsQ0FBYjtBQUNBLFFBQUksT0FBTyxNQUFQLElBQWlCLENBQXJCLEVBQXdCO0FBQ3RCLGFBQU8sS0FBUDtBQUNEO0FBQ0Y7QUFDRCxTQUFPLEtBQVA7QUFDRCxDQVpEOztBQWNBLE9BQU8sT0FBUCxHQUFpQixNQUFqQjs7Ozs7QUNwQkEsSUFBSSxJQUFJLFFBQVEsUUFBUixDQUFSO0FBQ0EsSUFBSSxvQkFBb0IsUUFBUSx1QkFBUixDQUF4QjtBQUNBLElBQUksYUFBYSxRQUFRLGVBQVIsQ0FBakI7O0FBRUEsSUFBSSxXQUFXLFNBQVgsUUFBVyxDQUFTLFVBQVQsRUFBcUIsTUFBckIsRUFBNkI7QUFDMUMsTUFBSSxRQUFRLEVBQUUsTUFBRixDQUFaO0FBQ0Esb0JBQ0UsRUFBRSwyQkFBRixFQUErQixRQUEvQixDQUF3QyxLQUF4QyxDQURGLEVBRUUsVUFGRjtBQUlBLGFBQ0UsRUFBRSxPQUFGLEVBQVcsUUFBWCxDQUFvQixLQUFwQixDQURGLEVBRUUsTUFGRjs7QUFLQTtBQUNBLFlBQVUsSUFBVixDQUFlLENBQUMsT0FBRCxFQUFVLE9BQVYsQ0FBZixFQUFtQyxZQUFXO0FBQzVDLGVBQVcsUUFBWDtBQUNBLFdBQU8sS0FBUDtBQUNELEdBSEQsRUFHRyxTQUhIO0FBSUEsWUFBVSxJQUFWLENBQWUsQ0FBQyxhQUFELEVBQWdCLGFBQWhCLENBQWYsRUFBK0MsWUFBVztBQUN4RCxlQUFXLFFBQVg7QUFDQSxXQUFPLEtBQVA7QUFDRCxHQUhELEVBR0csU0FISDtBQUlBLFlBQVUsSUFBVixDQUFlLENBQUMsT0FBRCxFQUFVLE9BQVYsQ0FBZixFQUFtQyxZQUFXO0FBQzVDLGVBQVcsS0FBWCxDQUFpQixXQUFXLFNBQVgsRUFBakI7QUFDQSxXQUFPLEtBQVA7QUFDRCxHQUhELEVBR0csU0FISDtBQUlBLFlBQVUsSUFBVixDQUFlLENBQUMsT0FBRCxDQUFmLEVBQTBCLFlBQVc7QUFDbkMsZUFBVyxNQUFYLENBQWtCLFdBQVcsU0FBWCxFQUFsQjtBQUNBLFdBQU8sS0FBUDtBQUNELEdBSEQsRUFHRyxTQUhIO0FBSUQsQ0E1QkQ7O0FBOEJBLE9BQU8sT0FBUCxHQUFpQixRQUFqQjs7Ozs7QUNsQ0EsSUFBSSxTQUFTLFFBQVEsU0FBUixFQUFtQixNQUFoQzs7QUFFQSxJQUFJLGFBQWEsU0FBYixVQUFhLENBQVMsS0FBVCxFQUFnQjtBQUMvQixNQUFJLGFBQWEsSUFBSSxNQUFKLEVBQWpCO0FBQ0EsU0FBTyxNQUFQLENBQWMsVUFBZCxFQUEwQjtBQUN4QixTQUFLLGVBQVc7QUFDZCxhQUFPLEtBQVA7QUFDRCxLQUh1QjtBQUl4QixTQUFLLGFBQVMsU0FBVCxFQUFvQjtBQUN2QixVQUFJLFVBQVUsU0FBZCxFQUF5QjtBQUN2QjtBQUNEO0FBQ0QsVUFBSSxZQUFZLEtBQWhCO0FBQ0EsY0FBUSxTQUFSO0FBQ0EsaUJBQVcsUUFBWCxDQUFvQixLQUFwQixFQUEyQixTQUEzQixFQUFzQyxVQUF0QztBQUNELEtBWHVCO0FBWXhCLGFBQVMsV0FBVyxHQVpJLENBWUM7QUFaRCxHQUExQjtBQWNBLFNBQU8sVUFBUDtBQUNELENBakJEOztBQW1CQSxPQUFPLE9BQVAsR0FBaUIsVUFBakI7Ozs7O0FDckJBLElBQUksY0FBYyxTQUFkLFdBQWMsQ0FBUyxJQUFULEVBQWU7QUFDL0IsU0FBTyxZQUFXO0FBQ2hCLFNBQUssS0FBTCxDQUFXLElBQVgsRUFBaUIsU0FBakI7QUFDQSxXQUFPLEtBQVA7QUFDRCxHQUhEO0FBSUQsQ0FMRDs7QUFPQSxPQUFPLE9BQVAsR0FBaUIsV0FBakI7Ozs7O0FDUEEsSUFBSSxhQUFhLFFBQVEsY0FBUixDQUFqQjs7QUFFQSxJQUFJLFNBQVMsU0FBVCxNQUFTLENBQVMsTUFBVCxFQUFpQixLQUFqQixFQUF3QjtBQUNuQyxNQUFJLGVBQWUsU0FBZixZQUFlLENBQVMsQ0FBVCxFQUFZO0FBQzdCLFdBQU8sTUFBTSxJQUFOLElBQWMsTUFBTSxTQUFwQixJQUFpQyxPQUFPLE9BQVAsQ0FBZSxDQUFmLEtBQXFCLENBQUMsQ0FBOUQ7QUFDRCxHQUZEOztBQUlBLE1BQUksYUFBYSxTQUFiLFVBQWEsQ0FBUyxDQUFULEVBQVk7QUFDM0IsUUFBSSxDQUFDLGFBQWEsQ0FBYixDQUFMLEVBQXNCO0FBQ3BCLFlBQU0sb0JBQW9CLENBQTFCO0FBQ0Q7QUFDRixHQUpEO0FBS0EsYUFBVyxLQUFYOztBQUVBLE1BQUksU0FBUyxXQUFXLEtBQVgsQ0FBYjs7QUFFQSxTQUFPLFNBQVAsR0FBbUIsWUFBVztBQUM1QixXQUFPLE1BQVA7QUFDRCxHQUZEOztBQUlBLE1BQUksT0FBTyxPQUFPLEdBQWxCO0FBQ0EsU0FBTyxHQUFQLEdBQWEsVUFBUyxTQUFULEVBQW9CO0FBQy9CLGVBQVcsU0FBWDtBQUNBLFNBQUssU0FBTDtBQUNELEdBSEQ7O0FBS0EsU0FBTyxNQUFQLEdBQWdCLFlBQVc7QUFDekIsUUFBSSxNQUFNLE9BQU8sT0FBUCxDQUFlLE9BQU8sR0FBUCxFQUFmLENBQVY7QUFDQSxVQUFNLENBQUMsTUFBTSxDQUFQLElBQVksT0FBTyxNQUF6QjtBQUNBLFdBQU8sR0FBUCxDQUFXLE9BQU8sR0FBUCxDQUFYO0FBQ0QsR0FKRDs7QUFNQSxTQUFPLE1BQVA7QUFDRCxDQS9CRDs7QUFpQ0EsT0FBTyxPQUFQLEdBQWlCLE1BQWpCOzs7OztBQ25DQSxJQUFJLElBQUksUUFBUSxRQUFSLENBQVI7QUFDQSxJQUFJLFNBQVMsUUFBUSxVQUFSLENBQWI7O0FBRUEsSUFBSSwyQkFBMkIsU0FBM0Isd0JBQTJCLENBQVMsS0FBVCxFQUFnQjtBQUM3QyxNQUFJLFdBQVcsRUFBRSxPQUFGLEVBQVcsTUFBWCxDQUNiLEVBQUUsbUJBQUYsQ0FEYSxFQUViLEVBQUUsZ0NBQUYsQ0FGYSxFQUdiLEVBQUUsd0NBQUYsQ0FIYSxDQUFmOztBQU1BLE1BQUksVUFBVSxPQUFPLElBQVAsQ0FBWSxRQUFaLEVBQXNCLHdCQUF0QixDQUFkOztBQUVBLE1BQUksVUFBVSxTQUFTLElBQVQsQ0FBYyxRQUFkLENBQWQ7QUFDQSxVQUFRLE1BQVIsQ0FBZSxNQUFNLE9BQU4sQ0FBYyxHQUFkLENBQWtCLFVBQVMsUUFBVCxFQUFtQjtBQUNsRCxXQUFPLEVBQUUsVUFBRixFQUFjLElBQWQsQ0FBbUIsUUFBbkIsQ0FBUDtBQUNELEdBRmMsQ0FBZjtBQUdBLFFBQU0sUUFBTixDQUFlLE9BQWYsQ0FBdUIsVUFBUyxRQUFULEVBQW1CO0FBQ3hDLFlBQVEsR0FBUixDQUFZLFFBQVo7QUFDRCxHQUZEO0FBR0EsVUFBUSxHQUFSLENBQVksTUFBTSxRQUFOLENBQWUsR0FBZixFQUFaO0FBQ0EsVUFBUSxLQUFSLENBQWMsWUFBVztBQUN2QixVQUFNLFFBQU4sQ0FBZSxHQUFmLENBQW1CLFFBQVEsR0FBUixFQUFuQjtBQUNELEdBRkQ7O0FBSUE7QUFDQSxXQUFTLElBQVQsQ0FBYyxXQUFkLEVBQTJCLEtBQTNCLENBQWlDLE1BQU0sT0FBdkM7O0FBRUE7QUFDQSxXQUFTLElBQVQsQ0FBYyxlQUFkLEVBQStCLEtBQS9CLENBQXFDLE1BQU0sSUFBM0M7O0FBRUEsUUFBTSxPQUFOLENBQWMsT0FBZCxDQUFzQixVQUFTLE9BQVQsRUFBa0I7QUFDdEMsUUFBSSxPQUFKLEVBQWE7QUFDWCxjQUFRLFFBQVIsQ0FBaUIsU0FBakI7QUFDQSxlQUFTLElBQVQsQ0FBYyxlQUFkLEVBQStCLEtBQS9CO0FBQ0QsS0FIRCxNQUlLO0FBQ0gsY0FBUSxXQUFSLENBQW9CLFNBQXBCO0FBQ0Q7QUFDRixHQVJEO0FBU0QsQ0FwQ0Q7O0FBc0NBLE9BQU8sT0FBUCxHQUFpQix3QkFBakI7Ozs7O0FDekNBLElBQUksSUFBSSxRQUFRLFFBQVIsQ0FBUjtBQUNBLElBQUksU0FBUyxRQUFRLFNBQVIsRUFBbUIsTUFBaEM7QUFDQSxJQUFJLGFBQWEsUUFBUSxjQUFSLENBQWpCOztBQUVBLElBQUksdUJBQXVCLFNBQXZCLG9CQUF1QixHQUFXOztBQUVwQyxNQUFJLFNBQVM7QUFDWCxhQUFTLFdBQVcsS0FBWCxDQURFO0FBRVgsY0FBVSxZQUZDO0FBR1gsYUFBUyxDQUNQLE9BRE8sRUFFUCxRQUZPLEVBR1AsVUFITyxDQUhFO0FBUVgsZUFBVyxJQUFJLE1BQUosRUFSQTs7QUFVWCxhQUFTLG1CQUFXO0FBQ2xCLGFBQU8sT0FBUCxDQUFlLEdBQWYsQ0FBbUIsS0FBbkI7QUFDQSxhQUFPLFNBQVAsQ0FBaUIsUUFBakIsQ0FBMEIsT0FBTyxRQUFQLENBQWdCLEdBQWhCLEVBQTFCO0FBQ0QsS0FiVTs7QUFlWCxVQUFNLGNBQVMsUUFBVCxFQUFtQjtBQUN2QixhQUFPLFFBQVAsQ0FBZ0IsR0FBaEIsQ0FBb0IsUUFBcEI7QUFDQSxhQUFPLE9BQVAsQ0FBZSxHQUFmLENBQW1CLElBQW5CO0FBQ0QsS0FsQlU7O0FBb0JYLFVBQU0sZ0JBQVc7QUFDZixhQUFPLE9BQVAsQ0FBZSxHQUFmLENBQW1CLEtBQW5CO0FBQ0Q7QUF0QlUsR0FBYjtBQXdCQSxTQUFPLE1BQVA7QUFDRCxDQTNCRDs7QUE2QkEsT0FBTyxPQUFQLEdBQWlCLG9CQUFqQjs7Ozs7QUNqQ0EsSUFBSSxZQUFZLFFBQVEsV0FBUixDQUFoQjtBQUNBLElBQUksZ0JBQWdCLFFBQVEsa0JBQVIsQ0FBcEI7QUFDQSxJQUFJLFNBQVMsUUFBUSxVQUFSLENBQWI7QUFDQSxJQUFJLFdBQVcsUUFBUSxhQUFSLENBQWY7O0FBRUEsT0FBTyxPQUFQLENBQWUsR0FBZixHQUFxQixZQUFXO0FBQzlCLE1BQUksU0FBUyxRQUFiO0FBQ0EsTUFBSSxhQUFhLGNBQWMsTUFBZCxDQUFqQjtBQUNBLE1BQUksT0FBTyxTQUFTLFVBQVQsRUFBcUIsTUFBckIsQ0FBWDs7QUFFQSxNQUFJLGVBQWUsU0FBZixZQUFlLEdBQVc7QUFDNUIsUUFBSSxRQUFRLFdBQVcsUUFBWCxFQUFaO0FBQ0EsaUJBQWEsT0FBYixDQUFxQixZQUFyQixFQUFtQyxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQW5DO0FBQ0QsR0FIRDtBQUlBLE1BQUksZUFBZSxTQUFmLFlBQWUsR0FBVztBQUM1QixXQUFPLEtBQUssS0FBTCxDQUFXLGFBQWEsT0FBYixDQUFxQixZQUFyQixLQUFzQyxJQUFqRCxDQUFQO0FBQ0QsR0FGRDtBQUdBLGlCQUFlLE9BQWYsQ0FBdUIsVUFBUyxJQUFULEVBQWU7QUFDcEMsZUFBVyxJQUFYLENBQWdCLElBQWhCO0FBQ0QsR0FGRDs7QUFJQSxhQUFXLE1BQVgsQ0FBa0IsR0FBbEIsQ0FBc0IsWUFBdEI7QUFDQSxhQUFXLE1BQVgsQ0FBa0IsR0FBbEIsQ0FBc0IsWUFBdEI7O0FBRUE7QUFDQSxZQUFVLElBQVYsQ0FBZSxDQUFDLE9BQUQsRUFBVSxPQUFWLENBQWYsRUFBbUMsWUFBVztBQUM1QyxXQUFPLElBQVA7QUFDQSxXQUFPLEtBQVA7QUFDRCxHQUhELEVBR0csU0FISDtBQUlELENBeEJEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxudmFyIGluZGVudEFmdGVyUGFzdGUgPSBmdW5jdGlvbihjbSwgY2hhbmdlKSB7XG4gIGlmIChjaGFuZ2Uub3JpZ2luICE9IFwicGFzdGVcIikge1xuICAgIHJldHVyblxuICB9XG4gIGlmIChDb2RlTWlycm9yLmNtcFBvcyhjaGFuZ2UuZnJvbSwgY2hhbmdlLnRvKSkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIGNoZWNrIGlmIHRoZSBpbnNlcnRpb24gcG9pbnQgaXMgYXQgdGhlIGVuZCBvZiB0aGUgbGluZVxuICB2YXIgZGVzdCA9IGNtLmdldExpbmUoY2hhbmdlLmZyb20ubGluZSlcbiAgaWYgKGRlc3QubGVuZ3RoICE9IGNoYW5nZS5mcm9tLmNoKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gY2hlY2sgaWYgdGhlIGxpbmUgY29uc2lzdHMgb2Ygb25seSB3aGl0ZSBzcGFjZXNcbiAgaWYgKGRlc3QubWF0Y2goL1teIFxcdF0vKSkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIHJlbW92ZSB0aGUgbGFzdCBlbXB0eSBsaW5lXG4gIGlmIChjaGFuZ2UudGV4dFtjaGFuZ2UudGV4dC5sZW5ndGggLSAxXSA9PSBcIlwiKSB7XG4gICAgY2hhbmdlLnRleHQucG9wKClcbiAgfVxuICB2YXIgYmFzZV9pbmRlbnQgPSBjaGFuZ2UudGV4dFswXS5tYXRjaCgvXlsgXFx0XSovKVswXVxuICBjaGFuZ2UudGV4dCA9IGNoYW5nZS50ZXh0Lm1hcChmdW5jdGlvbihsaW5lLCBpKSB7XG4gICAgbGluZSA9IGxpbmUubWF0Y2goL14oWyBcXHRdKikoLiopLylcbiAgICB2YXIgaW5kZW50ID0gbGluZVsxXVxuICAgIHZhciB0ZXh0ID0gbGluZVsyXVxuICAgIGluZGVudCA9IChkZXN0ICsgaW5kZW50KS5zdWJzdHIoMCwgZGVzdC5sZW5ndGggKyBpbmRlbnQubGVuZ3RoIC0gYmFzZV9pbmRlbnQubGVuZ3RoKVxuICAgIHJldHVybiBpbmRlbnQgKyB0ZXh0XG4gIH0pXG4gIGNoYW5nZS50ZXh0WzBdID0gY2hhbmdlLnRleHRbMF0uc3Vic3RyKGRlc3QubGVuZ3RoKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluZGVudEFmdGVyUGFzdGVcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnJlcXVpcmUoXCJjb2RlbWlycm9yLWFkZG9uXCIpXG5yZXF1aXJlKFwiLi9tYXJrXCIpXG5yZXF1aXJlKFwiLi9zZWxlY3QtbGluZVwiKVxucmVxdWlyZShcIi4vc2VsZWN0LXdvcmRcIilcbnJlcXVpcmUoXCIuL3NwbGl0LWludG8tbGluZXNcIilcbnJlcXVpcmUoXCIuL3RleHQtbW9kZVwiKVxuXG5PYmplY3QuYXNzaWduKENvZGVNaXJyb3IuZGVmYXVsdHMsIHtcbiAgbGluZU51bWJlcnM6IHRydWUsXG4gIHRhYlNpemU6IDQsXG4gIHNob3dDdXJzb3JXaGVuU2VsZWN0aW5nOiB0cnVlLFxuICBhdXRvQ2xvc2VCcmFja2V0czogdHJ1ZSxcbiAgbWF0Y2hCcmFja2V0czogdHJ1ZSxcbiAgbWF0Y2hUYWdzOiB0cnVlLFxuICBhdXRvQ2xvc2VUYWdzOiB0cnVlLFxuICBzdHlsZUFjdGl2ZUxpbmU6IHtub25FbXB0eTogdHJ1ZX0sXG4gIHN0eWxlU2VsZWN0ZWRUZXh0OiB0cnVlLFxuICBkcmFnRHJvcDogZmFsc2UsXG4gIGV4dHJhS2V5czoge1xuICAgIFwiQ3RybC1TcGFjZVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgIFwiQ3RybC1VXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgXCJDdHJsLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgXCJDbWQtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICBcIlRhYlwiOiBcImluZGVudEF1dG9cIixcbiAgICBcIkN0cmwtRFwiOiBmYWxzZSxcbiAgICBcIkNtZC1EXCI6IGZhbHNlLFxuICB9LFxufSlcblxuQ29kZU1pcnJvci5kZWZpbmVJbml0SG9vayhmdW5jdGlvbihjbSkge1xuICAvLyBtYWludGFpbiBpbmRlbnRhdGlvbiBvbiBwYXN0ZVxuICBjbS5vbihcImJlZm9yZUNoYW5nZVwiLCByZXF1aXJlKFwiLi9pbmRlbnQtYWZ0ZXItcGFzdGVcIikpXG4gIFxuICAvLyBrZXkgYmluZGluZ3NcbiAgdmFyIGlucHV0ID0gY20uZ2V0SW5wdXRGaWVsZCgpXG4gIGlucHV0LmNsYXNzTmFtZSArPSBcIiBtb3VzZXRyYXBcIiAvLyBlbmFibGUgaG90a2V5XG4gIHZhciBrZXltYXAgPSB7XG4gICAgXCJhbHQrYlwiOiBcImdvV29yZExlZnRcIixcbiAgICBcImFsdCtmXCI6IFwiZ29Xb3JkUmlnaHRcIixcbiAgICBcImFsdCtoXCI6IFwiZGVsV29yZEJlZm9yZVwiLFxuICAgIFwiYWx0K2RcIjogXCJkZWxXb3JkQWZ0ZXJcIixcbiAgICBcIm1vZCttXCI6IFwibWFya1wiLFxuICAgIFwibW9kK2RcIjogXCJzZWxlY3RXb3JkXCIsXG4gICAgXCJtb2QrbFwiOiBcInNlbGVjdExpbmVcIixcbiAgICBcIm1vZCtzaGlmdCtsXCI6IFwic3BsaXRJbnRvTGluZXNcIixcbiAgfVxuICBfLmVhY2goa2V5bWFwLCBmdW5jdGlvbihjb21tYW5kLCBrZXkpIHtcbiAgICBNb3VzZXRyYXAoaW5wdXQpLmJpbmQoa2V5LCBmdW5jdGlvbigpIHtcbiAgICAgIGNtLmV4ZWNDb21tYW5kKGNvbW1hbmQpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9KVxuICB9KVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDb2RlTWlycm9yXG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuZGVmaW5lSW5pdEhvb2soZnVuY3Rpb24oY20pIHtcbiAgY20ubWFya3MgPSBbXVxufSlcblxuQ29kZU1pcnJvci5jb21tYW5kcy5tYXJrID0gZnVuY3Rpb24oY20pIHtcbiAgdmFyIGN1cnNvciA9IGNtLmdldEN1cnNvcigpXG4gIGlmIChtYXJrcy5sZW5ndGgpIHtcbiAgICB2YXIgbGFzdCA9IGNtLm1hcmtzW2NtLm1hcmtzLmxlbmd0aCAtIDFdXG4gICAgaWYgKGxhc3QubGluZSA9PSBjdXJzb3IubGluZSAmJiBsYXN0LmNoID09IGN1cnNvci5jaCkge1xuICAgICAgY20uc2V0U2VsZWN0aW9ucyhjbS5tYXJrcy5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgICByZXR1cm4ge2hlYWQ6IG0sIGFuY2hvcjogbX1cbiAgICAgIH0pLCBjbS5tYXJrcy5sZW5ndGggLSAxKVxuICAgICAgY20ubWFya3MgPSBbXVxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG4gIGNtLm1hcmtzLnB1c2goY3Vyc29yKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNlbGVjdExpbmUgPSBmdW5jdGlvbihjbSkge1xuICBjbS5zZXRTZWxlY3Rpb25zKFxuICAgIGNtLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgIGxpbmU6IGkuaGVhZC5saW5lICsgMSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfSxcbiAgICAgICAgaGVhZDoge1xuICAgICAgICAgIGxpbmU6IGkuYW5jaG9yLmxpbmUsXG4gICAgICAgICAgY2g6IDAsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICApXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0V29yZCA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGNtLmZpbmRXb3JkQXQoaS5hbmNob3IpXG4gICAgfSlcbiAgKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNwbGl0SW50b0xpbmVzID0gZnVuY3Rpb24oY20pIHtcbiAgdmFyIHNlbGVjdGlvbnMgPSBjbS5saXN0U2VsZWN0aW9ucygpXG4gIGlmIChzZWxlY3Rpb25zLmxlbmd0aCAhPSAxKSB7XG4gICAgLy8gRG8gbm90aGluZ1xuICAgIHJldHVyblxuICB9XG4gIHZhciBhbmNob3IgPSBzZWxlY3Rpb25zWzBdLmFuY2hvclxuICB2YXIgaGVhZCA9IHNlbGVjdGlvbnNbMF0uaGVhZFxuICB2YXIgbmV3X3NlbGVjdGlvbnMgPSBbXVxuICBmb3IgKHZhciBpID0gYW5jaG9yLmxpbmU7IGkgPD0gaGVhZC5saW5lOyArK2kpIHtcbiAgICBuZXdfc2VsZWN0aW9ucy5wdXNoKHtcbiAgICAgIGFuY2hvcjoge1xuICAgICAgICBsaW5lOiBpLFxuICAgICAgICBjaDogaSA9PSBhbmNob3IubGluZSA/IGFuY2hvci5jaCA6IDAsXG4gICAgICB9LFxuICAgICAgaGVhZDoge1xuICAgICAgICBsaW5lOiBpLFxuICAgICAgICBjaDogaSA9PSBoZWFkLmxpbmUgPyBoZWFkLmNoIDogSW5maW5pdHksXG4gICAgICB9LFxuICAgIH0pXG4gIH1cbiAgY20uc2V0U2VsZWN0aW9ucyhuZXdfc2VsZWN0aW9ucylcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9LFxufSlcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuXG52YXIgb3BlbiA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgdmFyIGNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgYmFja2Ryb3AucmVtb3ZlKClcbiAgfVxuICByZXR1cm4gY2xvc2Vcbn1cblxudmFyIHZpZXcgPSBmdW5jdGlvbihjb250ZW50LCBjbGFzc19uYW1lKSB7XG4gIHZhciBiYWNrZHJvcCA9ICQoJzxkaXYgY2xhc3M9XCJiYWNrZHJvcFwiPicpLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gIHZhciBkaWFsb2cgPSAkKCc8ZGl2IGNsYXNzPVwiZGlhbG9nXCI+JykuYXBwZW5kVG8oYmFja2Ryb3ApXG4gIGRpYWxvZy5hZGRDbGFzcyhjbGFzc19uYW1lKVxuICBkaWFsb2cuYXBwZW5kKGNvbnRlbnQpXG4gIHJldHVybiBiYWNrZHJvcFxufVxuXG5tb2R1bGUuZXhwb3J0cy52aWV3ID0gdmlld1xuIiwiY29uc3QgUmVhY3QgPSByZXF1aXJlKFwicmVhY3RcIilcbmNvbnN0IFJlYWN0RE9NID0gcmVxdWlyZShcInJlYWN0LWRvbVwiKVxudmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRWRpdG9yVmlldyA9IHJlcXVpcmUoXCIuL2VkaXRvci12aWV3XCIpXG5jb25zdCBGaWxlVGFiTGlzdCA9IHJlcXVpcmUoXCIuL2ZpbGUtdGFiLWxpc3QuanN4XCIpXG5cbnZhciBFZGl0b3JNYW5hZ2VyVmlldyA9IGZ1bmN0aW9uKCRyb290LCBlZGl0b3JfbWdyKSB7XG4gIHZhciAkdGFicyA9ICQoXCI8ZGl2PlwiKS5hdHRyKFwiaWRcIiwgXCJmaWxlc1wiKS5hcHBlbmRUbygkcm9vdClcbiAgdmFyICRlZGl0b3JzID0gJChcIjxkaXY+XCIpLmF0dHIoXCJpZFwiLCBcImVkaXRvcnNcIikuYXBwZW5kVG8oJHJvb3QpXG4gIFxuICBjb25zdCByZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICBSZWFjdERPTS5yZW5kZXIoXG4gICAgICAoXG4gICAgICAgIDxGaWxlVGFiTGlzdFxuICAgICAgICAgIGVkaXRvck1ncj17ZWRpdG9yX21ncn1cbiAgICAgICAgICAvPlxuICAgICAgKSxcbiAgICAgICR0YWJzWzBdXG4gICAgKVxuICB9XG4gIFxuICBlZGl0b3JfbWdyLm9wZW5lZC5hZGQoZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgY29uc3QgcGF0aCA9IGVkaXRvci5nZXRQYXRoKClcbiAgICByZW5kZXIoKVxuICAgIGVkaXRvci5zdGF0dXMub2JzZXJ2ZSgoKSA9PiB7XG4gICAgICByZW5kZXIoKVxuICAgIH0pXG4gICAgLy8gZWRpdG9yIHZpZXdcbiAgICB2YXIgJGVkaXRvciA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImVkaXRvclwiKS5hcHBlbmRUbygkZWRpdG9ycylcbiAgICB2YXIgZWRpdG9yX3ZpZXcgPSBFZGl0b3JWaWV3KCRlZGl0b3IsIGVkaXRvciwgZWRpdG9yX21ncilcbiAgICBcbiAgICBlZGl0b3JzW3BhdGhdID0ge1xuICAgICAgJGVkaXRvcjogJGVkaXRvcixcbiAgICB9XG4gIH0pXG4gIFxuICBlZGl0b3JfbWdyLmNsb3NlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIHJlbmRlcigpXG4gICAgZWRpdG9yc1twYXRoXS4kZWRpdG9yLnJlbW92ZSgpXG4gICAgZGVsZXRlIGVkaXRvcnNbcGF0aF1cbiAgfSlcbiAgXG4gIGVkaXRvcl9tZ3IuYWN0aXZhdGVkLmFkZChyZW5kZXIpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yTWFuYWdlclZpZXdcbiIsInZhciBzaWduYWxzID0gcmVxdWlyZShcInNpZ25hbHNcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciBGaWxlID0gcmVxdWlyZShcIi4vZmlsZVwiKVxudmFyIEVkaXRvciA9IHJlcXVpcmUoXCIuL2VkaXRvclwiKVxuXG52YXIgRWRpdG9yTWFuYWdlciA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgb3BlbmVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBjbG9zZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGFjdGl2YXRlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgXG4gICAgYWN0aXZlOiBudWxsLCAvLyBwYXRoIG9mIGFjdGl2ZSBmaWxlXG4gICAgZWRpdG9yczogW10sXG4gICAgXG4gICAgZ2V0RmlsZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmVkaXRvcnMubWFwKGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgICByZXR1cm4gZWRpdG9yLmdldFBhdGgoKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIG9wZW46IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IFwiVGhlIHBhdGggaXMgbnVsbFwiXG4gICAgICB9XG4gICAgICAvLyB0cnkgdG8gYWN0aXZhdGUgYWxyZWFkeSBvcGVuZWQgZmlsZXNcbiAgICAgIGlmIChtb2RlbC5hY3RpdmF0ZShwYXRoKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBlZGl0b3IgPSBFZGl0b3IoRmlsZShwYXRoKSlcbiAgICAgIGVkaXRvci5sb2FkKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kZWwuZWRpdG9ycy5wdXNoKGVkaXRvcilcbiAgICAgICAgbW9kZWwub3BlbmVkLmRpc3BhdGNoKGVkaXRvcilcbiAgICAgICAgbW9kZWwuYWN0aXZhdGUocGF0aClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBnZXRBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmFjdGl2ZVxuICAgIH0sXG4gICAgXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICAgIGlmIChwYXRoICE9PSBudWxsICYmIG1vZGVsLmluZGV4T2YocGF0aCkgPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICBtb2RlbC5hY3RpdmUgPSBwYXRoXG4gICAgICBtb2RlbC5hY3RpdmF0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICAgIGZpbmRlci5zZXRQYXRoKHBhdGgpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0sXG4gICAgXG4gICAgbmV4dEZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZSh0cnVlKVxuICAgIH0sXG4gICAgXG4gICAgcHJldkZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZShmYWxzZSlcbiAgICB9LFxuICAgIFxuICAgIHJvdGF0ZUZpbGU6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5lZGl0b3JzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeFxuICAgICAgaWYgKG1vZGVsLmFjdGl2ZSA9PT0gbnVsbCkge1xuICAgICAgICBpZHggPSBuZXh0ID8gMCA6IG1vZGVsLmVkaXRvcnMubGVuZ3RoIC0gMVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlkeCA9IG1vZGVsLmluZGV4T2YobW9kZWwuYWN0aXZlKVxuICAgICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgICAgaWR4ID0gKGlkeCArIG1vZGVsLmVkaXRvcnMubGVuZ3RoKSAlIG1vZGVsLmVkaXRvcnMubGVuZ3RoXG4gICAgICB9XG4gICAgICBtb2RlbC5hY3RpdmF0ZShtb2RlbC5lZGl0b3JzW2lkeF0uZ2V0UGF0aCgpKVxuICAgIH0sXG4gICAgXG4gICAgY2xvc2U6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHZhciBpZHggPSBtb2RlbC5pbmRleE9mKHBhdGgpXG4gICAgICBpZiAoaWR4ID09IC0xKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICBpZiAobW9kZWwuZWRpdG9ycy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgIG1vZGVsLmFjdGl2YXRlKG51bGwpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbW9kZWwucHJldkZpbGUoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBtb2RlbC5lZGl0b3JzLnNwbGljZShpZHgsIDEpXG4gICAgICBtb2RlbC5jbG9zZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHJlbG9hZDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuY2xvc2UocGF0aClcbiAgICAgIG1vZGVsLm9wZW4ocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGluZGV4T2Y6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHJldHVybiBtb2RlbC5nZXRGaWxlcygpLmluZGV4T2YocGF0aClcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIuc2VsZWN0ZWQuYWRkKG1vZGVsLm9wZW4pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JNYW5hZ2VyXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcIi4vY29kZW1pcnJvclwiKVxudmFyIFNlbGVjdEVuY29kaW5nRGlhbG9nVmlldyA9IHJlcXVpcmUoXCIuL3NlbGVjdC1lbmNvZGluZy1kaWFsb2ctdmlld1wiKVxuXG52YXIgRWRpdG9yVmlldyA9IGZ1bmN0aW9uKCRyb290LCBlZGl0b3IsIGVkaXRvcl9tZ3IpIHtcbiAgdmFyIGZpbGUgPSBlZGl0b3IuZ2V0RmlsZSgpXG4gIFxuICB2YXIgY20gPSBDb2RlTWlycm9yKCRyb290WzBdLCB7XG4gICAgdmFsdWU6IGVkaXRvci50ZXh0LmdldCgpLFxuICAgIG1vZGU6IGVkaXRvci5tb2RlLmdldCgpLFxuICB9KVxuICBcbiAgLy8gZm9vdGVyXG4gICRyb290LmFwcGVuZChcbiAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWZvb3RcIj4nKS5hcHBlbmQoXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1lc3NhZ2VcIj4nKSxcbiAgICAgICQoJzxidXR0b24gY2xhc3M9XCJlZGl0b3ItaW5kZW50IGxpbmtcIiB0eXBlPVwiYnV0dG9uXCI+JyksXG4gICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWVvbCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1lbmNvZGluZyBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tb2RlXCI+JylcbiAgICApXG4gIClcbiAgXG4gIFNlbGVjdEVuY29kaW5nRGlhbG9nVmlldyhcbiAgICBlZGl0b3Iuc2VsZWN0X2VuY29kaW5nX2RpYWxvZ1xuICApXG4gIFxuICAvLyBzYXZlXG4gIHZhciBsYXN0X2dlbmVyYXRpb24gPSBjbS5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpXG4gIHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGdlbmVyYXRpb24gPSBjbS5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpXG4gICAgZWRpdG9yLnNhdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgbGFzdF9nZW5lcmF0aW9uID0gZ2VuZXJhdGlvblxuICAgIH0pXG4gIH1cbiAgY20ub24oXCJjaGFuZ2VzXCIsIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvci50ZXh0LnNldChjbS5nZXRWYWx1ZSgpKVxuICAgIGVkaXRvci5zdGF0dXMuc2V0KFxuICAgICAgY20uaXNDbGVhbihsYXN0X2dlbmVyYXRpb24pID8gXCJjbGVhblwiIDogXCJtb2RpZmllZFwiXG4gICAgKVxuICB9KVxuICBlZGl0b3IudGV4dC5vYnNlcnZlKGZ1bmN0aW9uKHRleHQpIHtcbiAgICBpZiAodGV4dCAhPSBjbS5nZXRWYWx1ZSgpKSB7XG4gICAgICBjbS5zZXRWYWx1ZSh0ZXh0KVxuICAgIH1cbiAgfSlcblxuICAvLyBtb2RlXG4gIHZhciB1cGRhdGVNb2RlID0gZnVuY3Rpb24obW9kZSkge1xuICAgIGNtLnNldE9wdGlvbihcIm1vZGVcIiwgbW9kZSlcbiAgICBDb2RlTWlycm9yLnJlZ2lzdGVySGVscGVyKFwiaGludFdvcmRzXCIsIG1vZGUsIG51bGwpXG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItbW9kZVwiKS50ZXh0KG1vZGUpXG4gIH1cbiAgZWRpdG9yLm1vZGUub2JzZXJ2ZSh1cGRhdGVNb2RlKVxuICB1cGRhdGVNb2RlKGVkaXRvci5tb2RlLmdldCgpKVxuICBcbiAgLy8gaW5kZW50XG4gIHZhciB1cGRhdGVJbmRlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLnRleHQodHlwZSlcbiAgICBpZiAodHlwZSA9PSBcIlRBQlwiKSB7XG4gICAgICBjbS5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCB0cnVlKVxuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCA0KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIGZhbHNlKVxuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCBOdW1iZXIodHlwZS5yZXBsYWNlKFwiU1BcIiwgXCJcIikpKVxuICAgIH1cbiAgfVxuICBlZGl0b3IuaW5kZW50Lm9ic2VydmUodXBkYXRlSW5kZW50KVxuICB1cGRhdGVJbmRlbnQoZWRpdG9yLmluZGVudC5nZXQoKSlcbiAgJHJvb3QuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvci5pbmRlbnQucm90YXRlKClcbiAgfSlcbiAgXG4gIC8vIGxpbmUgc2VwcmF0b3JcbiAgdmFyIHVwZGF0ZUVvbCA9IGZ1bmN0aW9uKGVvbCkge1xuICAgIHZhciBuYW1lcyA9IHtcbiAgICAgIFwiXFxyXCI6IFwiQ1JcIixcbiAgICAgIFwiXFxuXCI6IFwiTEZcIixcbiAgICAgIFwiXFxyXFxuXCI6IFwiQ1JMRlwiLFxuICAgIH1cbiAgICAkcm9vdC5maW5kKFwiLmVkaXRvci1lb2xcIikudGV4dChuYW1lc1tlb2xdKVxuICB9XG4gIGZpbGUuZW9sLm9ic2VydmUodXBkYXRlRW9sKVxuICB1cGRhdGVFb2woZmlsZS5lb2wuZ2V0KCkpXG4gICRyb290LmZpbmQoXCIuZWRpdG9yLWVvbFwiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICBmaWxlLmVvbC5yb3RhdGUoKVxuICB9KVxuICBcbiAgLy8gZW5jb2RpbmdcbiAgdmFyIHVwZGF0ZUVuY29kaW5nID0gZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICAkcm9vdC5maW5kKFwiLmVkaXRvci1lbmNvZGluZ1wiKS50ZXh0KGVuY29kaW5nKVxuICB9XG4gIGZpbGUuZW5jb2RpbmcuYWRkKHVwZGF0ZUVuY29kaW5nKVxuICB1cGRhdGVFbmNvZGluZyhmaWxlLmVuY29kaW5nLmdldCgpKVxuICAkcm9vdC5maW5kKFwiLmVkaXRvci1lbmNvZGluZ1wiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICBlZGl0b3Iuc2VsZWN0X2VuY29kaW5nX2RpYWxvZy5zaG93KFxuICAgICAgZmlsZS5lbmNvZGluZy5nZXQoKVxuICAgIClcbiAgfSlcbiAgZWRpdG9yLnNlbGVjdF9lbmNvZGluZ19kaWFsb2cuY29uZmlybWVkLmFkZChmdW5jdGlvbihlbmNvZGluZykge1xuICAgIGZpbGUuZW5jb2Rpbmcuc2V0KGVuY29kaW5nKVxuICB9KVxuICBcbiAgLy8gbWVzc2FnZVxuICBlZGl0b3IubWVzc2FnZS5vYnNlcnZlKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAkcm9vdC5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQobWVzc2FnZSlcbiAgfSlcbiAgXG4gIC8vIGFjdGl2ZVxuICBlZGl0b3JfbWdyLmFjdGl2YXRlZC5hZGQoZnVuY3Rpb24oYWN0aXZlKSB7XG4gICAgaWYgKGFjdGl2ZSA9PSBmaWxlLmdldFBhdGgoKSkge1xuICAgICAgJHJvb3QuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIGNtLmZvY3VzKClcbiAgICAgIGNtLnJlZnJlc2goKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICRyb290LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgfVxuICB9KVxuICBcbiAgLy8gc2F2ZSB3aXRoIGNvbW1hbmQtc1xuICBNb3VzZXRyYXAoJHJvb3RbMF0pLmJpbmQoXCJtb2Qrc1wiLCBmdW5jdGlvbigpIHtcbiAgICBzYXZlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JWaWV3XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxudmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiLi9jb2RlbWlycm9yXCIpXG52YXIgSW5kZW50ID0gcmVxdWlyZShcIi4vaW5kZW50XCIpXG52YXIgU2VsZWN0RW5jb2RpbmdEaWFsb2cgPSByZXF1aXJlKFwiLi9zZWxlY3QtZW5jb2RpbmctZGlhbG9nXCIpXG5cbnZhciBFZGl0b3IgPSBmdW5jdGlvbihmaWxlKSB7XG4gIHZhciBlZGl0b3IgPSB7XG4gICAgdGV4dDogT2JzZXJ2YWJsZShcIlwiKSxcbiAgICBzdGF0dXM6IE9ic2VydmFibGUoXCJjbGVhblwiKSxcbiAgICBtb2RlOiBPYnNlcnZhYmxlKFwidGV4dFwiKSxcbiAgICBpbmRlbnQ6IEluZGVudCgpLFxuICAgIG1lc3NhZ2U6IE9ic2VydmFibGUoXCJcIiksXG4gICAgc2VsZWN0X2VuY29kaW5nX2RpYWxvZzogU2VsZWN0RW5jb2RpbmdEaWFsb2coKSxcbiAgICBcbiAgICBnZXRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmaWxlXG4gICAgfSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmaWxlLmdldFBhdGgoKVxuICAgIH0sXG4gICAgXG4gICAgbG9hZDogZnVuY3Rpb24odGV4dCkge1xuICAgICAgcmV0dXJuIGZpbGUucmVhZCgpLnRoZW4oZnVuY3Rpb24odGV4dCkge1xuICAgICAgICBlZGl0b3IuaW5kZW50LnNldChJbmRlbnQuZGV0ZWN0SW5kZW50VHlwZSh0ZXh0KSlcbiAgICAgICAgZWRpdG9yLnRleHQuc2V0KHRleHQpXG4gICAgICAgIGVkaXRvci5tZXNzYWdlLnNldChcIkxvYWRlZC5cIilcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBzYXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmaWxlLndyaXRlKGVkaXRvci50ZXh0LmdldCgpKS5jYXRjaChmdW5jdGlvbihlcnJvcikge1xuICAgICAgICBlZGl0b3IubWVzc2FnZS5zZXQoXCJTYXZlIGZhaWxlZC4gXCIgKyByZXBseS5lcnJvcilcbiAgICAgICAgZWRpdG9yLnN0YXR1cy5zZXQoXCJlcnJvclwiKVxuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgZWRpdG9yLnN0YXR1cy5zZXQoXCJjbGVhblwiKVxuICAgICAgICBlZGl0b3IubWVzc2FnZS5zZXQoXCJTYXZlZC5cIilcbiAgICAgIH0pXG4gICAgfSxcbiAgfVxuICBcbiAgdmFyIGRldGVjdE1vZGUgPSAoZnVuY3Rpb24ocGF0aCkge1xuICAgIHZhciBleHRlbnNpb24gPSBwYXRoLnJlcGxhY2UoLy4qWy5dKC4rKSQvLCBcIiQxXCIpXG4gICAgdmFyIG1vZGUgPSB7XG4gICAgICBodG1sOiBcInBocFwiLFxuICAgICAgdGFnOiBcInBocFwiLFxuICAgIH1bZXh0ZW5zaW9uXVxuICAgIGlmIChtb2RlKSB7XG4gICAgICByZXR1cm4gbW9kZVxuICAgIH1cbiAgICBtb2RlID0gQ29kZU1pcnJvci5maW5kTW9kZUJ5RXh0ZW5zaW9uKGV4dGVuc2lvbilcbiAgICBpZiAobW9kZSkge1xuICAgICAgcmV0dXJuIG1vZGUubW9kZVxuICAgIH1cbiAgICByZXR1cm4gXCJ0ZXh0XCJcbiAgfSlcbiAgZWRpdG9yLm1vZGUuc2V0KGRldGVjdE1vZGUoZmlsZS5nZXRQYXRoKCkpKVxuICBcbiAgLy8gYXV0byBzYXZlXG4gIGVkaXRvci50ZXh0Lm9ic2VydmUoXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICBpZiAoZWRpdG9yLnN0YXR1cy5nZXQoKSAhPSBcImNsZWFuXCIpIHtcbiAgICAgIGVkaXRvci5zYXZlKClcbiAgICB9XG4gIH0sIDQwMDApKVxuICBcbiAgcmV0dXJuIGVkaXRvclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvclxuIiwidmFyIFJvdGF0ZSA9IHJlcXVpcmUoXCIuL3JvdGF0ZVwiKVxuXG52YXIgRW9sID0gZnVuY3Rpb24oZW9sKSB7XG4gIHJldHVybiBSb3RhdGUoW1wiXFxuXCIsIFwiXFxyXFxuXCIsIFwiXFxyXCJdLCBlb2wpXG59XG5cbkVvbC5kZXRlY3QgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIGlmICh0ZXh0Lm1hdGNoKFwiXFxyXFxuXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXFxuXCJcbiAgfVxuICBpZiAodGV4dC5tYXRjaChcIlxcclwiKSkge1xuICAgIHJldHVybiBcIlxcclwiXG4gIH1cbiAgcmV0dXJuIFwiXFxuXCJcbn1cblxuRW9sLnJlZ3VsYXRlID0gZnVuY3Rpb24odGV4dCkge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC8oXFxyXFxufFxccikvLCBcIlxcblwiKVxufSxcblxubW9kdWxlLmV4cG9ydHMgPSBFb2xcbiIsImNvbnN0IFJlYWN0ID0gcmVxdWlyZShcInJlYWN0XCIpXG5jb25zdCBGaWxlVGFiID0gcmVxdWlyZShcIi4vZmlsZS10YWIuanN4XCIpXG5cbmNvbnN0IEZpbGVUYWJMaXN0ID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IG1nciA9IHByb3BzLmVkaXRvck1nclxuICBjb25zdCBvbkNsaWNrID0gKHBhdGgpID0+IHtcbiAgICBtZ3IuYWN0aXZhdGUocGF0aClcbiAgfVxuICBjb25zdCBpdGVtcyA9IG1nci5lZGl0b3JzLm1hcCgoZWRpdG9yKSA9PiB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxGaWxlVGFiXG4gICAgICAgIGtleT17ZWRpdG9yLmdldFBhdGgoKX1cbiAgICAgICAgZWRpdG9yPXtlZGl0b3J9XG4gICAgICAgIGFjdGl2ZT17bWdyLmFjdGl2ZSA9PSBlZGl0b3IuZ2V0UGF0aCgpfVxuICAgICAgICBvbkNsaWNrPXtvbkNsaWNrfVxuICAgICAgICAvPlxuICAgIClcbiAgfSlcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGlkPVwiZmlsZXNcIj57aXRlbXN9PC9kaXY+XG4gIClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlVGFiTGlzdFxuIiwiY29uc3QgUmVhY3QgPSByZXF1aXJlKFwicmVhY3RcIilcblxuY29uc3QgRmlsZVRhYiA9IChwcm9wcykgPT4ge1xuICBjb25zdCBwYXRoID0gcHJvcHMuZWRpdG9yLmdldFBhdGgoKVxuICBjb25zdCBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIilcbiAgY29uc3QgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKVxuICBjb25zdCBvbkNsaWNrID0gKGUpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBwcm9wcy5vbkNsaWNrKHBhdGgpXG4gIH1cbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBjbGFzc05hbWU9e1wiZmlsZS1pdGVtIFwiICsgKHByb3BzLmFjdGl2ZSA/IFwiYWN0aXZlXCIgOiBcIlwiKX1cbiAgICAgIG9uQ2xpY2s9e29uQ2xpY2t9PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJkaXJcIj57ZGlyfTwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJuYW1lXCI+e25hbWV9PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT17XCJzdGF0dXMgXCIgKyBwcm9wcy5lZGl0b3Iuc3RhdHVzLmdldCgpfT48L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVUYWJcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIE9ic2VydmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcnZhYmxlXCIpXG52YXIgRW9sID0gcmVxdWlyZShcIi4vZW9sXCIpXG5cbnZhciBGaWxlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgZmlsZSA9IHtcbiAgICBlb2w6IEVvbCgpLFxuICAgIGVuY29kaW5nOiBPYnNlcnZhYmxlKCksXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGF0aFxuICAgIH0sXG4gICAgXG4gICAgcmVhZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgICB9KS5mYWlsKHJlamVjdCkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgIGZpbGUuZW5jb2Rpbmcuc2V0KHJlcGx5LmVuY29kaW5nKVxuICAgICAgICAgIGZpbGUuZW9sLnNldChFb2wuZGV0ZWN0KHJlcGx5LmNvbnRlbnQpKVxuICAgICAgICAgIHZhciBjb250ZW50ID0gRW9sLnJlZ3VsYXRlKHJlcGx5LmNvbnRlbnQpXG4gICAgICAgICAgcmVzb2x2ZShjb250ZW50KVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHdyaXRlOiBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiBcIi93cml0ZS5waHBcIixcbiAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgIGVuY29kaW5nOiBmaWxlLmVuY29kaW5nLmdldCgpLFxuICAgICAgICAgICAgY29udGVudDogdGV4dC5yZXBsYWNlKC9cXG4vZywgZmlsZS5lb2wuZ2V0KCkpXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICBpZiAocmVwbHkgPT0gXCJva1wiKSB7XG4gICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZWplY3QocmVwbHkuZXJyb3IpXG4gICAgICAgICAgfVxuICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJlamVjdChcIlwiKVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9LFxuICB9XG4gIHJldHVybiBmaWxlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZVxuIiwiY29uc3QgUmVhY3QgPSByZXF1aXJlKFwicmVhY3RcIilcblxuY29uc3QgbmFtZV9yeCA9IG5ldyBSZWdFeHAoXCIvKFteL10qLz8pJFwiKVxuXG5jb25zdCBGaW5kZXJTdWdnZXN0SXRlbSA9IGZ1bmN0aW9uKHByb3BzKSB7XG4gIGNvbnN0IG5hbWUgPSBuYW1lX3J4LmV4ZWMocHJvcHMucGF0aClbMV1cbiAgY29uc3Qgb25DbGljayA9IChlKSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgcHJvcHMub25TZWxlY3QocHJvcHMucGF0aClcbiAgfVxuICBjb25zdCBvbk1vdXNlRG93biA9IChlKSA9PiB7XG4gICAgLy8gcHJldmVudCBmcm9tIGdldHRpbmcgZm9jdXNlZFxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICB9XG4gIHJldHVybiAoXG4gICAgPGFcbiAgICAgIGNsYXNzTmFtZT17cHJvcHMuYWN0aXZlID8gXCJzZWxlY3RlZFwiIDogXCJcIn1cbiAgICAgIG9uQ2xpY2s9e29uQ2xpY2t9XG4gICAgICBvbk1vdXNlRG93bj17b25Nb3VzZURvd259PlxuICAgICAge25hbWV9XG4gICAgPC9hPlxuICApXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdEl0ZW1cbiIsInZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgRmluZGVyU3VnZ2VzdCA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgaXRlbXM6IFtdLFxuICAgIGN1cnNvcjogbnVsbCwgLy8gaGlnaGxpZ2h0ZWQgaXRlbVxuICAgIFxuICAgIGl0ZW1zX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBjdXJzb3JfbW92ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgdXJsOiBcIi9maW5kZXIucGhwXCIsXG4gICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICB9LFxuICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImZhaWxlZCB0byBmZXRjaCBzdWdnZXN0IGZvciB0aGUgcGF0aDogXCIgKyBwYXRoKVxuICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICBtb2RlbC5zZXRJdGVtcyhyZXBseS5pdGVtcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgIHJldHVybiByZXBseS5iYXNlICsgaVxuICAgICAgICB9KSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBzZXRJdGVtczogZnVuY3Rpb24oaXRlbXMpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihudWxsKVxuICAgICAgbW9kZWwuaXRlbXMgPSBpdGVtc1xuICAgICAgbW9kZWwuaXRlbXNfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC5pdGVtcylcbiAgICB9LFxuICAgIFxuICAgIGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5pdGVtc1xuICAgIH0sXG4gICAgXG4gICAgZ2V0Q3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5jdXJzb3JcbiAgICB9LFxuICAgIFxuICAgIHNldEN1cnNvcjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmN1cnNvcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmN1cnNvciA9IHBhdGhcbiAgICAgIG1vZGVsLmN1cnNvcl9tb3ZlZC5kaXNwYXRjaChtb2RlbC5jdXJzb3IpXG4gICAgfSxcbiAgICBcbiAgICBtb3ZlQ3Vyc29yOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuY3Vyc29yID09PSBudWxsKSB7XG4gICAgICAgIGlmIChtb2RlbC5pdGVtcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1swXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHggPSBtb2RlbC5pdGVtcy5pbmRleE9mKG1vZGVsLmN1cnNvcilcbiAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgaWR4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW9kZWwuaXRlbXMubGVuZ3RoIC0gMSwgaWR4KSlcbiAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1tpZHhdKVxuICAgIH0sXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IocGF0aClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICBtb2RlbC51cGRhdGUoZmluZGVyLmdldFBhdGgoKSlcbiAgICB9XG4gIH0pXG4gIFxuICBmaW5kZXIucGF0aF9jaGFuZ2VkLmFkZChfLmRlYm91bmNlKG1vZGVsLnVwZGF0ZSwgMjUwKSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RcbiIsImNvbnN0IFJlYWN0ID0gcmVxdWlyZShcInJlYWN0XCIpXG5jb25zdCAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuY29uc3QgRmluZGVyU3VnZ2VzdEl0ZW0gPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdC1pdGVtLmpzeFwiKVxuXG5jbGFzcyBGaW5kZXJTdWdnZXN0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICBzdXBlcihwcm9wcylcbiAgICB0aGlzLmhhbmRsZUNoYW5nZSA9IHRoaXMuaGFuZGxlQ2hhbmdlLmJpbmQodGhpcylcbiAgfVxuICBcbiAgaGFuZGxlQ2hhbmdlKCkge1xuICAgIHRoaXMuZm9yY2VVcGRhdGUoKVxuICB9XG4gIFxuICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICB0aGlzLnByb3BzLnN1Z2dlc3QuaXRlbXNfY2hhbmdlZC5hZGQodGhpcy5oYW5kbGVDaGFuZ2UpXG4gICAgdGhpcy5wcm9wcy5zdWdnZXN0LmN1cnNvcl9tb3ZlZC5hZGQodGhpcy5oYW5kbGVDaGFuZ2UpXG4gIH1cbiAgXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgIHRoaXMucHJvcHMuc3VnZ2VzdC5pdGVtc19jaGFuZ2VkLnJlbW92ZSh0aGlzLmhhbmRsZUNoYW5nZSlcbiAgICB0aGlzLnByb3BzLnN1Z2dlc3QuY3Vyc29yX21vdmVkLnJlbW92ZSh0aGlzLmhhbmRsZUNoYW5nZSlcbiAgfVxuICBcbiAgY29tcG9uZW50RGlkVXBkYXRlKCkge1xuICAgIGlmICh0aGlzLnByb3BzLnN1Z2dlc3QuY3Vyc29yKSB7XG4gICAgICB0aGlzLnNjcm9sbEludG9WaWV3KFxuICAgICAgICB0aGlzLiRsaXN0LFxuICAgICAgICB0aGlzLiRsaXN0LmZpbmQoXCIuc2VsZWN0ZWRcIilcbiAgICAgIClcbiAgICB9XG4gIH1cbiAgXG4gIHNjcm9sbEludG9WaWV3KCRwYXJlbnQsICR0YXJnZXQpIHtcbiAgICB2YXIgaGVpZ2h0ID0gJHRhcmdldC5oZWlnaHQoKVxuICAgIHZhciB0b3AgPSAkdGFyZ2V0LnByZXZBbGwoKS5sZW5ndGggKiBoZWlnaHRcbiAgICB2YXIgYm90dG9tID0gdG9wICsgaGVpZ2h0XG4gICAgdmFyIHZpZXdfaGVpZ2h0ID0gJHBhcmVudC5pbm5lckhlaWdodCgpXG4gICAgaWYgKHRvcCAtICRwYXJlbnQuc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICAkcGFyZW50LnNjcm9sbFRvcCh0b3ApXG4gICAgfVxuICAgIGlmIChib3R0b20gLSAkcGFyZW50LnNjcm9sbFRvcCgpID4gdmlld19oZWlnaHQpIHtcbiAgICAgICRwYXJlbnQuc2Nyb2xsVG9wKGJvdHRvbSAtIHZpZXdfaGVpZ2h0KVxuICAgIH1cbiAgfVxuICBcbiAgcmVuZGVyKCkge1xuICAgIGNvbnN0IHN1Z2dlc3QgPSB0aGlzLnByb3BzLnN1Z2dlc3RcbiAgICBjb25zdCBzZWxmID0gdGhpc1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2XG4gICAgICAgIGlkPVwiZmluZGVyLWl0ZW1zXCJcbiAgICAgICAgcmVmPXsobGlzdCkgPT4gc2VsZi4kbGlzdCA9ICQobGlzdCl9XG4gICAgICAgIGNsYXNzTmFtZT17c3VnZ2VzdC5pdGVtcy5sZW5ndGggPyBcImFjdGl2ZVwiIDogXCJcIn0+XG4gICAgICAgIHtzdWdnZXN0Lml0ZW1zLm1hcCgocGF0aCkgPT4gKFxuICAgICAgICAgICAgPEZpbmRlclN1Z2dlc3RJdGVtXG4gICAgICAgICAgICBrZXk9e3BhdGh9XG4gICAgICAgICAgICBwYXRoPXtwYXRofVxuICAgICAgICAgICAgYWN0aXZlPXtzdWdnZXN0LmN1cnNvciA9PT0gcGF0aH1cbiAgICAgICAgICAgIG9uU2VsZWN0PXtzdWdnZXN0LnNlbGVjdH0gLz5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICApXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0XG4iLCJjb25zdCBSZWFjdCA9IHJlcXVpcmUoXCJyZWFjdFwiKVxuY29uc3QgUmVhY3RET00gPSByZXF1aXJlKFwicmVhY3QtZG9tXCIpXG5jb25zdCBGaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXIuanN4XCIpXG5cbnZhciBGaW5kZXJWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIGZpbmRlcikge1xuICBjb25zdCByZW5kZXIgPSAoKSA9PiB7XG4gICAgUmVhY3RET00ucmVuZGVyKFxuICAgICAgKDxGaW5kZXIgZmluZGVyPXtmaW5kZXJ9IC8+KSxcbiAgICAgICRyb290WzBdXG4gICAgKVxuICB9XG4gIHJlbmRlcigpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIEZpbmRlclN1Z2dlc3QgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdFwiKVxuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIHBhdGhfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIHZpc2liaWxpdHlfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHBhdGg6IFwiL1wiLFxuICAgIHZpc2libGU6IGZhbHNlLFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChwYXRoKVxuICAgICAgaWYgKHBhdGguc3Vic3RyKC0xKSA9PSBcIi9cIikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmhpZGUoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IHRydWVcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gZmFsc2VcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuLy8gICAgICAgZWRpdG9yX21hbmFnZXIuYWN0aXZhdGUoZWRpdG9yX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgfSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5wYXRoXG4gICAgfSxcbiAgICBcbiAgICBzZXRQYXRoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5wYXRoID0gcGF0aFxuICAgICAgbW9kZWwucGF0aF9jaGFuZ2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBnb1RvUGFyZW50RGlyZWN0b3J5OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgoXG4gICAgICAgIG1vZGVsLnBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSovPyRcIiksIFwiXCIpXG4gICAgICApXG4gICAgfSxcbiAgICBcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGF0aCA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICAgIG1vZGVsLnNlbGVjdChwYXRoID8gcGF0aCA6IG1vZGVsLnBhdGgpXG4gICAgfSxcbiAgICBcbiAgICB0YWI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgbW9kZWwuc2V0UGF0aChjdXJzb3IpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGl0ZW1zID0gc3VnZ2VzdC5nZXRJdGVtcygpXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgbW9kZWwuc2V0UGF0aChpdGVtc1swXSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBzdWdnZXN0LnVwZGF0ZShtb2RlbC5wYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIHZhciBzdWdnZXN0ID0gbW9kZWwuc3VnZ2VzdCA9IEZpbmRlclN1Z2dlc3QobW9kZWwpXG4gIHN1Z2dlc3Quc2VsZWN0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBtb2RlbC5zZWxlY3QocGF0aClcbiAgfSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclxuIiwiY29uc3QgUmVhY3QgPSByZXF1aXJlKFwicmVhY3RcIilcbmNvbnN0IE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbmNvbnN0IEZhbHNlID0gcmVxdWlyZShcIi4vcmV0dXJuLWZhbHNlXCIpXG5jb25zdCBGaW5kZXJTdWdnZXN0ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3QuanN4XCIpXG5cbmNsYXNzIEZpbmRlciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgc3VwZXIocHJvcHMpXG4gICAgdGhpcy5oYW5kbGVDaGFuZ2UgPSB0aGlzLmhhbmRsZUNoYW5nZS5iaW5kKHRoaXMpXG4gIH1cbiAgXG4gIGhhbmRsZUNoYW5nZSgpIHtcbiAgICB0aGlzLmZvcmNlVXBkYXRlKClcbiAgfVxuICBcbiAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgY29uc3QgZmluZGVyID0gdGhpcy5wcm9wcy5maW5kZXJcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuaW5wdXRcbiAgICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZCh0aGlzLmhhbmRsZUNoYW5nZSlcbiAgICBmaW5kZXIucGF0aF9jaGFuZ2VkLmFkZCh0aGlzLmhhbmRsZUNoYW5nZSlcbiAgICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZCgodmlzaWJpbGl0eSkgPT4ge1xuICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgIGlucHV0LmZvY3VzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgTW91c2V0cmFwKGlucHV0KS5iaW5kKFwiZW50ZXJcIiwgRmFsc2UoZmluZGVyLmVudGVyKSlcbiAgICBNb3VzZXRyYXAoaW5wdXQpLmJpbmQoXCJ0YWJcIiwgRmFsc2UoZmluZGVyLnRhYikpXG4gICAgTW91c2V0cmFwKGlucHV0KS5iaW5kKFwiZXNjXCIsIEZhbHNlKGZpbmRlci5oaWRlKSlcbiAgICBNb3VzZXRyYXAoaW5wdXQpLmJpbmQoXCJkb3duXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgICAgZmluZGVyLnN1Z2dlc3QubW92ZUN1cnNvcih0cnVlKVxuICAgIH0pKVxuICAgIE1vdXNldHJhcChpbnB1dCkuYmluZChcInVwXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgICAgZmluZGVyLnN1Z2dlc3QubW92ZUN1cnNvcihmYWxzZSlcbiAgICB9KSlcbiAgICBNb3VzZXRyYXAoaW5wdXQpLmJpbmQoXCJtb2QrdVwiLCBGYWxzZShcbiAgICAgIGZpbmRlci5nb1RvUGFyZW50RGlyZWN0b3J5XG4gICAgKSlcbiAgfVxuICBcbiAgY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgdGhpcy5wcm9wcy5maW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLnJlbW92ZSh0aGlzLmhhbmRsZUNoYW5nZSlcbiAgICB0aGlzLnByb3BzLmZpbmRlci5wYXRoX2NoYW5nZWQucmVtb3ZlKHRoaXMuaGFuZGxlQ2hhbmdlKVxuICB9XG4gIFxuICByZW5kZXIoKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXNcbiAgICBjb25zdCBmaW5kZXIgPSB0aGlzLnByb3BzLmZpbmRlclxuICAgIFxuICAgIGNvbnN0IG9uQ2hhbmdlID0gKGUpID0+IHtcbiAgICAgIGZpbmRlci5zZXRQYXRoKGUudGFyZ2V0LnZhbHVlKVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gKFxuICAgICAgPGZvcm0gaWQ9XCJmaW5kZXJcIiBjbGFzc05hbWU9e2ZpbmRlci52aXNpYmxlID8gXCJhY3RpdmVcIiA6IFwiXCJ9PlxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICByZWY9eyhpbnB1dCkgPT4gc2VsZi5pbnB1dCA9IGlucHV0fVxuICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICBpZD1cImZpbmRlci1wYXRoXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJtb3VzZXRyYXBcIlxuICAgICAgICAgIGF1dG9Db21wbGV0ZT1cIm9mZlwiXG4gICAgICAgICAgdmFsdWU9e2ZpbmRlci5wYXRofVxuICAgICAgICAgIG9uQ2hhbmdlPXtvbkNoYW5nZX1cbiAgICAgICAgICBvbkJsdXI9e2ZpbmRlci5oaWRlfSAvPlxuICAgICAgICA8RmluZGVyU3VnZ2VzdFxuICAgICAgICAgIHN1Z2dlc3Q9e2ZpbmRlci5zdWdnZXN0fSAvPlxuICAgICAgPC9mb3JtPlxuICAgIClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclxuIiwidmFyIFJvdGF0ZSA9IHJlcXVpcmUoXCIuL3JvdGF0ZVwiKVxuXG52YXIgSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICByZXR1cm4gUm90YXRlKFtcIjRTUFwiLCBcIjJTUFwiLCBcIlRBQlwiXSwgdHlwZSlcbn1cblxuSW5kZW50LmRldGVjdEluZGVudFR5cGUgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKC9bXFxyXFxuXStcXHQvKSkge1xuICAgIHJldHVybiBcIlRBQlwiXG4gIH1cbiAgdmFyIGxpbmVzID0gY29udGVudC5zcGxpdCgvW1xcclxcbl0rLylcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpbmRlbnQgPSBsaW5lc1tpXS5yZXBsYWNlKC9eKCAqKS4qLywgXCIkMVwiKVxuICAgIGlmIChpbmRlbnQubGVuZ3RoID09IDIpIHtcbiAgICAgIHJldHVybiBcIjJTUFwiXG4gICAgfVxuICB9XG4gIHJldHVybiBcIjRTUFwiXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kZW50XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBFZGl0b3JNYW5hZ2VyVmlldyA9IHJlcXVpcmUoXCIuL2VkaXRvci1tYW5hZ2VyLXZpZXdcIilcbnZhciBGaW5kZXJWaWV3ID0gcmVxdWlyZShcIi4vZmluZGVyLXZpZXdcIilcblxudmFyIE1haW5WaWV3ID0gZnVuY3Rpb24oZWRpdG9yX21nciwgZmluZGVyKSB7XG4gIHZhciAkbWFpbiA9ICQoXCJtYWluXCIpXG4gIEVkaXRvck1hbmFnZXJWaWV3KFxuICAgICQoJzxkaXYgaWQ9XCJlZGl0b3JfbWFuYWdlclwiPicpLmFwcGVuZFRvKCRtYWluKSxcbiAgICBlZGl0b3JfbWdyXG4gIClcbiAgRmluZGVyVmlldyhcbiAgICAkKCc8ZGl2PicpLmFwcGVuZFRvKCRtYWluKSxcbiAgICBmaW5kZXJcbiAgKVxuICBcbiAgLy8gc2hvcnRjdXQga2V5c1xuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrO1wiLCBcIm1vZCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLm5leHRGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtzaGlmdCs7XCIsIFwibW9kK3NoaWZ0Kz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IucHJldkZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3dcIiwgXCJtb2Qra1wiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5jbG9zZShlZGl0b3JfbWdyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3JcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IucmVsb2FkKGVkaXRvcl9tZ3IuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1haW5WaWV3XG4iLCJ2YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBPYnNlcnZhYmxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIG9ic2VydmFibGUgPSBuZXcgU2lnbmFsKClcbiAgT2JqZWN0LmFzc2lnbihvYnNlcnZhYmxlLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gbmV3X3ZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIG9sZF92YWx1ZSA9IHZhbHVlXG4gICAgICB2YWx1ZSA9IG5ld192YWx1ZVxuICAgICAgb2JzZXJ2YWJsZS5kaXNwYXRjaCh2YWx1ZSwgb2xkX3ZhbHVlLCBvYnNlcnZhYmxlKVxuICAgIH0sXG4gICAgb2JzZXJ2ZTogb2JzZXJ2YWJsZS5hZGQsIC8vIGFsaWFzXG4gIH0pXG4gIHJldHVybiBvYnNlcnZhYmxlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gT2JzZXJ2YWJsZVxuIiwidmFyIHJldHVybkZhbHNlID0gZnVuY3Rpb24oZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZXR1cm5GYWxzZVxuIiwidmFyIE9ic2VydmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcnZhYmxlXCIpXG5cbnZhciBSb3RhdGUgPSBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlKSB7XG4gIHZhciBpc1ZhbGlkVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlcy5pbmRleE9mKHYpICE9IC0xXG4gIH1cbiAgXG4gIHZhciBjaGVja1ZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIGlmICghaXNWYWxpZFZhbHVlKHYpKSB7XG4gICAgICB0aHJvdyBcImludmFsaWQgdmFsdWU6IFwiICsgdlxuICAgIH1cbiAgfVxuICBjaGVja1ZhbHVlKHZhbHVlKVxuICBcbiAgdmFyIHJvdGF0ZSA9IE9ic2VydmFibGUodmFsdWUpXG4gIFxuICByb3RhdGUuZ2V0VmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHZhbHVlc1xuICB9XG4gIFxuICB2YXIgX3NldCA9IHJvdGF0ZS5zZXRcbiAgcm90YXRlLnNldCA9IGZ1bmN0aW9uKG5ld192YWx1ZSkge1xuICAgIGNoZWNrVmFsdWUobmV3X3ZhbHVlKVxuICAgIF9zZXQobmV3X3ZhbHVlKVxuICB9XG4gIFxuICByb3RhdGUucm90YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGlkeCA9IHZhbHVlcy5pbmRleE9mKHJvdGF0ZS5nZXQoKSlcbiAgICBpZHggPSAoaWR4ICsgMSkgJSB2YWx1ZXMubGVuZ3RoXG4gICAgcm90YXRlLnNldCh2YWx1ZXNbaWR4XSlcbiAgfVxuICBcbiAgcmV0dXJuIHJvdGF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdGF0ZVxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgRGlhbG9nID0gcmVxdWlyZShcIi4vZGlhbG9nXCIpXG5cbnZhciBTZWxlY3RFbmNvZGluZ0RpYWxvZ1ZpZXcgPSBmdW5jdGlvbihtb2RlbCkge1xuICB2YXIgJGNvbnRlbnQgPSAkKCc8ZGl2PicpLmFwcGVuZChcbiAgICAkKCc8c2VsZWN0IHNpemU9XCI0XCI+JyksXG4gICAgJCgnPGJ1dHRvbiBjbGFzcz1cIm9rXCI+T0s8L2J1dHRvbj4nKSxcbiAgICAkKCc8YnV0dG9uIGNsYXNzPVwiY2FuY2VsXCI+Q2FuY2VsPC9idXR0b24+JylcbiAgKVxuICBcbiAgdmFyICRkaWFsb2cgPSBEaWFsb2cudmlldygkY29udGVudCwgXCJzZWxlY3QtZW5jb2RpbmctZGlhbG9nXCIpXG5cbiAgdmFyICRzZWxlY3QgPSAkY29udGVudC5maW5kKFwic2VsZWN0XCIpXG4gICRzZWxlY3QuYXBwZW5kKG1vZGVsLm9wdGlvbnMubWFwKGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgcmV0dXJuICQoJzxvcHRpb24+JykudGV4dChlbmNvZGluZylcbiAgfSkpXG4gIG1vZGVsLmVuY29kaW5nLm9ic2VydmUoZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICAkc2VsZWN0LnZhbChlbmNvZGluZylcbiAgfSlcbiAgJHNlbGVjdC52YWwobW9kZWwuZW5jb2RpbmcuZ2V0KCkpXG4gICRzZWxlY3QuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgbW9kZWwuZW5jb2Rpbmcuc2V0KCRzZWxlY3QudmFsKCkpXG4gIH0pXG4gIFxuICAvLyBva1xuICAkY29udGVudC5maW5kKFwiYnV0dG9uLm9rXCIpLmNsaWNrKG1vZGVsLmNvbmZpcm0pXG4gIFxuICAvLyBjYW5jZWxcbiAgJGNvbnRlbnQuZmluZChcImJ1dHRvbi5jYW5jZWxcIikuY2xpY2sobW9kZWwuaGlkZSlcbiAgXG4gIG1vZGVsLnZpc2libGUub2JzZXJ2ZShmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgICRkaWFsb2cuYWRkQ2xhc3MoXCJ2aXNpYmxlXCIpXG4gICAgICAkY29udGVudC5maW5kKFwiaW5wdXQsIHNlbGVjdFwiKS5mb2N1cygpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJGRpYWxvZy5yZW1vdmVDbGFzcyhcInZpc2libGVcIilcbiAgICB9XG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0RW5jb2RpbmdEaWFsb2dWaWV3XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxuXG52YXIgU2VsZWN0RW5jb2RpbmdEaWFsb2cgPSBmdW5jdGlvbigpIHtcbiAgXG4gIHZhciBkaWFsb2cgPSB7XG4gICAgdmlzaWJsZTogT2JzZXJ2YWJsZShmYWxzZSksXG4gICAgZW5jb2Rpbmc6IE9ic2VydmFibGUoKSxcbiAgICBvcHRpb25zOiBbXG4gICAgICBcIlVURi04XCIsXG4gICAgICBcIkVVQy1KUFwiLFxuICAgICAgXCJTSklTLVdJTlwiLFxuICAgIF0sXG4gICAgY29uZmlybWVkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgY29uZmlybTogZnVuY3Rpb24oKSB7XG4gICAgICBkaWFsb2cudmlzaWJsZS5zZXQoZmFsc2UpXG4gICAgICBkaWFsb2cuY29uZmlybWVkLmRpc3BhdGNoKGRpYWxvZy5lbmNvZGluZy5nZXQoKSlcbiAgICB9LFxuICAgIFxuICAgIHNob3c6IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgICBkaWFsb2cuZW5jb2Rpbmcuc2V0KGVuY29kaW5nKVxuICAgICAgZGlhbG9nLnZpc2libGUuc2V0KHRydWUpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIGRpYWxvZy52aXNpYmxlLnNldChmYWxzZSlcbiAgICB9LFxuICB9XG4gIHJldHVybiBkaWFsb2dcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RFbmNvZGluZ0RpYWxvZ1xuIiwidmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbnZhciBFZGl0b3JNYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLW1hbmFnZXJcIilcbnZhciBGaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXJcIilcbnZhciBNYWluVmlldyA9IHJlcXVpcmUoXCIuL21haW4tdmlld1wiKVxuXG5tb2R1bGUuZXhwb3J0cy5ydW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGZpbmRlciA9IEZpbmRlcigpXG4gIHZhciBlZGl0b3JfbWdyID0gRWRpdG9yTWFuYWdlcihmaW5kZXIpXG4gIHZhciB2aWV3ID0gTWFpblZpZXcoZWRpdG9yX21nciwgZmluZGVyKVxuICBcbiAgdmFyIHNhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaWxlcyA9IGVkaXRvcl9tZ3IuZ2V0RmlsZXMoKVxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwib3Blbi1maWxlc1wiLCBKU09OLnN0cmluZ2lmeShmaWxlcykpXG4gIH1cbiAgdmFyIGxvYWRGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwib3Blbi1maWxlc1wiKSB8fCBcIltdXCIpXG4gIH1cbiAgbG9hZEZpbGVMaXN0KCkuZm9yRWFjaChmdW5jdGlvbihwYXRoKSB7XG4gICAgZWRpdG9yX21nci5vcGVuKHBhdGgpXG4gIH0pXG4gIFxuICBlZGl0b3JfbWdyLm9wZW5lZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBlZGl0b3JfbWdyLmNsb3NlZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBcbiAgLy8gc2hvdyBmaW5kZXJcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK29cIiwgXCJtb2QrcFwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmluZGVyLnNob3coKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbn1cbiJdfQ==
>>>>>>> Use React for Finder
