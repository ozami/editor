require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  var input = cm.getInputField()
  input.className += " mousetrap" // enable hotkey
  // key bindings
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

},{"./mark":2,"./select-line":3,"./select-word":4,"./split-into-lines":5,"./text-mode":6,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","underscore":"underscore"}],2:[function(require,module,exports){
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

},{"codemirror":"codemirror"}],3:[function(require,module,exports){
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

},{"codemirror":"codemirror"}],4:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.commands.selectWord = function(cm) {
  cm.setSelections(
    cm.listSelections().map(function(i) {
      return cm.findWordAt(i.anchor)
    })
  )
}

},{"codemirror":"codemirror"}],5:[function(require,module,exports){
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

},{"codemirror":"codemirror"}],6:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.defineSimpleMode("text", {
  start: [],
  comment: [],
  meta: {},
})

},{"codemirror":"codemirror"}],7:[function(require,module,exports){
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
        // maintain indentation on paste
        code_mirror.on("beforeChange", function(cm, change) {
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
          change.text = change.text.map(function(line, i) {
            line = line.match(/^([ \t]*)(.*)/);
            var indent = line[1];
            var text = line[2];
            indent = (dest + indent).substr(0, dest.length + indent.length - base_indent.length);
            return indent + text;
          });
          change.text[0] = change.text[0].substr(dest.length);
        });
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

},{"./codemirror":1,"./indent.js":14,"jquery":"jquery","signals":"signals","underscore":"underscore"}],8:[function(require,module,exports){
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

},{"jquery":"jquery"}],9:[function(require,module,exports){
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

},{"./editor.js":7,"./file-view.js":8,"signals":"signals","underscore":"underscore"}],10:[function(require,module,exports){
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

},{"jquery":"jquery"}],11:[function(require,module,exports){
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

},{"./finder-suggest-view.js":10,"jquery":"jquery","signals":"signals","underscore":"underscore"}],12:[function(require,module,exports){
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

},{"./input-watcher.js":15,"./return-false.js":16,"jquery":"jquery","mousetrap":"mousetrap"}],13:[function(require,module,exports){
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

},{"./editor.js":7,"./finder-suggest.js":11,"./finder-view.js":12,"signals":"signals"}],14:[function(require,module,exports){
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

},{"./rotate.js":17}],15:[function(require,module,exports){
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

},{"jquery":"jquery","signals":"signals"}],16:[function(require,module,exports){
var returnFalse = function(func) {
  return function() {
    func.apply(this, arguments)
    return false
  }
}

module.exports = returnFalse

},{}],17:[function(require,module,exports){
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

},{"./file.js":9,"./finder.js":13,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGV4LmpzIiwianMvY29kZW1pcnJvci9tYXJrLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3QtbGluZS5qcyIsImpzL2NvZGVtaXJyb3Ivc2VsZWN0LXdvcmQuanMiLCJqcy9jb2RlbWlycm9yL3NwbGl0LWludG8tbGluZXMuanMiLCJqcy9jb2RlbWlycm9yL3RleHQtbW9kZS5qcyIsImpzL2VkaXRvci5qcyIsImpzL2ZpbGUtdmlldy5qcyIsImpzL2ZpbGUuanMiLCJqcy9maW5kZXItc3VnZ2VzdC12aWV3LmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXItdmlldy5qcyIsImpzL2ZpbmRlci5qcyIsImpzL2luZGVudC5qcyIsImpzL2lucHV0LXdhdGNoZXIuanMiLCJqcy9yZXR1cm4tZmFsc2UuanMiLCJqcy9yb3RhdGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnJlcXVpcmUoXCJjb2RlbWlycm9yLWFkZG9uXCIpXG5yZXF1aXJlKFwiLi9tYXJrXCIpXG5yZXF1aXJlKFwiLi9zZWxlY3QtbGluZVwiKVxucmVxdWlyZShcIi4vc2VsZWN0LXdvcmRcIilcbnJlcXVpcmUoXCIuL3NwbGl0LWludG8tbGluZXNcIilcbnJlcXVpcmUoXCIuL3RleHQtbW9kZVwiKVxuXG5PYmplY3QuYXNzaWduKENvZGVNaXJyb3IuZGVmYXVsdHMsIHtcbiAgbGluZU51bWJlcnM6IHRydWUsXG4gIHRhYlNpemU6IDQsXG4gIHNob3dDdXJzb3JXaGVuU2VsZWN0aW5nOiB0cnVlLFxuICBhdXRvQ2xvc2VCcmFja2V0czogdHJ1ZSxcbiAgbWF0Y2hCcmFja2V0czogdHJ1ZSxcbiAgbWF0Y2hUYWdzOiB0cnVlLFxuICBhdXRvQ2xvc2VUYWdzOiB0cnVlLFxuICBzdHlsZUFjdGl2ZUxpbmU6IHtub25FbXB0eTogdHJ1ZX0sXG4gIHN0eWxlU2VsZWN0ZWRUZXh0OiB0cnVlLFxuICBkcmFnRHJvcDogZmFsc2UsXG4gIGV4dHJhS2V5czoge1xuICAgIFwiQ3RybC1TcGFjZVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgIFwiQ3RybC1VXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgXCJDdHJsLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgXCJDbWQtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICBcIlRhYlwiOiBcImluZGVudEF1dG9cIixcbiAgICBcIkN0cmwtRFwiOiBmYWxzZSxcbiAgICBcIkNtZC1EXCI6IGZhbHNlLFxuICB9LFxufSlcblxuQ29kZU1pcnJvci5kZWZpbmVJbml0SG9vayhmdW5jdGlvbihjbSkge1xuICB2YXIgaW5wdXQgPSBjbS5nZXRJbnB1dEZpZWxkKClcbiAgaW5wdXQuY2xhc3NOYW1lICs9IFwiIG1vdXNldHJhcFwiIC8vIGVuYWJsZSBob3RrZXlcbiAgLy8ga2V5IGJpbmRpbmdzXG4gIHZhciBrZXltYXAgPSB7XG4gICAgXCJhbHQrYlwiOiBcImdvV29yZExlZnRcIixcbiAgICBcImFsdCtmXCI6IFwiZ29Xb3JkUmlnaHRcIixcbiAgICBcImFsdCtoXCI6IFwiZGVsV29yZEJlZm9yZVwiLFxuICAgIFwiYWx0K2RcIjogXCJkZWxXb3JkQWZ0ZXJcIixcbiAgICBcIm1vZCttXCI6IFwibWFya1wiLFxuICAgIFwibW9kK2RcIjogXCJzZWxlY3RXb3JkXCIsXG4gICAgXCJtb2QrbFwiOiBcInNlbGVjdExpbmVcIixcbiAgICBcIm1vZCtzaGlmdCtsXCI6IFwic3BsaXRJbnRvTGluZXNcIixcbiAgfVxuICBfLmVhY2goa2V5bWFwLCBmdW5jdGlvbihjb21tYW5kLCBrZXkpIHtcbiAgICBNb3VzZXRyYXAoaW5wdXQpLmJpbmQoa2V5LCBmdW5jdGlvbigpIHtcbiAgICAgIGNtLmV4ZWNDb21tYW5kKGNvbW1hbmQpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9KVxuICB9KVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDb2RlTWlycm9yXG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuZGVmaW5lSW5pdEhvb2soZnVuY3Rpb24oY20pIHtcbiAgY20ubWFya3MgPSBbXVxufSlcblxuQ29kZU1pcnJvci5jb21tYW5kcy5tYXJrID0gZnVuY3Rpb24oY20pIHtcbiAgdmFyIGN1cnNvciA9IGNtLmdldEN1cnNvcigpXG4gIGlmIChtYXJrcy5sZW5ndGgpIHtcbiAgICB2YXIgbGFzdCA9IGNtLm1hcmtzW2NtLm1hcmtzLmxlbmd0aCAtIDFdXG4gICAgaWYgKGxhc3QubGluZSA9PSBjdXJzb3IubGluZSAmJiBsYXN0LmNoID09IGN1cnNvci5jaCkge1xuICAgICAgY20uc2V0U2VsZWN0aW9ucyhjbS5tYXJrcy5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgICByZXR1cm4ge2hlYWQ6IG0sIGFuY2hvcjogbX1cbiAgICAgIH0pLCBjbS5tYXJrcy5sZW5ndGggLSAxKVxuICAgICAgY20ubWFya3MgPSBbXVxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG4gIGNtLm1hcmtzLnB1c2goY3Vyc29yKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNlbGVjdExpbmUgPSBmdW5jdGlvbihjbSkge1xuICBjbS5zZXRTZWxlY3Rpb25zKFxuICAgIGNtLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgIGxpbmU6IGkuaGVhZC5saW5lICsgMSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfSxcbiAgICAgICAgaGVhZDoge1xuICAgICAgICAgIGxpbmU6IGkuYW5jaG9yLmxpbmUsXG4gICAgICAgICAgY2g6IDAsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICApXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0V29yZCA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGNtLmZpbmRXb3JkQXQoaS5hbmNob3IpXG4gICAgfSlcbiAgKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNwbGl0SW50b0xpbmVzID0gZnVuY3Rpb24oY20pIHtcbiAgdmFyIHNlbGVjdGlvbnMgPSBjbS5saXN0U2VsZWN0aW9ucygpXG4gIGlmIChzZWxlY3Rpb25zLmxlbmd0aCAhPSAxKSB7XG4gICAgLy8gRG8gbm90aGluZ1xuICAgIHJldHVyblxuICB9XG4gIHZhciBhbmNob3IgPSBzZWxlY3Rpb25zWzBdLmFuY2hvclxuICB2YXIgaGVhZCA9IHNlbGVjdGlvbnNbMF0uaGVhZFxuICB2YXIgbmV3X3NlbGVjdGlvbnMgPSBbXVxuICBmb3IgKHZhciBpID0gYW5jaG9yLmxpbmU7IGkgPD0gaGVhZC5saW5lOyArK2kpIHtcbiAgICBuZXdfc2VsZWN0aW9ucy5wdXNoKHtcbiAgICAgIGFuY2hvcjoge1xuICAgICAgICBsaW5lOiBpLFxuICAgICAgICBjaDogaSA9PSBhbmNob3IubGluZSA/IGFuY2hvci5jaCA6IDAsXG4gICAgICB9LFxuICAgICAgaGVhZDoge1xuICAgICAgICBsaW5lOiBpLFxuICAgICAgICBjaDogaSA9PSBoZWFkLmxpbmUgPyBoZWFkLmNoIDogSW5maW5pdHksXG4gICAgICB9LFxuICAgIH0pXG4gIH1cbiAgY20uc2V0U2VsZWN0aW9ucyhuZXdfc2VsZWN0aW9ucylcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9LFxufSlcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCIuL2NvZGVtaXJyb3JcIik7XG5cbi8vIEVkaXRvck1hbmFnZXJcbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc3RhdHVzX2NoYW5nZWQgPSBuZXcgU2lnbmFsKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgZGF0YToge1xuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSl7XG4gICAgICBpZiAocmVwbHkuZXJyb3IpIHtcbiAgICAgICAgYWxlcnQocmVwbHkuZXJyb3IpO1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGVuY29kaW5nID0gcmVwbHkuZW5jb2Rpbmc7XG4gICAgICB2YXIgZWRpdG9yID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZWRpdG9yXCIpLmFwcGVuZFRvKFwiI2VkaXRvcnNcIik7XG4gICAgICB2YXIgbW9kZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIik7XG4gICAgICAgIHZhciBtb2RlID0ge1xuICAgICAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICAgICAgdGFnOiBcInBocFwiLFxuICAgICAgICB9W2V4dGVuc2lvbl07XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlLm1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwidGV4dFwiO1xuICAgICAgfSkoKTtcbiAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvZGVfbWlycm9yID0gQ29kZU1pcnJvcihlZGl0b3JbMF0sIHtcbiAgICAgICAgICB2YWx1ZTogcmVwbHkuY29udGVudCxcbiAgICAgICAgICBtb2RlOiBtb2RlLFxuICAgICAgICB9KTtcbiAgICAgICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKTtcbiAgICAgICAgLy8gbWFpbnRhaW4gaW5kZW50YXRpb24gb24gcGFzdGVcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJiZWZvcmVDaGFuZ2VcIiwgZnVuY3Rpb24oY20sIGNoYW5nZSkge1xuICAgICAgICAgIGlmIChjaGFuZ2Uub3JpZ2luICE9IFwicGFzdGVcIikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoQ29kZU1pcnJvci5jbXBQb3MoY2hhbmdlLmZyb20sIGNoYW5nZS50bykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gICAgICAgICAgdmFyIGRlc3QgPSBjbS5nZXRMaW5lKGNoYW5nZS5mcm9tLmxpbmUpO1xuICAgICAgICAgIGlmIChkZXN0Lmxlbmd0aCAhPSBjaGFuZ2UuZnJvbS5jaCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICAgICAgICAgIGlmIChkZXN0Lm1hdGNoKC9bXiBcXHRdLykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgICAgICAgICBpZiAoY2hhbmdlLnRleHRbY2hhbmdlLnRleHQubGVuZ3RoIC0gMV0gPT0gXCJcIikge1xuICAgICAgICAgICAgY2hhbmdlLnRleHQucG9wKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdO1xuICAgICAgICAgIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLm1hdGNoKC9eKFsgXFx0XSopKC4qKS8pO1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IGxpbmVbMV07XG4gICAgICAgICAgICB2YXIgdGV4dCA9IGxpbmVbMl07XG4gICAgICAgICAgICBpbmRlbnQgPSAoZGVzdCArIGluZGVudCkuc3Vic3RyKDAsIGRlc3QubGVuZ3RoICsgaW5kZW50Lmxlbmd0aCAtIGJhc2VfaW5kZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZW50ICsgdGV4dDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjaGFuZ2UudGV4dFswXSA9IGNoYW5nZS50ZXh0WzBdLnN1YnN0cihkZXN0Lmxlbmd0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2RlX21pcnJvci5vbihcImNoYW5nZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYXV0b1NhdmUoKTtcbiAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKFxuICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSA/IFwiY2xlYW5cIjogXCJtb2RpZmllZFwiXG4gICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAvLyBzdGF0dXMgYmFyXG4gICAgICAgIGVkaXRvci5hcHBlbmQoXG4gICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAgICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1lb2xcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmdcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgICB2YXIgdXBkYXRlTW9kZUluZm8gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgbW9kZSA9IGNvZGVfbWlycm9yLmdldE1vZGUoKTtcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbW9kZVwiKS50ZXh0KG1vZGUubmFtZSk7XG4gICAgICAgIH07XG4gICAgICAgIHVwZGF0ZU1vZGVJbmZvKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBpbmRlbnRcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB1cGRhdGVJbmRlbnRJbmZvID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudC5qc1wiKTtcbiAgICAgICAgICB2YXIgaW5kZW50ID0gSW5kZW50KCk7XG4gICAgICAgICAgaW5kZW50LmNoYW5nZWQuYWRkKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlID09IFwiVEFCXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRVbml0XCIsIE51bWJlcih0eXBlLnJlcGxhY2UoXCJTUFwiLCBcIlwiKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXBkYXRlSW5kZW50SW5mbyh0eXBlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbmRlbnQuc2V0KEluZGVudC5kZXRlY3RJbmRlbnRUeXBlKHJlcGx5LmNvbnRlbnQpKVxuICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpbmRlbnQucm90YXRlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBsaW5lIHNlcHJhdG9yXG4gICAgICAgIHZhciBlb2wgPSBzZWxmLmRldGVjdEVvbChyZXBseS5jb250ZW50KTtcbiAgICAgICAgdmFyIGVvbF9uYW1lcyA9IHtcbiAgICAgICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICAgICAgXCJcXG5cIjogXCJMRlwiLFxuICAgICAgICAgIFwiXFxyXFxuXCI6IFwiQ1JMRlwiXG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lb2xcIikudGV4dChlb2xfbmFtZXNbZW9sXSk7XG4gICAgICAgIC8vIGVuY29kaW5nXG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lbmNvZGluZ1wiKS50ZXh0KGVuY29kaW5nKTtcbiAgICAgICAgXG4gICAgICAgIGVkaXRvci5kYXRhKFwicGF0aFwiLCBwYXRoKTtcbiAgICAgICAgZWRpdG9yLmRhdGEoXCJjb2RlX21pcnJvclwiLCBjb2RlX21pcnJvcik7XG4gICAgICAgIC8vIHNhdmVcbiAgICAgICAgdmFyIHNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZ2VuZXJhdGlvbiA9IGNvZGVfbWlycm9yLmNoYW5nZUdlbmVyYXRpb24odHJ1ZSk7XG4gICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogXCIvd3JpdGUucGhwXCIsXG4gICAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgZW5jb2Rpbmc6IGVuY29kaW5nLFxuICAgICAgICAgICAgICBjb250ZW50OiBjb2RlX21pcnJvci5nZXRWYWx1ZSgpLnJlcGxhY2UoL1xcbi9nLCBlb2wpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgICAgaWYgKHJlcGx5ID09IFwib2tcIikge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBnZW5lcmF0aW9uO1xuICAgICAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIFwiY2xlYW5cIik7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLiBcIiArIHJlcGx5LmVycm9yKTtcbiAgICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuXCIpO1xuICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvLyBhdXRvIHNhdmVcbiAgICAgICAgdmFyIGF1dG9TYXZlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIWNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSkge1xuICAgICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgNDAwMCk7XG4gICAgICAgIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgICAgICAgTW91c2V0cmFwKGVkaXRvclswXSkuYmluZChcIm1vZCtzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSkoKTtcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfSk7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICB2YXIgZm91bmQgPSB0aGlzLmdldChwYXRoKTtcbiAgaWYgKGZvdW5kLmxlbmd0aCkge1xuICAgIGZvdW5kLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5mb2N1cygpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5yZWZyZXNoKCk7XG4gIH1cbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5kYXRhKFwicGF0aFwiKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdGhpcy5nZXQocGF0aCkucmVtb3ZlKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZGV0ZWN0RW9sID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiO1xuICB9XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXCI7XG4gIH1cbiAgcmV0dXJuIFwiXFxuXCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBFZGl0b3JNYW5hZ2VyKCk7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcblxudmFyIGdldEZpbGVFbGVtZW50ID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gJChcIiNmaWxlcyAuZmlsZS1pdGVtXCIpLmZpbHRlcihmdW5jdGlvbihpZHgsIGl0ZW0pIHtcbiAgICByZXR1cm4gJChpdGVtKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gIH0pXG59XG5cbnZhciBGaWxlTWFuYWdlclZpZXcgPSBmdW5jdGlvbihtb2RlbCkge1xuICB2YXIgdmlldyA9IHtcbiAgICBhZGRJdGVtOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgZGlyID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKyRcIiksIFwiXCIpXG4gICAgICB2YXIgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKVxuICAgICAgJChcIjxkaXY+XCIpLmRhdGEoXCJwYXRoXCIsIHBhdGgpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZGlyXCIpLnRleHQoZGlyKSxcbiAgICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwibmFtZVwiKS50ZXh0KG5hbWUpLFxuICAgICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICAgICkuYXBwZW5kVG8oXCIjZmlsZXNcIilcbiAgICB9LFxuICAgIFxuICAgIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGdldEZpbGVFbGVtZW50KHBhdGgpLnJlbW92ZSgpXG4gICAgfSxcbiAgICBcbiAgICBhY3RpdmF0ZUl0ZW06IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZ2V0RmlsZUVsZW1lbnQocGF0aCkuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZVN0YXR1czogZnVuY3Rpb24ocGF0aCwgc3RhdHVzKSB7XG4gICAgICBnZXRGaWxlRWxlbWVudChwYXRoKVxuICAgICAgICAuZmluZChcIi5zdGF0dXNcIilcbiAgICAgICAgLnJlbW92ZUNsYXNzKFwiY2xlYW4gZXJyb3IgbW9kaWZpZWRcIilcbiAgICAgICAgLmFkZENsYXNzKHN0YXR1cylcbiAgICB9LFxuICB9XG4gIFxuICBtb2RlbC5vcGVuZWQuYWRkKHZpZXcuYWRkSXRlbSlcbiAgbW9kZWwuY2xvc2VkLmFkZCh2aWV3LnJlbW92ZUl0ZW0pXG4gIG1vZGVsLmFjdGl2YXRlZC5hZGQodmlldy5hY3RpdmF0ZUl0ZW0pXG4gIG1vZGVsLnN0YXR1c19jaGFuZ2VkLmFkZCh2aWV3LnVwZGF0ZVN0YXR1cylcbiAgXG4gICQoXCIjZmlsZXNcIikub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIG1vZGVsLmFjdGl2YXRlKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKFwicGF0aFwiKSlcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlTWFuYWdlclZpZXdcbiIsInZhciBzaWduYWxzID0gcmVxdWlyZShcInNpZ25hbHNcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciBGaWxlTWFuYWdlclZpZXcgPSByZXF1aXJlKFwiLi9maWxlLXZpZXcuanNcIilcbnZhciBlZGl0b3JfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci5qc1wiKVxuXG52YXIgRmlsZU1hbmFnZXIgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIG9wZW5lZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgY2xvc2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBhY3RpdmF0ZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIHN0YXR1c19jaGFuZ2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBcbiAgICBhY3RpdmU6IG51bGwsIC8vIHBhdGggb2YgYWN0aXZlIGZpbGVcbiAgICBmaWxlczogW10sXG4gICAgXG4gICAgZ2V0RmlsZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF8ucGx1Y2sobW9kZWwuZmlsZXMsIFwicGF0aFwiKVxuICAgIH0sXG4gICAgXG4gICAgb3BlbjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgXCJUaGUgcGF0aCBpcyBudWxsXCJcbiAgICAgIH1cbiAgICAgIC8vIHRyeSB0byBhY3RpdmF0ZSBhbHJlYWR5IG9wZW5lZCBmaWxlc1xuICAgICAgaWYgKG1vZGVsLmFjdGl2YXRlKHBhdGgpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZWRpdG9yX21hbmFnZXIub3BlbihwYXRoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RlbC5maWxlcy5wdXNoKHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIHN0YXR1czogXCJjbGVhblwiLFxuICAgICAgICB9KVxuICAgICAgICBtb2RlbC5vcGVuZWQuZGlzcGF0Y2gocGF0aClcbiAgICAgICAgbW9kZWwuYWN0aXZhdGUocGF0aClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBnZXRBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmFjdGl2ZVxuICAgIH0sXG4gICAgXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICAgIGlmIChwYXRoICE9PSBudWxsICYmIG1vZGVsLmluZGV4T2YocGF0aCkgPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICBmaW5kZXIuc2V0UGF0aChwYXRoKVxuICAgICAgZWRpdG9yX21hbmFnZXIuYWN0aXZhdGUocGF0aClcbiAgICAgIG1vZGVsLmFjdGl2ZSA9IHBhdGhcbiAgICAgIG1vZGVsLmFjdGl2YXRlZC5kaXNwYXRjaChwYXRoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFxuICAgIG5leHRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUodHJ1ZSlcbiAgICB9LFxuICAgIFxuICAgIHByZXZGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUoZmFsc2UpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGVGaWxlOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuZmlsZXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4XG4gICAgICBpZiAobW9kZWwuYWN0aXZlID09PSBudWxsKSB7XG4gICAgICAgIGlkeCA9IG5leHQgPyAwIDogbW9kZWwuZmlsZXMubGVuZ3RoIC0gMVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlkeCA9IG1vZGVsLmluZGV4T2YobW9kZWwuYWN0aXZlKVxuICAgICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgICAgaWR4ID0gKGlkeCArIG1vZGVsLmZpbGVzLmxlbmd0aCkgJSBtb2RlbC5maWxlcy5sZW5ndGhcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFjdGl2YXRlKG1vZGVsLmZpbGVzW2lkeF0ucGF0aClcbiAgICB9LFxuICAgIFxuICAgIGNsb3NlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaW5kZXhPZihwYXRoKVxuICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgaWYgKG1vZGVsLmZpbGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgbW9kZWwuYWN0aXZhdGUobnVsbClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtb2RlbC5wcmV2RmlsZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVkaXRvcl9tYW5hZ2VyLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5maWxlcy5zcGxpY2UoaWR4LCAxKVxuICAgICAgbW9kZWwuY2xvc2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICByZWxvYWQ6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5vcGVuKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBpbmRleE9mOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZ2V0RmlsZXMoKS5pbmRleE9mKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVTdGF0dXM6IGZ1bmN0aW9uKHBhdGgsIHN0YXR1cykge1xuICAgICAgbW9kZWwuaW5kZXhPZihwYXRoKS5zdGF0dXMgPSBzdGF0dXNcbiAgICAgIG1vZGVsLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIHN0YXR1cylcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIuc2VsZWN0ZWQuYWRkKG1vZGVsLm9wZW4pXG4gIGVkaXRvcl9tYW5hZ2VyLnN0YXR1c19jaGFuZ2VkLmFkZChtb2RlbC51cGRhdGVTdGF0dXMpXG4gIFxuICB2YXIgdmlldyA9IEZpbGVNYW5hZ2VyVmlldyhtb2RlbClcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVNYW5hZ2VyXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcblxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgdmFyIGxpc3QgPSAkKFwiI2ZpbmRlci1pdGVtc1wiKVxuICBcbiAgdmFyIHZpZXcgPSB7XG4gICAgdXBkYXRlSXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBsaXN0LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpLmVtcHR5KClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSAmJiBpdGVtc1swXSA9PSBtb2RlbC5nZXRDdXJzb3IoKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBuYW1lX3J4ID0gbmV3IFJlZ0V4cChcIi8oW14vXSovPykkXCIpXG4gICAgICBsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVfcnguZXhlYyhpdGVtKVsxXVxuICAgICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgICB9KSlcbiAgICAgIGxpc3Quc2Nyb2xsVG9wKDApLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGxpc3QuZmluZChcImEuc2VsZWN0ZWRcIikucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKVxuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgYSA9IGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gICAgICB9KVxuICAgICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcblxuICAgICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KClcbiAgICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgICAgdmFyIHZpZXdfaGVpZ2h0ID0gbGlzdC5pbm5lckhlaWdodCgpXG4gICAgICAgIGlmICh0b3AgLSBsaXN0LnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgICAgIGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm90dG9tIC0gbGlzdC5zY3JvbGxUb3AoKSA+IHZpZXdfaGVpZ2h0KSB7XG4gICAgICAgICAgbGlzdC5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNjcm9sbEludG9WaWV3KGEpXG4gICAgfVxuICB9XG4gIFxuICBtb2RlbC5pdGVtc19jaGFuZ2VkLmFkZCh2aWV3LnVwZGF0ZUl0ZW1zKVxuICBtb2RlbC5jdXJzb3JfbW92ZWQuYWRkKHZpZXcudXBkYXRlQ3Vyc29yKVxuICBcbiAgLy8gd2hlbiBpdGVtIHdhcyBzZWxlY3RlZFxuICBsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIFxuICAvLyBwcmV2ZW50IGZyb20gbG9vc2luZyBmb2N1c1xuICBsaXN0Lm9uKFwibW91c2Vkb3duXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIH0pXG4gIFxuICByZXR1cm4gdmlld1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RWaWV3XG4iLCJ2YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBGaW5kZXJTdWdnZXN0VmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LXZpZXcuanNcIilcblxudmFyIEZpbmRlclN1Z2dlc3QgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIGl0ZW1zOiBbXSxcbiAgICBjdXJzb3I6IG51bGwsIC8vIGhpZ2hsaWdodGVkIGl0ZW1cbiAgICBcbiAgICBpdGVtc19jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgY3Vyc29yX21vdmVkOiBuZXcgU2lnbmFsKCksXG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgIHVybDogXCIvZmluZGVyLnBocFwiLFxuICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJmYWlsZWQgdG8gZmV0Y2ggc3VnZ2VzdCBmb3IgdGhlIHBhdGg6IFwiICsgcGF0aClcbiAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgbW9kZWwuc2V0SXRlbXMocmVwbHkuaXRlbXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICByZXR1cm4gcmVwbHkuYmFzZSArIGlcbiAgICAgICAgfSkpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2V0SXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IobnVsbClcbiAgICAgIG1vZGVsLml0ZW1zID0gaXRlbXNcbiAgICAgIG1vZGVsLml0ZW1zX2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwuaXRlbXMpXG4gICAgfSxcbiAgICBcbiAgICBnZXRJdGVtczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuaXRlbXNcbiAgICB9LFxuICAgIFxuICAgIGdldEN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuY3Vyc29yXG4gICAgfSxcbiAgICBcbiAgICBzZXRDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5jdXJzb3IpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jdXJzb3IgPSBwYXRoXG4gICAgICBtb2RlbC5jdXJzb3JfbW92ZWQuZGlzcGF0Y2gobW9kZWwuY3Vyc29yKVxuICAgIH0sXG4gICAgXG4gICAgbW92ZUN1cnNvcjogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmN1cnNvciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAobW9kZWwuaXRlbXMubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbMF0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaXRlbXMuaW5kZXhPZihtb2RlbC5jdXJzb3IpXG4gICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgIGlkeCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vZGVsLml0ZW1zLmxlbmd0aCAtIDEsIGlkeCkpXG4gICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbaWR4XSlcbiAgICB9LFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKHBhdGgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgbW9kZWwudXBkYXRlKGZpbmRlci5nZXRQYXRoKCkpXG4gICAgfVxuICB9KVxuICBcbiAgZmluZGVyLnBhdGhfY2hhbmdlZC5hZGQoXy5kZWJvdW5jZShtb2RlbC51cGRhdGUsIDI1MCkpXG4gIFxuICB2YXIgdmlldyA9IEZpbmRlclN1Z2dlc3RWaWV3KG1vZGVsKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIEZhbHNlID0gcmVxdWlyZShcIi4vcmV0dXJuLWZhbHNlLmpzXCIpXG52YXIgSW5wdXRXYXRjaGVyID0gcmVxdWlyZShcIi4vaW5wdXQtd2F0Y2hlci5qc1wiKVxuXG52YXIgRmluZGVyVmlldyA9IGZ1bmN0aW9uKG1vZGVsLCBzdWdnZXN0KSB7XG4gIHZhciBwYXRoX2lucHV0ID0gJChcIiNmaW5kZXItcGF0aFwiKS52YWwoXCIvXCIpXG4gIFxuICB2YXIgcGF0aF93YXRjaGVyID0gSW5wdXRXYXRjaGVyKHBhdGhfaW5wdXQsIDUwKVxuICBwYXRoX3dhdGNoZXIuY2hhbmdlZC5hZGQobW9kZWwuc2V0UGF0aClcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgJChcIiNmaW5kZXJcIikuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIHBhdGhfaW5wdXQuZm9jdXMoKVxuICAgICAgcGF0aF93YXRjaGVyLnN0YXJ0KClcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgJChcIiNmaW5kZXJcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIHBhdGhfd2F0Y2hlci5zdG9wKClcbiAgICB9LFxuICB9XG4gIFxuICAvLyBoaWRlIG9uIGJsdXJcbiAgcGF0aF9pbnB1dC5ibHVyKG1vZGVsLmhpZGUoKSlcbiAgXG4gIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICB2aWV3LnNob3coKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZpZXcuaGlkZSgpXG4gICAgfVxuICB9KVxuICBcbiAgbW9kZWwucGF0aF9jaGFuZ2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgcGF0aF9pbnB1dC52YWwocGF0aClcbiAgfSlcbiAgXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZW50ZXJcIiwgRmFsc2UobW9kZWwuZW50ZXIpKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcInRhYlwiLCBGYWxzZShtb2RlbC50YWIpKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImVzY1wiLCBGYWxzZShtb2RlbC5oaWRlKSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJkb3duXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgIHN1Z2dlc3QubW92ZUN1cnNvcih0cnVlKVxuICB9KSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ1cFwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBzdWdnZXN0Lm1vdmVDdXJzb3IoZmFsc2UpXG4gIH0pKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcIm1vZCt1XCIsIEZhbHNlKFxuICAgIG1vZGVsLmdvVG9QYXJlbnREaXJlY3RvcnlcbiAgKSlcbiAgXG4gIHJldHVybiB2aWV3XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpXG52YXIgRmluZGVyVmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci12aWV3LmpzXCIpXG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LmpzXCIpXG5cbnZhciBGaW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgcGF0aF9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgdmlzaWJpbGl0eV9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgcGF0aDogXCJcIixcbiAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgocGF0aClcbiAgICAgIGlmIChwYXRoLnN1YnN0cigtMSkgPT0gXCIvXCIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5oaWRlKClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSB0cnVlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IGZhbHNlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKGVkaXRvcl9tYW5hZ2VyLmdldEFjdGl2ZSgpKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwucGF0aFxuICAgIH0sXG4gICAgXG4gICAgc2V0UGF0aDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwucGF0aCA9IHBhdGhcbiAgICAgIG1vZGVsLnBhdGhfY2hhbmdlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgZ29Ub1BhcmVudERpcmVjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKFxuICAgICAgICBtb2RlbC5wYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKVxuICAgICAgKVxuICAgIH0sXG4gICAgXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhdGggPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBtb2RlbC5zZWxlY3QocGF0aCA/IHBhdGggOiBtb2RlbC5wYXRoKVxuICAgIH0sXG4gICAgXG4gICAgdGFiOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoY3Vyc29yKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpdGVtcyA9IHN1Z2dlc3QuZ2V0SXRlbXMoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoaXRlbXNbMF0pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgc3VnZ2VzdC51cGRhdGUobW9kZWwucGF0aClcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgc3VnZ2VzdCA9IEZpbmRlclN1Z2dlc3QobW9kZWwpXG4gIHN1Z2dlc3Quc2VsZWN0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBtb2RlbC5zZWxlY3QocGF0aClcbiAgfSlcbiAgXG4gIHZhciB2aWV3ID0gRmluZGVyVmlldyhtb2RlbCwgc3VnZ2VzdClcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIFJvdGF0ZSA9IHJlcXVpcmUoXCIuL3JvdGF0ZS5qc1wiKVxuXG52YXIgSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICByZXR1cm4gUm90YXRlKFtcIjRTUFwiLCBcIjJTUFwiLCBcIlRBQlwiXSwgdHlwZSlcbn1cblxuSW5kZW50LmRldGVjdEluZGVudFR5cGUgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKC9bXFxyXFxuXStcXHQvKSkge1xuICAgIHJldHVybiBcIlRBQlwiXG4gIH1cbiAgdmFyIGxpbmVzID0gY29udGVudC5zcGxpdCgvW1xcclxcbl0rLylcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpbmRlbnQgPSBsaW5lc1tpXS5yZXBsYWNlKC9eKCAqKS4qLywgXCIkMVwiKVxuICAgIGlmIChpbmRlbnQubGVuZ3RoID09IDIpIHtcbiAgICAgIHJldHVybiBcIjJTUFwiXG4gICAgfVxuICB9XG4gIHJldHVybiBcIjRTUFwiXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kZW50XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcblxudmFyIElucHV0V2F0Y2hlciA9IGZ1bmN0aW9uKGlucHV0LCBpbnRlcnZhbCkge1xuICBpbnB1dCA9ICQoaW5wdXQpXG4gIFxuICB2YXIgbW9kZWwgPSB7XG4gICAgY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIGlucHV0OiBpbnB1dCxcbiAgICBpbnRlcnZhbDogaW50ZXJ2YWwsXG4gICAgbGFzdF92YWx1ZTogaW5wdXQudmFsKCksXG4gICAgdGltZXI6IG51bGwsXG4gICAgXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc3RvcCgpXG4gICAgICBtb2RlbC50aW1lciA9IHNldEludGVydmFsKG1vZGVsLmNoZWNrLCBtb2RlbC5pbnRlcnZhbClcbiAgICB9LFxuICAgIFxuICAgIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgICAgY2xlYXJJbnRlcnZhbChtb2RlbC50aW1lcilcbiAgICAgIG1vZGVsLnRpbWVyID0gbnVsbFxuICAgIH0sXG4gICAgXG4gICAgY2hlY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnJlbnQgPSBtb2RlbC5pbnB1dC52YWwoKVxuICAgICAgaWYgKGN1cnJlbnQgPT0gbW9kZWwubGFzdF92YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmNoYW5nZWQuZGlzcGF0Y2goY3VycmVudCwgbW9kZWwubGFzdF92YWx1ZSlcbiAgICAgIG1vZGVsLmxhc3RfdmFsdWUgPSBjdXJyZW50XG4gICAgfSxcbiAgICBcbiAgICBrZXlEb3duOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChtb2RlbC50aW1lcikge1xuICAgICAgICBtb2RlbC5jaGVjaygpXG4gICAgICB9XG4gICAgfSxcbiAgfVxuICBcbiAgaW5wdXQua2V5ZG93bihtb2RlbC5rZXlEb3duKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXRXYXRjaGVyXG4iLCJ2YXIgcmV0dXJuRmFsc2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJldHVybkZhbHNlXG4iLCJcInVzZSBzdHJpY3RcIlxuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG5cbnZhciBSb3RhdGUgPSBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlKSB7XG4gIHZhciBpc1ZhbGlkVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdmFsdWVzLmluZGV4T2YodikgIT0gLTFcbiAgfVxuICBcbiAgdmFyIGNoZWNrVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKCFpc1ZhbGlkVmFsdWUodikpIHtcbiAgICAgIHRocm93IFwiaW52YWxpZCB2YWx1ZTogXCIgKyB2XG4gICAgfVxuICB9XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFsdWUgPSBudWxsXG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSB7XG4gICAgY2hhbmdlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgXG4gICAgZ2V0VmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZXNcbiAgICB9LFxuICAgIFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAobmV3X3ZhbHVlID09IHZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY2hlY2tWYWx1ZShuZXdfdmFsdWUpXG4gICAgICB2YWx1ZSA9IG5ld192YWx1ZVxuICAgICAgcm90YXRlLmNoYW5nZWQuZGlzcGF0Y2godmFsdWUpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IHZhbHVlcy5pbmRleE9mKHZhbHVlKVxuICAgICAgaWR4ID0gKGlkeCArIDEpICUgdmFsdWVzLmxlbmd0aFxuICAgICAgcm90YXRlLnNldCh2YWx1ZXNbaWR4XSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdGF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdGF0ZVxuIiwibW9kdWxlLmV4cG9ydHMucnVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG4gIHZhciBmaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXIuanNcIikoKVxuICB2YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKShmaW5kZXIpXG4gIFxuICB2YXIgc2F2ZUZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpbGVzID0gZmlsZV9tYW5hZ2VyLmdldEZpbGVzKClcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm9wZW4tZmlsZXNcIiwgSlNPTi5zdHJpbmdpZnkoZmlsZXMpKVxuICB9XG4gIHZhciBsb2FkRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm9wZW4tZmlsZXNcIikgfHwgXCJbXVwiKVxuICB9XG4gIGxvYWRGaWxlTGlzdCgpLmZvckVhY2goZnVuY3Rpb24ocGF0aCkge1xuICAgIGZpbGVfbWFuYWdlci5vcGVuKHBhdGgpXG4gIH0pXG4gIFxuICBmaWxlX21hbmFnZXIub3BlbmVkLmFkZChzYXZlRmlsZUxpc3QpXG4gIGZpbGVfbWFuYWdlci5jbG9zZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgXG4gIC8vIHNob3J0Y3V0IGtleXNcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK1wiLCBcIm1vZCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIubmV4dEZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3NoaWZ0K1wiLCBcIm1vZCtzaGlmdCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIucHJldkZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3dcIiwgXCJtb2Qra1wiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLmNsb3NlKGZpbGVfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIucmVsb2FkKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zaG93KClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG59XG4iXX0=
