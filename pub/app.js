require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var CodeMirror = require("codemirror")

var indentAfterPaste = function(cm, change) {
  if (change.origin != "paste") {
    return
  }
  if (CodeMirror.cmpPos(change.from, change.to)) {
    return
  }
  // check if the insertion point is at the end of the line
  var dest = cm.getLine(change.from.line)
  if (dest.length != change.from.ch) {
    return
  }
  // check if the line consists of only white spaces
  if (dest.match(/[^ \t]/)) {
    return
  }
  // remove the last empty line
  if (change.text[change.text.length - 1] == "") {
    change.text.pop()
  }
  var base_indent = change.text[0].match(/^[ \t]*/)[0]
  change.text = change.text.map(function(line, i) {
    line = line.match(/^([ \t]*)(.*)/)
    var indent = line[1]
    var text = line[2]
    indent = (dest + indent).substr(0, dest.length + indent.length - base_indent.length)
    return indent + text
  })
  change.text[0] = change.text[0].substr(dest.length)
}

module.exports = indentAfterPaste

},{"codemirror":"codemirror"}],2:[function(require,module,exports){
var CodeMirror = require("codemirror")
var _ = require("underscore")
require("codemirror-addon")
require("./mark")
require("./select-line")
require("./select-word")
require("./split-into-lines")
require("./text-mode")

Object.assign(CodeMirror.defaults, {
  lineNumbers: true,
  tabSize: 4,
  showCursorWhenSelecting: true,
  autoCloseBrackets: true,
  matchBrackets: true,
  matchTags: true,
  autoCloseTags: true,
  styleActiveLine: {nonEmpty: true},
  styleSelectedText: true,
  dragDrop: false,
  extraKeys: {
    "Ctrl-Space": "autocomplete",
    "Ctrl-U": "autocomplete",
    "Ctrl-/": "toggleComment",
    "Cmd-/": "toggleComment",
    "Tab": "indentAuto",
    "Ctrl-D": false,
    "Cmd-D": false,
  },
})

CodeMirror.defineInitHook(function(cm) {
  // maintain indentation on paste
  cm.on("beforeChange", require("./indent-after-paste"))
  
  // key bindings
  var input = cm.getInputField()
  input.className += " mousetrap" // enable hotkey
  var keymap = {
    "alt+b": "goWordLeft",
    "alt+f": "goWordRight",
    "alt+h": "delWordBefore",
    "alt+d": "delWordAfter",
    "mod+m": "mark",
    "mod+d": "selectWord",
    "mod+l": "selectLine",
    "mod+shift+l": "splitIntoLines",
  }
  _.each(keymap, function(command, key) {
    Mousetrap(input).bind(key, function() {
      cm.execCommand(command)
      return false
    })
  })
})

module.exports = CodeMirror

},{"./indent-after-paste":1,"./mark":3,"./select-line":4,"./select-word":5,"./split-into-lines":6,"./text-mode":7,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","underscore":"underscore"}],3:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.defineInitHook(function(cm) {
  cm.marks = []
})

CodeMirror.commands.mark = function(cm) {
  var cursor = cm.getCursor()
  if (marks.length) {
    var last = cm.marks[cm.marks.length - 1]
    if (last.line == cursor.line && last.ch == cursor.ch) {
      cm.setSelections(cm.marks.map(function(m) {
        return {head: m, anchor: m}
      }), cm.marks.length - 1)
      cm.marks = []
      return
    }
  }
  cm.marks.push(cursor)
}

},{"codemirror":"codemirror"}],4:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.commands.selectLine = function(cm) {
  cm.setSelections(
    cm.listSelections().map(function(i) {
      return {
        anchor: {
          line: i.head.line + 1,
          ch: 0,
        },
        head: {
          line: i.anchor.line,
          ch: 0,
        }
      }
    })
  )
}

},{"codemirror":"codemirror"}],5:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.commands.selectWord = function(cm) {
  cm.setSelections(
    cm.listSelections().map(function(i) {
      return cm.findWordAt(i.anchor)
    })
  )
}

},{"codemirror":"codemirror"}],6:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.commands.splitIntoLines = function(cm) {
  var selections = cm.listSelections()
  if (selections.length != 1) {
    // Do nothing
    return
  }
  var anchor = selections[0].anchor
  var head = selections[0].head
  var new_selections = []
  for (var i = anchor.line; i <= head.line; ++i) {
    new_selections.push({
      anchor: {
        line: i,
        ch: i == anchor.line ? anchor.ch : 0,
      },
      head: {
        line: i,
        ch: i == head.line ? head.ch : Infinity,
      },
    })
  }
  cm.setSelections(new_selections)
}

},{"codemirror":"codemirror"}],7:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.defineSimpleMode("text", {
  start: [],
  comment: [],
  meta: {},
})

},{"codemirror":"codemirror"}],8:[function(require,module,exports){
var $ = require("jquery");
var _ = require("underscore");
var Signal = require("signals").Signal
var CodeMirror = require("./codemirror");

// EditorManager
var EditorManager = function() {
  this.status_changed = new Signal();
};
EditorManager.prototype.open = function(path) {
  var self = this;
  return new Promise(function(resolve, reject) {
    $.ajax({
      method: "post",
      url: "/read.php",
      timeout: 3000,
      data: {
        path: path
      },
      dataType: "json"
    }).done(function(reply){
      if (reply.error) {
        alert(reply.error);
        reject();
        return;
      }
      var encoding = reply.encoding;
      var editor = $("<div>").addClass("editor").appendTo("#editors");
      var mode = (function() {
        var extension = path.replace(/.*[.](.+)$/, "$1");
        var mode = {
          html: "php",
          tag: "php",
        }[extension];
        if (mode) {
          return mode;
        }
        mode = CodeMirror.findModeByExtension(extension);
        if (mode) {
          return mode.mode;
        }
        return "text";
      })();
      (function() {
        var code_mirror = CodeMirror(editor[0], {
          value: reply.content,
          mode: mode,
        });
        CodeMirror.registerHelper("hintWords", mode, null);
        code_mirror.on("changes", function() {
          autoSave();
          self.status_changed.dispatch(
            path,
            code_mirror.isClean(code_mirror.last_save) ? "clean": "modified"
          );
        });
        
        code_mirror.last_save = code_mirror.changeGeneration(true);
        // status bar
        editor.append(
          $('<div class="editor-foot">').append(
            $('<div class="editor-message">'),
            $('<button class="editor-indent link" type="button">'),
            $('<div class="editor-eol">'),
            $('<div class="editor-encoding">'),
            $('<div class="editor-mode">')
          )
        );
        var updateModeInfo = function() {
          var mode = code_mirror.getMode();
          editor.find(".editor-mode").text(mode.name);
        };
        updateModeInfo();
        
        // indent
        (function() {
          var updateIndentInfo = function(type) {
            editor.find(".editor-indent").text(type);
          };
          var Indent = require("./indent.js");
          var indent = Indent();
          indent.changed.add(function(type) {
            if (type == "TAB") {
              code_mirror.setOption("indentWithTabs", true);
              code_mirror.setOption("indentUnit", 4);
            }
            else {
              code_mirror.setOption("indentWithTabs", false);
              code_mirror.setOption("indentUnit", Number(type.replace("SP", "")));
            }
            updateIndentInfo(type);
          });
          indent.set(Indent.detectIndentType(reply.content))
          editor.find(".editor-indent").click(function() {
            indent.rotate();
          });
        })();
        
        // line seprator
        var eol = self.detectEol(reply.content);
        var eol_names = {
          "\r": "CR",
          "\n": "LF",
          "\r\n": "CRLF"
        };
        editor.find(".editor-eol").text(eol_names[eol]);
        // encoding
        editor.find(".editor-encoding").text(encoding);
        
        editor.data("path", path);
        editor.data("code_mirror", code_mirror);
        // save
        var save = function() {
          var generation = code_mirror.changeGeneration(true);
          $.ajax({
            url: "/write.php",
            method: "post",
            timeout: 2000,
            data: {
              path: path,
              encoding: encoding,
              content: code_mirror.getValue().replace(/\n/g, eol)
            },
            dataType: "json"
          }).done(function(reply) {
            if (reply == "ok") {
              code_mirror.last_save = generation;
              self.status_changed.dispatch(path, "clean");
              editor.find(".editor-message").text("Saved.");
            }
            else {
              editor.find(".editor-message").text("Save failed. " + reply.error);
              self.status_changed.dispatch(path, "error");
            }
          }).fail(function() {
            editor.find(".editor-message").text("Save failed.");
            self.status_changed.dispatch(path, "error");
          });
        };
        // auto save
        var autoSave = _.debounce(function() {
          if (!code_mirror.isClean(code_mirror.last_save)) {
            save();
          }
        }, 4000);
        // save with command-s
        Mousetrap(editor[0]).bind("mod+s", function() {
          save();
          return false;
        });
        
        resolve();
      })();
    }).fail(function() {
      reject();
    });
  });
};
EditorManager.prototype.get = function(path) {
  return $("#editors .editor").filter(function() {
    return $(this).data("path") == path;
  });
};
EditorManager.prototype.activate = function(path) {
  $("#editors .editor.active").removeClass("active");
  var found = this.get(path);
  if (found.length) {
    found.addClass("active");
    found.data("code_mirror").focus();
    found.data("code_mirror").refresh();
  }
};
EditorManager.prototype.getActive = function() {
  return $("#editors .editor.active").data("path");
};
EditorManager.prototype.close = function(path) {
  this.get(path).remove();
};
EditorManager.prototype.detectEol = function(content) {
  if (content.match("\r\n")) {
    return "\r\n";
  }
  if (content.match("\r")) {
    return "\r";
  }
  return "\n";
};

module.exports = new EditorManager();

},{"./codemirror":2,"./indent.js":15,"jquery":"jquery","signals":"signals","underscore":"underscore"}],9:[function(require,module,exports){
var $ = require("jquery")

var getFileElement = function(path) {
  return $("#files .file-item").filter(function(idx, item) {
    return $(item).data("path") == path
  })
}

var FileManagerView = function(model) {
  var view = {
    addItem: function(path) {
      var dir = path.replace(new RegExp("[^/]+$"), "")
      var name = path.replace(new RegExp(".*/"), "")
      $("<div>").data("path", path).addClass("file-item").append(
        $("<div>").addClass("dir").text(dir),
        $("<div>").addClass("name").text(name),
        $('<div class="status clean">')
      ).appendTo("#files")
    },
    
    removeItem: function(path) {
      getFileElement(path).remove()
    },
    
    activateItem: function(path) {
      $("#files .file-item.active").removeClass("active")
      if (path === null) {
        return
      }
      getFileElement(path).addClass("active")
    },
    
    updateStatus: function(path, status) {
      getFileElement(path)
        .find(".status")
        .removeClass("clean error modified")
        .addClass(status)
    },
  }
  
  model.opened.add(view.addItem)
  model.closed.add(view.removeItem)
  model.activated.add(view.activateItem)
  model.status_changed.add(view.updateStatus)
  
  $("#files").on("click", ".file-item", function(e) {
    e.preventDefault()
    model.activate($(e.currentTarget).data("path"))
  })
}

module.exports = FileManagerView

},{"jquery":"jquery"}],10:[function(require,module,exports){
var signals = require("signals")
var _ = require("underscore")
var FileManagerView = require("./file-view.js")
var editor_manager = require("./editor.js")

var FileManager = function(finder) {
  var model = {
    opened: new signals.Signal(),
    closed: new signals.Signal(),
    activated: new signals.Signal(),
    status_changed: new signals.Signal(),
    
    active: null, // path of active file
    files: [],
    
    getFiles: function() {
      return _.pluck(model.files, "path")
    },
    
    open: function(path) {
      if (path === null) {
        throw "The path is null"
      }
      // try to activate already opened files
      if (model.activate(path)) {
        return
      }
      editor_manager.open(path).then(function() {
        model.files.push({
          path: path,
          status: "clean",
        })
        model.opened.dispatch(path)
        model.activate(path)
      })
    },
    
    getActive: function() {
      return model.active
    },
    
    activate: function(path) {
      if (path === model.active) {
        return true
      }
      if (path !== null && model.indexOf(path) == -1) {
        return false
      }
      finder.setPath(path)
      editor_manager.activate(path)
      model.active = path
      model.activated.dispatch(path)
      return true
    },
    
    nextFile: function() {
      model.rotateFile(true)
    },
    
    prevFile: function() {
      model.rotateFile(false)
    },
    
    rotateFile: function(next) {
      if (model.files.length == 0) {
        return
      }
      var idx
      if (model.active === null) {
        idx = next ? 0 : model.files.length - 1
      }
      else {
        idx = model.indexOf(model.active)
        idx += next ? +1 : -1
        idx = (idx + model.files.length) % model.files.length
      }
      model.activate(model.files[idx].path)
    },
    
    close: function(path) {
      var idx = model.indexOf(path)
      if (idx == -1) {
        return
      }
      if (path === model.active) {
        if (model.files.length == 1) {
          model.activate(null)
        }
        else {
          model.prevFile()
        }
      }
      editor_manager.close(path)
      model.files.splice(idx, 1)
      model.closed.dispatch(path)
    },
    
    reload: function(path) {
      model.close(path)
      model.open(path)
    },
    
    indexOf: function(path) {
      return model.getFiles().indexOf(path)
    },
    
    updateStatus: function(path, status) {
      model.indexOf(path).status = status
      model.status_changed.dispatch(path, status)
    },
  }
  
  finder.selected.add(model.open)
  editor_manager.status_changed.add(model.updateStatus)
  
  var view = FileManagerView(model)
  
  return model
}

module.exports = FileManager

},{"./editor.js":8,"./file-view.js":9,"signals":"signals","underscore":"underscore"}],11:[function(require,module,exports){
var $ = require("jquery")

var FinderSuggestView = function(model) {
  var list = $("#finder-items")
  
  var view = {
    updateItems: function(items) {
      list.removeClass("active").empty()
      if (items.length == 0) {
        return
      }
      if (items.length == 1 && items[0] == model.getCursor()) {
        return
      }
      var name_rx = new RegExp("/([^/]*/?)$")
      list.append(items.map(function(item) {
        var name = name_rx.exec(item)[1]
        return $("<a>").text(name).data("path", item)
      }))
      list.scrollTop(0).addClass("active")
    },
    
    updateCursor: function(path) {
      list.find("a.selected").removeClass("selected")
      if (path === null) {
        return
      }
      var a = list.find("a").filter(function() {
        return $(this).data("path") == path
      })
      if (a.length == 0) {
        return
      }
      a.addClass("selected")

      // scroll the list to make the selected item visible
      var scrollIntoView = function(target) {
        var height = target.height()
        var top = target.prevAll().length * height
        var bottom = top + height
        var view_height = list.innerHeight()
        if (top - list.scrollTop() < 0) {
          list.scrollTop(top)
        }
        if (bottom - list.scrollTop() > view_height) {
          list.scrollTop(bottom - view_height)
        }
      }
      scrollIntoView(a)
    }
  }
  
  model.items_changed.add(view.updateItems)
  model.cursor_moved.add(view.updateCursor)
  
  // when item was selected
  list.on("click", "a", function(e) {
    e.preventDefault()
    model.select($(e.target).data("path"))
  })
  
  // prevent from loosing focus
  list.on("mousedown", "a", function(e) {
    e.preventDefault()
  })
  
  return view
}

module.exports = FinderSuggestView

},{"jquery":"jquery"}],12:[function(require,module,exports){
var _ = require("underscore")
var $ = require("jquery")
var Signal = require("signals").Signal
var FinderSuggestView = require("./finder-suggest-view.js")

var FinderSuggest = function(finder) {
  var model = {
    items: [],
    cursor: null, // highlighted item
    
    items_changed: new Signal(),
    cursor_moved: new Signal(),
    selected: new Signal(),
    
    update: function(path) {
      $.ajax({
        method: "post",
        url: "/finder.php",
        timeout: 3000,
        data: {
          path: path,
        },
        dataType: "json",
      }).fail(function() {
        console.log("failed to fetch suggest for the path: " + path)
      }).done(function(reply) {
        model.setItems(reply.items.map(function(i) {
          return reply.base + i
        }))
      })
    },
    
    setItems: function(items) {
      model.setCursor(null)
      model.items = items
      model.items_changed.dispatch(model.items)
    },
    
    getItems: function() {
      return model.items
    },
    
    getCursor: function() {
      return model.cursor
    },
    
    setCursor: function(path) {
      if (path === model.cursor) {
        return
      }
      model.cursor = path
      model.cursor_moved.dispatch(model.cursor)
    },
    
    moveCursor: function(next) {
      if (model.cursor === null) {
        if (model.items.length != 0) {
          model.setCursor(model.items[0])
        }
        return
      }
      var idx = model.items.indexOf(model.cursor)
      idx += next ? +1 : -1
      idx = Math.max(0, Math.min(model.items.length - 1, idx))
      model.setCursor(model.items[idx])
    },
    
    select: function(path) {
      model.setCursor(path)
      model.selected.dispatch(path)
    },
  }
  
  finder.visibility_changed.add(function(visible) {
    if (visible) {
      model.update(finder.getPath())
    }
  })
  
  finder.path_changed.add(_.debounce(model.update, 250))
  
  var view = FinderSuggestView(model)
  
  return model
}

module.exports = FinderSuggest

},{"./finder-suggest-view.js":11,"jquery":"jquery","signals":"signals","underscore":"underscore"}],13:[function(require,module,exports){
var $ = require("jquery")
var Mousetrap = require("mousetrap")
var False = require("./return-false.js")
var InputWatcher = require("./input-watcher.js")

var FinderView = function(model, suggest) {
  var path_input = $("#finder-path").val("/")
  
  var path_watcher = InputWatcher(path_input, 50)
  path_watcher.changed.add(model.setPath)
  
  var view = {
    show: function() {
      $("#finder").addClass("active")
      path_input.focus()
      path_watcher.start()
    },
    
    hide: function() {
      $("#finder").removeClass("active")
      path_watcher.stop()
    },
  }
  
  // hide on blur
  path_input.blur(model.hide())
  
  model.visibility_changed.add(function(visible) {
    if (visible) {
      view.show()
    }
    else {
      view.hide()
    }
  })
  
  model.path_changed.add(function(path) {
    path_input.val(path)
  })
  
  Mousetrap(path_input[0]).bind("enter", False(model.enter))
  Mousetrap(path_input[0]).bind("tab", False(model.tab))
  Mousetrap(path_input[0]).bind("esc", False(model.hide))
  Mousetrap(path_input[0]).bind("down", False(function() {
    suggest.moveCursor(true)
  }))
  Mousetrap(path_input[0]).bind("up", False(function() {
    suggest.moveCursor(false)
  }))
  Mousetrap(path_input[0]).bind("mod+u", False(
    model.goToParentDirectory
  ))
  
  return view
}

module.exports = FinderView

},{"./input-watcher.js":16,"./return-false.js":17,"jquery":"jquery","mousetrap":"mousetrap"}],14:[function(require,module,exports){
var Signal = require("signals").Signal
var editor_manager = require("./editor.js")
var FinderView = require("./finder-view.js")
var FinderSuggest = require("./finder-suggest.js")

var Finder = function() {
  var model = {
    selected: new Signal(),
    path_changed: new Signal(),
    visibility_changed: new Signal(),
    
    path: "",
    visible: false,
    
    select: function(path) {
      model.setPath(path)
      if (path.substr(-1) == "/") {
        return
      }
      model.hide()
      model.selected.dispatch(path)
    },
    
    show: function() {
      model.visible = true
      model.visibility_changed.dispatch(model.visible)
    },
    
    hide: function() {
      model.visible = false
      model.visibility_changed.dispatch(model.visible)
      editor_manager.activate(editor_manager.getActive())
    },
    
    getPath: function() {
      return model.path
    },
    
    setPath: function(path) {
      model.path = path
      model.path_changed.dispatch(path)
    },
    
    goToParentDirectory: function() {
      model.setPath(
        model.path.replace(new RegExp("[^/]*/?$"), "")
      )
    },
    
    enter: function() {
      var path = suggest.getCursor()
      model.select(path ? path : model.path)
    },
    
    tab: function() {
      var cursor = suggest.getCursor()
      if (cursor) {
        model.setPath(cursor)
        return
      }
      var items = suggest.getItems()
      if (items.length == 1) {
        model.setPath(items[0])
        return
      }
      suggest.update(model.path)
    },
  }
  
  var suggest = FinderSuggest(model)
  suggest.selected.add(function(path) {
    model.select(path)
  })
  
  var view = FinderView(model, suggest)
  
  return model
}

module.exports = Finder

},{"./editor.js":8,"./finder-suggest.js":12,"./finder-view.js":13,"signals":"signals"}],15:[function(require,module,exports){
"use strict"

var Rotate = require("./rotate.js")

var Indent = function(type) {
  return Rotate(["4SP", "2SP", "TAB"], type)
}

Indent.detectIndentType = function(content) {
  if (content.match(/[\r\n]+\t/)) {
    return "TAB"
  }
  var lines = content.split(/[\r\n]+/)
  for (var i = 0; i < lines.length; ++i) {
    var indent = lines[i].replace(/^( *).*/, "$1")
    if (indent.length == 2) {
      return "2SP"
    }
  }
  return "4SP"
}

module.exports = Indent

},{"./rotate.js":18}],16:[function(require,module,exports){
var $ = require("jquery")
var Signal = require("signals").Signal

var InputWatcher = function(input, interval) {
  input = $(input)
  
  var model = {
    changed: new Signal(),
    
    input: input,
    interval: interval,
    last_value: input.val(),
    timer: null,
    
    start: function() {
      model.stop()
      model.timer = setInterval(model.check, model.interval)
    },
    
    stop: function() {
      clearInterval(model.timer)
      model.timer = null
    },
    
    check: function() {
      var current = model.input.val()
      if (current == model.last_value) {
        return
      }
      model.changed.dispatch(current, model.last_value)
      model.last_value = current
    },
    
    keyDown: function() {
      if (model.timer) {
        model.check()
      }
    },
  }
  
  input.keydown(model.keyDown)
  
  return model
}

module.exports = InputWatcher

},{"jquery":"jquery","signals":"signals"}],17:[function(require,module,exports){
var returnFalse = function(func) {
  return function() {
    func.apply(this, arguments)
    return false
  }
}

module.exports = returnFalse

},{}],18:[function(require,module,exports){
"use strict"

var signals = require("signals")

var Rotate = function(values, value) {
  var isValidValue = function(v) {
    return v === null || values.indexOf(v) != -1
  }
  
  var checkValue = function(v) {
    if (!isValidValue(v)) {
      throw "invalid value: " + v
    }
  }
  if (value === undefined) {
    value = null
  }
  checkValue(value)
  
  var rotate = {
    changed: new signals.Signal(),
    
    getValues: function() {
      return values
    },
    
    get: function() {
      return value
    },
    
    set: function(new_value) {
      if (new_value == value) {
        return
      }
      checkValue(new_value)
      value = new_value
      rotate.changed.dispatch(value)
    },
    
    rotate: function() {
      if (value === null) {
        return
      }
      var idx = values.indexOf(value)
      idx = (idx + 1) % values.length
      rotate.set(values[idx])
    }
  }
  return rotate
}

module.exports = Rotate

},{"signals":"signals"}],"app":[function(require,module,exports){
module.exports.run = function() {
  var Mousetrap = require("mousetrap")
  var finder = require("./finder.js")()
  var file_manager = require("./file.js")(finder)
  
  var saveFileList = function() {
    var files = file_manager.getFiles()
    localStorage.setItem("open-files", JSON.stringify(files))
  }
  var loadFileList = function() {
    return JSON.parse(localStorage.getItem("open-files") || "[]")
  }
  loadFileList().forEach(function(path) {
    file_manager.open(path)
  })
  
  file_manager.opened.add(saveFileList)
  file_manager.closed.add(saveFileList)
  
  // shortcut keys
  Mousetrap.bind(["mod+", "mod+="], function() {
    file_manager.nextFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+shift+", "mod+shift+="], function() {
    file_manager.prevFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+w", "mod+k"], function() {
    file_manager.close(file_manager.getActive())
    return false
  }, "keydown")
  Mousetrap.bind(["mod+r"], function() {
    file_manager.reload()
    return false
  }, "keydown")
  // show finder
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    finder.show()
    return false
  }, "keydown")
}

},{"./file.js":10,"./finder.js":14,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZWRpdG9yLmpzIiwianMvZmlsZS12aWV3LmpzIiwianMvZmlsZS5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LXZpZXcuanMiLCJqcy9maW5kZXItc3VnZ2VzdC5qcyIsImpzL2ZpbmRlci12aWV3LmpzIiwianMvZmluZGVyLmpzIiwianMvaW5kZW50LmpzIiwianMvaW5wdXQtd2F0Y2hlci5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxudmFyIGluZGVudEFmdGVyUGFzdGUgPSBmdW5jdGlvbihjbSwgY2hhbmdlKSB7XG4gIGlmIChjaGFuZ2Uub3JpZ2luICE9IFwicGFzdGVcIikge1xuICAgIHJldHVyblxuICB9XG4gIGlmIChDb2RlTWlycm9yLmNtcFBvcyhjaGFuZ2UuZnJvbSwgY2hhbmdlLnRvKSkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIGNoZWNrIGlmIHRoZSBpbnNlcnRpb24gcG9pbnQgaXMgYXQgdGhlIGVuZCBvZiB0aGUgbGluZVxuICB2YXIgZGVzdCA9IGNtLmdldExpbmUoY2hhbmdlLmZyb20ubGluZSlcbiAgaWYgKGRlc3QubGVuZ3RoICE9IGNoYW5nZS5mcm9tLmNoKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gY2hlY2sgaWYgdGhlIGxpbmUgY29uc2lzdHMgb2Ygb25seSB3aGl0ZSBzcGFjZXNcbiAgaWYgKGRlc3QubWF0Y2goL1teIFxcdF0vKSkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIHJlbW92ZSB0aGUgbGFzdCBlbXB0eSBsaW5lXG4gIGlmIChjaGFuZ2UudGV4dFtjaGFuZ2UudGV4dC5sZW5ndGggLSAxXSA9PSBcIlwiKSB7XG4gICAgY2hhbmdlLnRleHQucG9wKClcbiAgfVxuICB2YXIgYmFzZV9pbmRlbnQgPSBjaGFuZ2UudGV4dFswXS5tYXRjaCgvXlsgXFx0XSovKVswXVxuICBjaGFuZ2UudGV4dCA9IGNoYW5nZS50ZXh0Lm1hcChmdW5jdGlvbihsaW5lLCBpKSB7XG4gICAgbGluZSA9IGxpbmUubWF0Y2goL14oWyBcXHRdKikoLiopLylcbiAgICB2YXIgaW5kZW50ID0gbGluZVsxXVxuICAgIHZhciB0ZXh0ID0gbGluZVsyXVxuICAgIGluZGVudCA9IChkZXN0ICsgaW5kZW50KS5zdWJzdHIoMCwgZGVzdC5sZW5ndGggKyBpbmRlbnQubGVuZ3RoIC0gYmFzZV9pbmRlbnQubGVuZ3RoKVxuICAgIHJldHVybiBpbmRlbnQgKyB0ZXh0XG4gIH0pXG4gIGNoYW5nZS50ZXh0WzBdID0gY2hhbmdlLnRleHRbMF0uc3Vic3RyKGRlc3QubGVuZ3RoKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluZGVudEFmdGVyUGFzdGVcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnJlcXVpcmUoXCJjb2RlbWlycm9yLWFkZG9uXCIpXG5yZXF1aXJlKFwiLi9tYXJrXCIpXG5yZXF1aXJlKFwiLi9zZWxlY3QtbGluZVwiKVxucmVxdWlyZShcIi4vc2VsZWN0LXdvcmRcIilcbnJlcXVpcmUoXCIuL3NwbGl0LWludG8tbGluZXNcIilcbnJlcXVpcmUoXCIuL3RleHQtbW9kZVwiKVxuXG5PYmplY3QuYXNzaWduKENvZGVNaXJyb3IuZGVmYXVsdHMsIHtcbiAgbGluZU51bWJlcnM6IHRydWUsXG4gIHRhYlNpemU6IDQsXG4gIHNob3dDdXJzb3JXaGVuU2VsZWN0aW5nOiB0cnVlLFxuICBhdXRvQ2xvc2VCcmFja2V0czogdHJ1ZSxcbiAgbWF0Y2hCcmFja2V0czogdHJ1ZSxcbiAgbWF0Y2hUYWdzOiB0cnVlLFxuICBhdXRvQ2xvc2VUYWdzOiB0cnVlLFxuICBzdHlsZUFjdGl2ZUxpbmU6IHtub25FbXB0eTogdHJ1ZX0sXG4gIHN0eWxlU2VsZWN0ZWRUZXh0OiB0cnVlLFxuICBkcmFnRHJvcDogZmFsc2UsXG4gIGV4dHJhS2V5czoge1xuICAgIFwiQ3RybC1TcGFjZVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgIFwiQ3RybC1VXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgXCJDdHJsLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgXCJDbWQtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICBcIlRhYlwiOiBcImluZGVudEF1dG9cIixcbiAgICBcIkN0cmwtRFwiOiBmYWxzZSxcbiAgICBcIkNtZC1EXCI6IGZhbHNlLFxuICB9LFxufSlcblxuQ29kZU1pcnJvci5kZWZpbmVJbml0SG9vayhmdW5jdGlvbihjbSkge1xuICAvLyBtYWludGFpbiBpbmRlbnRhdGlvbiBvbiBwYXN0ZVxuICBjbS5vbihcImJlZm9yZUNoYW5nZVwiLCByZXF1aXJlKFwiLi9pbmRlbnQtYWZ0ZXItcGFzdGVcIikpXG4gIFxuICAvLyBrZXkgYmluZGluZ3NcbiAgdmFyIGlucHV0ID0gY20uZ2V0SW5wdXRGaWVsZCgpXG4gIGlucHV0LmNsYXNzTmFtZSArPSBcIiBtb3VzZXRyYXBcIiAvLyBlbmFibGUgaG90a2V5XG4gIHZhciBrZXltYXAgPSB7XG4gICAgXCJhbHQrYlwiOiBcImdvV29yZExlZnRcIixcbiAgICBcImFsdCtmXCI6IFwiZ29Xb3JkUmlnaHRcIixcbiAgICBcImFsdCtoXCI6IFwiZGVsV29yZEJlZm9yZVwiLFxuICAgIFwiYWx0K2RcIjogXCJkZWxXb3JkQWZ0ZXJcIixcbiAgICBcIm1vZCttXCI6IFwibWFya1wiLFxuICAgIFwibW9kK2RcIjogXCJzZWxlY3RXb3JkXCIsXG4gICAgXCJtb2QrbFwiOiBcInNlbGVjdExpbmVcIixcbiAgICBcIm1vZCtzaGlmdCtsXCI6IFwic3BsaXRJbnRvTGluZXNcIixcbiAgfVxuICBfLmVhY2goa2V5bWFwLCBmdW5jdGlvbihjb21tYW5kLCBrZXkpIHtcbiAgICBNb3VzZXRyYXAoaW5wdXQpLmJpbmQoa2V5LCBmdW5jdGlvbigpIHtcbiAgICAgIGNtLmV4ZWNDb21tYW5kKGNvbW1hbmQpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9KVxuICB9KVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDb2RlTWlycm9yXG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuZGVmaW5lSW5pdEhvb2soZnVuY3Rpb24oY20pIHtcbiAgY20ubWFya3MgPSBbXVxufSlcblxuQ29kZU1pcnJvci5jb21tYW5kcy5tYXJrID0gZnVuY3Rpb24oY20pIHtcbiAgdmFyIGN1cnNvciA9IGNtLmdldEN1cnNvcigpXG4gIGlmIChtYXJrcy5sZW5ndGgpIHtcbiAgICB2YXIgbGFzdCA9IGNtLm1hcmtzW2NtLm1hcmtzLmxlbmd0aCAtIDFdXG4gICAgaWYgKGxhc3QubGluZSA9PSBjdXJzb3IubGluZSAmJiBsYXN0LmNoID09IGN1cnNvci5jaCkge1xuICAgICAgY20uc2V0U2VsZWN0aW9ucyhjbS5tYXJrcy5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgICByZXR1cm4ge2hlYWQ6IG0sIGFuY2hvcjogbX1cbiAgICAgIH0pLCBjbS5tYXJrcy5sZW5ndGggLSAxKVxuICAgICAgY20ubWFya3MgPSBbXVxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG4gIGNtLm1hcmtzLnB1c2goY3Vyc29yKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNlbGVjdExpbmUgPSBmdW5jdGlvbihjbSkge1xuICBjbS5zZXRTZWxlY3Rpb25zKFxuICAgIGNtLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgIGxpbmU6IGkuaGVhZC5saW5lICsgMSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfSxcbiAgICAgICAgaGVhZDoge1xuICAgICAgICAgIGxpbmU6IGkuYW5jaG9yLmxpbmUsXG4gICAgICAgICAgY2g6IDAsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICApXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0V29yZCA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGNtLmZpbmRXb3JkQXQoaS5hbmNob3IpXG4gICAgfSlcbiAgKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNwbGl0SW50b0xpbmVzID0gZnVuY3Rpb24oY20pIHtcbiAgdmFyIHNlbGVjdGlvbnMgPSBjbS5saXN0U2VsZWN0aW9ucygpXG4gIGlmIChzZWxlY3Rpb25zLmxlbmd0aCAhPSAxKSB7XG4gICAgLy8gRG8gbm90aGluZ1xuICAgIHJldHVyblxuICB9XG4gIHZhciBhbmNob3IgPSBzZWxlY3Rpb25zWzBdLmFuY2hvclxuICB2YXIgaGVhZCA9IHNlbGVjdGlvbnNbMF0uaGVhZFxuICB2YXIgbmV3X3NlbGVjdGlvbnMgPSBbXVxuICBmb3IgKHZhciBpID0gYW5jaG9yLmxpbmU7IGkgPD0gaGVhZC5saW5lOyArK2kpIHtcbiAgICBuZXdfc2VsZWN0aW9ucy5wdXNoKHtcbiAgICAgIGFuY2hvcjoge1xuICAgICAgICBsaW5lOiBpLFxuICAgICAgICBjaDogaSA9PSBhbmNob3IubGluZSA/IGFuY2hvci5jaCA6IDAsXG4gICAgICB9LFxuICAgICAgaGVhZDoge1xuICAgICAgICBsaW5lOiBpLFxuICAgICAgICBjaDogaSA9PSBoZWFkLmxpbmUgPyBoZWFkLmNoIDogSW5maW5pdHksXG4gICAgICB9LFxuICAgIH0pXG4gIH1cbiAgY20uc2V0U2VsZWN0aW9ucyhuZXdfc2VsZWN0aW9ucylcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9LFxufSlcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCIuL2NvZGVtaXJyb3JcIik7XG5cbi8vIEVkaXRvck1hbmFnZXJcbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc3RhdHVzX2NoYW5nZWQgPSBuZXcgU2lnbmFsKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgZGF0YToge1xuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSl7XG4gICAgICBpZiAocmVwbHkuZXJyb3IpIHtcbiAgICAgICAgYWxlcnQocmVwbHkuZXJyb3IpO1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGVuY29kaW5nID0gcmVwbHkuZW5jb2Rpbmc7XG4gICAgICB2YXIgZWRpdG9yID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZWRpdG9yXCIpLmFwcGVuZFRvKFwiI2VkaXRvcnNcIik7XG4gICAgICB2YXIgbW9kZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIik7XG4gICAgICAgIHZhciBtb2RlID0ge1xuICAgICAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICAgICAgdGFnOiBcInBocFwiLFxuICAgICAgICB9W2V4dGVuc2lvbl07XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlLm1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwidGV4dFwiO1xuICAgICAgfSkoKTtcbiAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvZGVfbWlycm9yID0gQ29kZU1pcnJvcihlZGl0b3JbMF0sIHtcbiAgICAgICAgICB2YWx1ZTogcmVwbHkuY29udGVudCxcbiAgICAgICAgICBtb2RlOiBtb2RlLFxuICAgICAgICB9KTtcbiAgICAgICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKTtcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJjaGFuZ2VzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1dG9TYXZlKCk7XG4gICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBjb2RlX21pcnJvci5pc0NsZWFuKGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSkgPyBcImNsZWFuXCI6IFwibW9kaWZpZWRcIlxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gY29kZV9taXJyb3IuY2hhbmdlR2VuZXJhdGlvbih0cnVlKTtcbiAgICAgICAgLy8gc3RhdHVzIGJhclxuICAgICAgICBlZGl0b3IuYXBwZW5kKFxuICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZm9vdFwiPicpLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbWVzc2FnZVwiPicpLFxuICAgICAgICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1pbmRlbnQgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW9sXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVuY29kaW5nXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1vZGVcIj4nKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgICAgdmFyIHVwZGF0ZU1vZGVJbmZvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG1vZGUgPSBjb2RlX21pcnJvci5nZXRNb2RlKCk7XG4gICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlLm5hbWUpO1xuICAgICAgICB9O1xuICAgICAgICB1cGRhdGVNb2RlSW5mbygpO1xuICAgICAgICBcbiAgICAgICAgLy8gaW5kZW50XG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgdXBkYXRlSW5kZW50SW5mbyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikudGV4dCh0eXBlKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHZhciBJbmRlbnQgPSByZXF1aXJlKFwiLi9pbmRlbnQuanNcIik7XG4gICAgICAgICAgdmFyIGluZGVudCA9IEluZGVudCgpO1xuICAgICAgICAgIGluZGVudC5jaGFuZ2VkLmFkZChmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICBpZiAodHlwZSA9PSBcIlRBQlwiKSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIHRydWUpO1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRVbml0XCIsIDQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCBOdW1iZXIodHlwZS5yZXBsYWNlKFwiU1BcIiwgXCJcIikpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVwZGF0ZUluZGVudEluZm8odHlwZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaW5kZW50LnNldChJbmRlbnQuZGV0ZWN0SW5kZW50VHlwZShyZXBseS5jb250ZW50KSlcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaW5kZW50LnJvdGF0ZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gbGluZSBzZXByYXRvclxuICAgICAgICB2YXIgZW9sID0gc2VsZi5kZXRlY3RFb2wocmVwbHkuY29udGVudCk7XG4gICAgICAgIHZhciBlb2xfbmFtZXMgPSB7XG4gICAgICAgICAgXCJcXHJcIjogXCJDUlwiLFxuICAgICAgICAgIFwiXFxuXCI6IFwiTEZcIixcbiAgICAgICAgICBcIlxcclxcblwiOiBcIkNSTEZcIlxuICAgICAgICB9O1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQoZW9sX25hbWVzW2VvbF0pO1xuICAgICAgICAvLyBlbmNvZGluZ1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZyk7XG4gICAgICAgIFxuICAgICAgICBlZGl0b3IuZGF0YShcInBhdGhcIiwgcGF0aCk7XG4gICAgICAgIGVkaXRvci5kYXRhKFwiY29kZV9taXJyb3JcIiwgY29kZV9taXJyb3IpO1xuICAgICAgICAvLyBzYXZlXG4gICAgICAgIHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGdlbmVyYXRpb24gPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IFwiL3dyaXRlLnBocFwiLFxuICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgIGVuY29kaW5nOiBlbmNvZGluZyxcbiAgICAgICAgICAgICAgY29udGVudDogY29kZV9taXJyb3IuZ2V0VmFsdWUoKS5yZXBsYWNlKC9cXG4vZywgZW9sKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICAgIGlmIChyZXBseSA9PSBcIm9rXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gZ2VuZXJhdGlvbjtcbiAgICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImNsZWFuXCIpO1xuICAgICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZWQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlIGZhaWxlZC4gXCIgKyByZXBseS5lcnJvcik7XG4gICAgICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgXCJlcnJvclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLlwiKTtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgXCJlcnJvclwiKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gYXV0byBzYXZlXG4gICAgICAgIHZhciBhdXRvU2F2ZSA9IF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCFjb2RlX21pcnJvci5pc0NsZWFuKGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSkpIHtcbiAgICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDQwMDApO1xuICAgICAgICAvLyBzYXZlIHdpdGggY29tbWFuZC1zXG4gICAgICAgIE1vdXNldHJhcChlZGl0b3JbMF0pLmJpbmQoXCJtb2Qrc1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzYXZlKCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pKCk7XG4gICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgIHJlamVjdCgpO1xuICAgIH0pO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAkKFwiI2VkaXRvcnMgLmVkaXRvclwiKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICQodGhpcykuZGF0YShcInBhdGhcIikgPT0gcGF0aDtcbiAgfSk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuYWN0aXZhdGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKTtcbiAgdmFyIGZvdW5kID0gdGhpcy5nZXQocGF0aCk7XG4gIGlmIChmb3VuZC5sZW5ndGgpIHtcbiAgICBmb3VuZC5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcbiAgICBmb3VuZC5kYXRhKFwiY29kZV9taXJyb3JcIikuZm9jdXMoKTtcbiAgICBmb3VuZC5kYXRhKFwiY29kZV9taXJyb3JcIikucmVmcmVzaCgpO1xuICB9XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZ2V0QWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAkKFwiI2VkaXRvcnMgLmVkaXRvci5hY3RpdmVcIikuZGF0YShcInBhdGhcIik7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMuZ2V0KHBhdGgpLnJlbW92ZSgpO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmRldGVjdEVvbCA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgaWYgKGNvbnRlbnQubWF0Y2goXCJcXHJcXG5cIikpIHtcbiAgICByZXR1cm4gXCJcXHJcXG5cIjtcbiAgfVxuICBpZiAoY29udGVudC5tYXRjaChcIlxcclwiKSkge1xuICAgIHJldHVybiBcIlxcclwiO1xuICB9XG4gIHJldHVybiBcIlxcblwiO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgRWRpdG9yTWFuYWdlcigpO1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG5cbnZhciBnZXRGaWxlRWxlbWVudCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuICQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKS5maWx0ZXIoZnVuY3Rpb24oaWR4LCBpdGVtKSB7XG4gICAgcmV0dXJuICQoaXRlbSkuZGF0YShcInBhdGhcIikgPT0gcGF0aFxuICB9KVxufVxuXG52YXIgRmlsZU1hbmFnZXJWaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgdmFyIHZpZXcgPSB7XG4gICAgYWRkSXRlbTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgdmFyIGRpciA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSskXCIpLCBcIlwiKVxuICAgICAgdmFyIG5hbWUgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIi4qL1wiKSwgXCJcIilcbiAgICAgICQoXCI8ZGl2PlwiKS5kYXRhKFwicGF0aFwiLCBwYXRoKS5hZGRDbGFzcyhcImZpbGUtaXRlbVwiKS5hcHBlbmQoXG4gICAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpclwiKS50ZXh0KGRpciksXG4gICAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcIm5hbWVcIikudGV4dChuYW1lKSxcbiAgICAgICAgJCgnPGRpdiBjbGFzcz1cInN0YXR1cyBjbGVhblwiPicpXG4gICAgICApLmFwcGVuZFRvKFwiI2ZpbGVzXCIpXG4gICAgfSxcbiAgICBcbiAgICByZW1vdmVJdGVtOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBnZXRGaWxlRWxlbWVudChwYXRoKS5yZW1vdmUoKVxuICAgIH0sXG4gICAgXG4gICAgYWN0aXZhdGVJdGVtOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkKFwiI2ZpbGVzIC5maWxlLWl0ZW0uYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGdldEZpbGVFbGVtZW50KHBhdGgpLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVTdGF0dXM6IGZ1bmN0aW9uKHBhdGgsIHN0YXR1cykge1xuICAgICAgZ2V0RmlsZUVsZW1lbnQocGF0aClcbiAgICAgICAgLmZpbmQoXCIuc3RhdHVzXCIpXG4gICAgICAgIC5yZW1vdmVDbGFzcyhcImNsZWFuIGVycm9yIG1vZGlmaWVkXCIpXG4gICAgICAgIC5hZGRDbGFzcyhzdGF0dXMpXG4gICAgfSxcbiAgfVxuICBcbiAgbW9kZWwub3BlbmVkLmFkZCh2aWV3LmFkZEl0ZW0pXG4gIG1vZGVsLmNsb3NlZC5hZGQodmlldy5yZW1vdmVJdGVtKVxuICBtb2RlbC5hY3RpdmF0ZWQuYWRkKHZpZXcuYWN0aXZhdGVJdGVtKVxuICBtb2RlbC5zdGF0dXNfY2hhbmdlZC5hZGQodmlldy51cGRhdGVTdGF0dXMpXG4gIFxuICAkKFwiI2ZpbGVzXCIpLm9uKFwiY2xpY2tcIiwgXCIuZmlsZS1pdGVtXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5hY3RpdmF0ZSgkKGUuY3VycmVudFRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZU1hbmFnZXJWaWV3XG4iLCJ2YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRmlsZU1hbmFnZXJWaWV3ID0gcmVxdWlyZShcIi4vZmlsZS12aWV3LmpzXCIpXG52YXIgZWRpdG9yX21hbmFnZXIgPSByZXF1aXJlKFwiLi9lZGl0b3IuanNcIilcblxudmFyIEZpbGVNYW5hZ2VyID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBvcGVuZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGNsb3NlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgYWN0aXZhdGVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBzdGF0dXNfY2hhbmdlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgXG4gICAgYWN0aXZlOiBudWxsLCAvLyBwYXRoIG9mIGFjdGl2ZSBmaWxlXG4gICAgZmlsZXM6IFtdLFxuICAgIFxuICAgIGdldEZpbGVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfLnBsdWNrKG1vZGVsLmZpbGVzLCBcInBhdGhcIilcbiAgICB9LFxuICAgIFxuICAgIG9wZW46IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IFwiVGhlIHBhdGggaXMgbnVsbFwiXG4gICAgICB9XG4gICAgICAvLyB0cnkgdG8gYWN0aXZhdGUgYWxyZWFkeSBvcGVuZWQgZmlsZXNcbiAgICAgIGlmIChtb2RlbC5hY3RpdmF0ZShwYXRoKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGVkaXRvcl9tYW5hZ2VyLm9wZW4ocGF0aCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kZWwuZmlsZXMucHVzaCh7XG4gICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICBzdGF0dXM6IFwiY2xlYW5cIixcbiAgICAgICAgfSlcbiAgICAgICAgbW9kZWwub3BlbmVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICAgIG1vZGVsLmFjdGl2YXRlKHBhdGgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgZ2V0QWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5hY3RpdmVcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgICBpZiAocGF0aCAhPT0gbnVsbCAmJiBtb2RlbC5pbmRleE9mKHBhdGgpID09IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgZmluZGVyLnNldFBhdGgocGF0aClcbiAgICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKHBhdGgpXG4gICAgICBtb2RlbC5hY3RpdmUgPSBwYXRoXG4gICAgICBtb2RlbC5hY3RpdmF0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSxcbiAgICBcbiAgICBuZXh0RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKHRydWUpXG4gICAgfSxcbiAgICBcbiAgICBwcmV2RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKGZhbHNlKVxuICAgIH0sXG4gICAgXG4gICAgcm90YXRlRmlsZTogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmZpbGVzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeFxuICAgICAgaWYgKG1vZGVsLmFjdGl2ZSA9PT0gbnVsbCkge1xuICAgICAgICBpZHggPSBuZXh0ID8gMCA6IG1vZGVsLmZpbGVzLmxlbmd0aCAtIDFcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZHggPSBtb2RlbC5pbmRleE9mKG1vZGVsLmFjdGl2ZSlcbiAgICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICAgIGlkeCA9IChpZHggKyBtb2RlbC5maWxlcy5sZW5ndGgpICUgbW9kZWwuZmlsZXMubGVuZ3RoXG4gICAgICB9XG4gICAgICBtb2RlbC5hY3RpdmF0ZShtb2RlbC5maWxlc1tpZHhdLnBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBjbG9zZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgdmFyIGlkeCA9IG1vZGVsLmluZGV4T2YocGF0aClcbiAgICAgIGlmIChpZHggPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIGlmIChtb2RlbC5maWxlcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgIG1vZGVsLmFjdGl2YXRlKG51bGwpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbW9kZWwucHJldkZpbGUoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlZGl0b3JfbWFuYWdlci5jbG9zZShwYXRoKVxuICAgICAgbW9kZWwuZmlsZXMuc3BsaWNlKGlkeCwgMSlcbiAgICAgIG1vZGVsLmNsb3NlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgcmVsb2FkOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5jbG9zZShwYXRoKVxuICAgICAgbW9kZWwub3BlbihwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgaW5kZXhPZjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmdldEZpbGVzKCkuaW5kZXhPZihwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlU3RhdHVzOiBmdW5jdGlvbihwYXRoLCBzdGF0dXMpIHtcbiAgICAgIG1vZGVsLmluZGV4T2YocGF0aCkuc3RhdHVzID0gc3RhdHVzXG4gICAgICBtb2RlbC5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBzdGF0dXMpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnNlbGVjdGVkLmFkZChtb2RlbC5vcGVuKVxuICBlZGl0b3JfbWFuYWdlci5zdGF0dXNfY2hhbmdlZC5hZGQobW9kZWwudXBkYXRlU3RhdHVzKVxuICBcbiAgdmFyIHZpZXcgPSBGaWxlTWFuYWdlclZpZXcobW9kZWwpXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlTWFuYWdlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG5cbnZhciBGaW5kZXJTdWdnZXN0VmlldyA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gIHZhciBsaXN0ID0gJChcIiNmaW5kZXItaXRlbXNcIilcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHVwZGF0ZUl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgbGlzdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKS5lbXB0eSgpXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09IDEgJiYgaXRlbXNbMF0gPT0gbW9kZWwuZ2V0Q3Vyc29yKCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgbmFtZV9yeCA9IG5ldyBSZWdFeHAoXCIvKFteL10qLz8pJFwiKVxuICAgICAgbGlzdC5hcHBlbmQoaXRlbXMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgdmFyIG5hbWUgPSBuYW1lX3J4LmV4ZWMoaXRlbSlbMV1cbiAgICAgICAgcmV0dXJuICQoXCI8YT5cIikudGV4dChuYW1lKS5kYXRhKFwicGF0aFwiLCBpdGVtKVxuICAgICAgfSkpXG4gICAgICBsaXN0LnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBsaXN0LmZpbmQoXCJhLnNlbGVjdGVkXCIpLnJlbW92ZUNsYXNzKFwic2VsZWN0ZWRcIilcbiAgICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGEgPSBsaXN0LmZpbmQoXCJhXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICQodGhpcykuZGF0YShcInBhdGhcIikgPT0gcGF0aFxuICAgICAgfSlcbiAgICAgIGlmIChhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgYS5hZGRDbGFzcyhcInNlbGVjdGVkXCIpXG5cbiAgICAgIC8vIHNjcm9sbCB0aGUgbGlzdCB0byBtYWtlIHRoZSBzZWxlY3RlZCBpdGVtIHZpc2libGVcbiAgICAgIHZhciBzY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGFyZ2V0LmhlaWdodCgpXG4gICAgICAgIHZhciB0b3AgPSB0YXJnZXQucHJldkFsbCgpLmxlbmd0aCAqIGhlaWdodFxuICAgICAgICB2YXIgYm90dG9tID0gdG9wICsgaGVpZ2h0XG4gICAgICAgIHZhciB2aWV3X2hlaWdodCA9IGxpc3QuaW5uZXJIZWlnaHQoKVxuICAgICAgICBpZiAodG9wIC0gbGlzdC5zY3JvbGxUb3AoKSA8IDApIHtcbiAgICAgICAgICBsaXN0LnNjcm9sbFRvcCh0b3ApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvdHRvbSAtIGxpc3Quc2Nyb2xsVG9wKCkgPiB2aWV3X2hlaWdodCkge1xuICAgICAgICAgIGxpc3Quc2Nyb2xsVG9wKGJvdHRvbSAtIHZpZXdfaGVpZ2h0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzY3JvbGxJbnRvVmlldyhhKVxuICAgIH1cbiAgfVxuICBcbiAgbW9kZWwuaXRlbXNfY2hhbmdlZC5hZGQodmlldy51cGRhdGVJdGVtcylcbiAgbW9kZWwuY3Vyc29yX21vdmVkLmFkZCh2aWV3LnVwZGF0ZUN1cnNvcilcbiAgXG4gIC8vIHdoZW4gaXRlbSB3YXMgc2VsZWN0ZWRcbiAgbGlzdC5vbihcImNsaWNrXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgbW9kZWwuc2VsZWN0KCQoZS50YXJnZXQpLmRhdGEoXCJwYXRoXCIpKVxuICB9KVxuICBcbiAgLy8gcHJldmVudCBmcm9tIGxvb3NpbmcgZm9jdXNcbiAgbGlzdC5vbihcIm1vdXNlZG93blwiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICB9KVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0Vmlld1xuIiwidmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgRmluZGVyU3VnZ2VzdFZpZXcgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdC12aWV3LmpzXCIpXG5cbnZhciBGaW5kZXJTdWdnZXN0ID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBpdGVtczogW10sXG4gICAgY3Vyc29yOiBudWxsLCAvLyBoaWdobGlnaHRlZCBpdGVtXG4gICAgXG4gICAgaXRlbXNfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIGN1cnNvcl9tb3ZlZDogbmV3IFNpZ25hbCgpLFxuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICB1cmw6IFwiL2ZpbmRlci5waHBcIixcbiAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZmFpbGVkIHRvIGZldGNoIHN1Z2dlc3QgZm9yIHRoZSBwYXRoOiBcIiArIHBhdGgpXG4gICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgIG1vZGVsLnNldEl0ZW1zKHJlcGx5Lml0ZW1zLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlcGx5LmJhc2UgKyBpXG4gICAgICAgIH0pKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHNldEl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG51bGwpXG4gICAgICBtb2RlbC5pdGVtcyA9IGl0ZW1zXG4gICAgICBtb2RlbC5pdGVtc19jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLml0ZW1zKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLml0ZW1zXG4gICAgfSxcbiAgICBcbiAgICBnZXRDdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmN1cnNvclxuICAgIH0sXG4gICAgXG4gICAgc2V0Q3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuY3Vyc29yKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuY3Vyc29yID0gcGF0aFxuICAgICAgbW9kZWwuY3Vyc29yX21vdmVkLmRpc3BhdGNoKG1vZGVsLmN1cnNvcilcbiAgICB9LFxuICAgIFxuICAgIG1vdmVDdXJzb3I6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5jdXJzb3IgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKG1vZGVsLml0ZW1zLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zWzBdKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IG1vZGVsLml0ZW1zLmluZGV4T2YobW9kZWwuY3Vyc29yKVxuICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICBpZHggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb2RlbC5pdGVtcy5sZW5ndGggLSAxLCBpZHgpKVxuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zW2lkeF0pXG4gICAgfSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihwYXRoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIG1vZGVsLnVwZGF0ZShmaW5kZXIuZ2V0UGF0aCgpKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKF8uZGVib3VuY2UobW9kZWwudXBkYXRlLCAyNTApKVxuICBcbiAgdmFyIHZpZXcgPSBGaW5kZXJTdWdnZXN0Vmlldyhtb2RlbClcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbnZhciBGYWxzZSA9IHJlcXVpcmUoXCIuL3JldHVybi1mYWxzZS5qc1wiKVxudmFyIElucHV0V2F0Y2hlciA9IHJlcXVpcmUoXCIuL2lucHV0LXdhdGNoZXIuanNcIilcblxudmFyIEZpbmRlclZpZXcgPSBmdW5jdGlvbihtb2RlbCwgc3VnZ2VzdCkge1xuICB2YXIgcGF0aF9pbnB1dCA9ICQoXCIjZmluZGVyLXBhdGhcIikudmFsKFwiL1wiKVxuICBcbiAgdmFyIHBhdGhfd2F0Y2hlciA9IElucHV0V2F0Y2hlcihwYXRoX2lucHV0LCA1MClcbiAgcGF0aF93YXRjaGVyLmNoYW5nZWQuYWRkKG1vZGVsLnNldFBhdGgpXG4gIFxuICB2YXIgdmlldyA9IHtcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX2lucHV0LmZvY3VzKClcbiAgICAgIHBhdGhfd2F0Y2hlci5zdGFydCgpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RvcCgpXG4gICAgfSxcbiAgfVxuICBcbiAgLy8gaGlkZSBvbiBibHVyXG4gIHBhdGhfaW5wdXQuYmx1cihtb2RlbC5oaWRlKCkpXG4gIFxuICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgdmlldy5zaG93KClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2aWV3LmhpZGUoKVxuICAgIH1cbiAgfSlcbiAgXG4gIG1vZGVsLnBhdGhfY2hhbmdlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIHBhdGhfaW5wdXQudmFsKHBhdGgpXG4gIH0pXG4gIFxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImVudGVyXCIsIEZhbHNlKG1vZGVsLmVudGVyKSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ0YWJcIiwgRmFsc2UobW9kZWwudGFiKSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJlc2NcIiwgRmFsc2UobW9kZWwuaGlkZSkpXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZG93blwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBzdWdnZXN0Lm1vdmVDdXJzb3IodHJ1ZSlcbiAgfSkpXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwidXBcIiwgRmFsc2UoZnVuY3Rpb24oKSB7XG4gICAgc3VnZ2VzdC5tb3ZlQ3Vyc29yKGZhbHNlKVxuICB9KSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJtb2QrdVwiLCBGYWxzZShcbiAgICBtb2RlbC5nb1RvUGFyZW50RGlyZWN0b3J5XG4gICkpXG4gIFxuICByZXR1cm4gdmlld1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclZpZXdcbiIsInZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBlZGl0b3JfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci5qc1wiKVxudmFyIEZpbmRlclZpZXcgPSByZXF1aXJlKFwiLi9maW5kZXItdmlldy5qc1wiKVxudmFyIEZpbmRlclN1Z2dlc3QgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdC5qc1wiKVxuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIHBhdGhfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIHZpc2liaWxpdHlfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHBhdGg6IFwiXCIsXG4gICAgdmlzaWJsZTogZmFsc2UsXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKHBhdGgpXG4gICAgICBpZiAocGF0aC5zdWJzdHIoLTEpID09IFwiL1wiKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuaGlkZSgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gdHJ1ZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSBmYWxzZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShlZGl0b3JfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICB9LFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLnBhdGhcbiAgICB9LFxuICAgIFxuICAgIHNldFBhdGg6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnBhdGggPSBwYXRoXG4gICAgICBtb2RlbC5wYXRoX2NoYW5nZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGdvVG9QYXJlbnREaXJlY3Rvcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChcbiAgICAgICAgbW9kZWwucGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKi8/JFwiKSwgXCJcIilcbiAgICAgIClcbiAgICB9LFxuICAgIFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXRoID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgbW9kZWwuc2VsZWN0KHBhdGggPyBwYXRoIDogbW9kZWwucGF0aClcbiAgICB9LFxuICAgIFxuICAgIHRhYjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGN1cnNvcilcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaXRlbXMgPSBzdWdnZXN0LmdldEl0ZW1zKClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSkge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGl0ZW1zWzBdKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHN1Z2dlc3QudXBkYXRlKG1vZGVsLnBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgdmFyIHN1Z2dlc3QgPSBGaW5kZXJTdWdnZXN0KG1vZGVsKVxuICBzdWdnZXN0LnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwuc2VsZWN0KHBhdGgpXG4gIH0pXG4gIFxuICB2YXIgdmlldyA9IEZpbmRlclZpZXcobW9kZWwsIHN1Z2dlc3QpXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGUuanNcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCI0U1BcIiwgXCIyU1BcIiwgXCJUQUJcIl0sIHR5cGUpXG59XG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBJbnB1dFdhdGNoZXIgPSBmdW5jdGlvbihpbnB1dCwgaW50ZXJ2YWwpIHtcbiAgaW5wdXQgPSAkKGlucHV0KVxuICBcbiAgdmFyIG1vZGVsID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBpbnB1dDogaW5wdXQsXG4gICAgaW50ZXJ2YWw6IGludGVydmFsLFxuICAgIGxhc3RfdmFsdWU6IGlucHV0LnZhbCgpLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIFxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnN0b3AoKVxuICAgICAgbW9kZWwudGltZXIgPSBzZXRJbnRlcnZhbChtb2RlbC5jaGVjaywgbW9kZWwuaW50ZXJ2YWwpXG4gICAgfSxcbiAgICBcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwobW9kZWwudGltZXIpXG4gICAgICBtb2RlbC50aW1lciA9IG51bGxcbiAgICB9LFxuICAgIFxuICAgIGNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbW9kZWwuaW5wdXQudmFsKClcbiAgICAgIGlmIChjdXJyZW50ID09IG1vZGVsLmxhc3RfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jaGFuZ2VkLmRpc3BhdGNoKGN1cnJlbnQsIG1vZGVsLmxhc3RfdmFsdWUpXG4gICAgICBtb2RlbC5sYXN0X3ZhbHVlID0gY3VycmVudFxuICAgIH0sXG4gICAgXG4gICAga2V5RG93bjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAobW9kZWwudGltZXIpIHtcbiAgICAgICAgbW9kZWwuY2hlY2soKVxuICAgICAgfVxuICAgIH0sXG4gIH1cbiAgXG4gIGlucHV0LmtleWRvd24obW9kZWwua2V5RG93bilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0V2F0Y2hlclxuIiwidmFyIHJldHVybkZhbHNlID0gZnVuY3Rpb24oZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZXR1cm5GYWxzZVxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxuXG52YXIgUm90YXRlID0gZnVuY3Rpb24odmFsdWVzLCB2YWx1ZSkge1xuICB2YXIgaXNWYWxpZFZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB2ID09PSBudWxsIHx8IHZhbHVlcy5pbmRleE9mKHYpICE9IC0xXG4gIH1cbiAgXG4gIHZhciBjaGVja1ZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIGlmICghaXNWYWxpZFZhbHVlKHYpKSB7XG4gICAgICB0aHJvdyBcImludmFsaWQgdmFsdWU6IFwiICsgdlxuICAgIH1cbiAgfVxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhbHVlID0gbnVsbFxuICB9XG4gIGNoZWNrVmFsdWUodmFsdWUpXG4gIFxuICB2YXIgcm90YXRlID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGdldFZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVzXG4gICAgfSxcbiAgICBcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfSxcbiAgICBcbiAgICBzZXQ6IGZ1bmN0aW9uKG5ld192YWx1ZSkge1xuICAgICAgaWYgKG5ld192YWx1ZSA9PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGNoZWNrVmFsdWUobmV3X3ZhbHVlKVxuICAgICAgdmFsdWUgPSBuZXdfdmFsdWVcbiAgICAgIHJvdGF0ZS5jaGFuZ2VkLmRpc3BhdGNoKHZhbHVlKVxuICAgIH0sXG4gICAgXG4gICAgcm90YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHggPSB2YWx1ZXMuaW5kZXhPZih2YWx1ZSlcbiAgICAgIGlkeCA9IChpZHggKyAxKSAlIHZhbHVlcy5sZW5ndGhcbiAgICAgIHJvdGF0ZS5zZXQodmFsdWVzW2lkeF0pXG4gICAgfVxuICB9XG4gIHJldHVybiByb3RhdGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSb3RhdGVcbiIsIm1vZHVsZS5leHBvcnRzLnJ1biA9IGZ1bmN0aW9uKCkge1xuICB2YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxuICB2YXIgZmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyLmpzXCIpKClcbiAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIikoZmluZGVyKVxuICBcbiAgdmFyIHNhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaWxlcyA9IGZpbGVfbWFuYWdlci5nZXRGaWxlcygpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJvcGVuLWZpbGVzXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzKSlcbiAgfVxuICB2YXIgbG9hZEZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJvcGVuLWZpbGVzXCIpIHx8IFwiW11cIilcbiAgfVxuICBsb2FkRmlsZUxpc3QoKS5mb3JFYWNoKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBmaWxlX21hbmFnZXIub3BlbihwYXRoKVxuICB9KVxuICBcbiAgZmlsZV9tYW5hZ2VyLm9wZW5lZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBmaWxlX21hbmFnZXIuY2xvc2VkLmFkZChzYXZlRmlsZUxpc3QpXG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLm5leHRGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtzaGlmdCtcIiwgXCJtb2Qrc2hpZnQrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5jbG9zZShmaWxlX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrclwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnJlbG9hZCgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICAvLyBzaG93IGZpbmRlclxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrb1wiLCBcIm1vZCtwXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc2hvdygpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxufVxuIl19
