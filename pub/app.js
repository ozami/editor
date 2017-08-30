require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"codemirror":"codemirror"}],2:[function(require,module,exports){
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

},{"codemirror":"codemirror"}],3:[function(require,module,exports){
var $ = require("jquery");
var _ = require("underscore");
var Signal = require("signals").Signal
var CodeMirror = require("codemirror");
require("codemirror-addon");
require("./codemirror/select-line.js")
require("./codemirror/split-into-lines.js")
require("./text-mode.js");

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
          lineNumbers: true,
          tabSize: 4,
          showCursorWhenSelecting: true,
          autoCloseBrackets: true,
          matchBrackets: true,
          matchTags: true,
          autoCloseTags: true,
          styleActiveLine: true,
          styleSelectedText: true,
          mode: mode,
          dragDrop: false,
        });
        CodeMirror.registerHelper("hintWords", mode, null);
        code_mirror.setOption("extraKeys", {
          "Ctrl-Space": "autocomplete",
          "Ctrl-U": "autocomplete",
          "Ctrl-/": "toggleComment",
          "Cmd-/": "toggleComment",
          Tab: "indentAuto",
          "Ctrl-D": false,
          "Cmd-D": false,
        });
        code_mirror.setOption("styleActiveLine", {nonEmpty: true});
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
        var cm_input = code_mirror.getInputField();
        $(cm_input).addClass("mousetrap"); // enable hotkey
        Mousetrap(cm_input).bind("alt+b", function() {
          code_mirror.execCommand("goWordLeft");
          return false;
        });
        Mousetrap(cm_input).bind("alt+f", function() {
          code_mirror.execCommand("goWordRight");
          return false;
        });
        Mousetrap(cm_input).bind("alt+h", function() {
          code_mirror.execCommand("delWordBefore");
          return false;
        });
        Mousetrap(cm_input).bind("alt+d", function() {
          code_mirror.execCommand("delWordAfter");
          return false;
        });
        Mousetrap(cm_input).bind("mod+d", function() {
          code_mirror.setSelections(
            code_mirror.listSelections().map(function(i) {
              return code_mirror.findWordAt(i.anchor);
            })
          );
          return false;
        });
        Mousetrap(cm_input).bind("mod+l", function() {
          code_mirror.execCommand("selectLine");
          return false;
        });
        
        Mousetrap(cm_input).bind("mod+shift+l", function() {
          code_mirror.execCommand("splitIntoLines");
          return false;
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
        
        // marks
        (function() {
          var marks = [];
          Mousetrap(editor[0]).bind("mod+m", function() {
            var cursor = code_mirror.getCursor();
            if (marks.length) {
              var last = marks[marks.length - 1];
              if (last.line == cursor.line && last.ch == cursor.ch) {
                code_mirror.setSelections(marks.map(function(m) {
                  return {head: m, anchor: m};
                }), marks.length - 1);
                marks = [];
                return false;
              }
            }
            marks.push(cursor);
            return false;
          });
        })();

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

},{"./codemirror/select-line.js":1,"./codemirror/split-into-lines.js":2,"./indent.js":10,"./text-mode.js":14,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","jquery":"jquery","signals":"signals","underscore":"underscore"}],4:[function(require,module,exports){
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

},{"jquery":"jquery"}],5:[function(require,module,exports){
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

},{"./editor.js":3,"./file-view.js":4,"signals":"signals","underscore":"underscore"}],6:[function(require,module,exports){
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

},{"jquery":"jquery"}],7:[function(require,module,exports){
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

},{"./finder-suggest-view.js":6,"jquery":"jquery","signals":"signals","underscore":"underscore"}],8:[function(require,module,exports){
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

},{"./input-watcher.js":11,"./return-false.js":12,"jquery":"jquery","mousetrap":"mousetrap"}],9:[function(require,module,exports){
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

},{"./editor.js":3,"./finder-suggest.js":7,"./finder-view.js":8,"signals":"signals"}],10:[function(require,module,exports){
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

},{"./rotate.js":13}],11:[function(require,module,exports){
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

},{"jquery":"jquery","signals":"signals"}],12:[function(require,module,exports){
var returnFalse = function(func) {
  return function() {
    func.apply(this, arguments)
    return false
  }
}

module.exports = returnFalse

},{}],13:[function(require,module,exports){
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

},{"signals":"signals"}],14:[function(require,module,exports){
var CodeMirror = require("codemirror");

CodeMirror.defineSimpleMode("text", {
  start: [],
  comment: [],
  meta: {}
});

},{"codemirror":"codemirror"}],"app":[function(require,module,exports){
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

},{"./file.js":5,"./finder.js":9,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zcGxpdC1pbnRvLWxpbmVzLmpzIiwianMvZWRpdG9yLmpzIiwianMvZmlsZS12aWV3LmpzIiwianMvZmlsZS5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LXZpZXcuanMiLCJqcy9maW5kZXItc3VnZ2VzdC5qcyIsImpzL2ZpbmRlci12aWV3LmpzIiwianMvZmluZGVyLmpzIiwianMvaW5kZW50LmpzIiwianMvaW5wdXQtd2F0Y2hlci5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL3RleHQtbW9kZS5qcyIsImpzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0TGluZSA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9LFxuICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgbGluZTogaS5hbmNob3IubGluZSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIClcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zcGxpdEludG9MaW5lcyA9IGZ1bmN0aW9uKGNtKSB7XG4gIHZhciBzZWxlY3Rpb25zID0gY20ubGlzdFNlbGVjdGlvbnMoKVxuICBpZiAoc2VsZWN0aW9ucy5sZW5ndGggIT0gMSkge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgYW5jaG9yID0gc2VsZWN0aW9uc1swXS5hbmNob3JcbiAgdmFyIGhlYWQgPSBzZWxlY3Rpb25zWzBdLmhlYWRcbiAgdmFyIG5ld19zZWxlY3Rpb25zID0gW11cbiAgZm9yICh2YXIgaSA9IGFuY2hvci5saW5lOyBpIDw9IGhlYWQubGluZTsgKytpKSB7XG4gICAgbmV3X3NlbGVjdGlvbnMucHVzaCh7XG4gICAgICBhbmNob3I6IHtcbiAgICAgICAgbGluZTogaSxcbiAgICAgICAgY2g6IGkgPT0gYW5jaG9yLmxpbmUgPyBhbmNob3IuY2ggOiAwLFxuICAgICAgfSxcbiAgICAgIGhlYWQ6IHtcbiAgICAgICAgbGluZTogaSxcbiAgICAgICAgY2g6IGkgPT0gaGVhZC5saW5lID8gaGVhZC5jaCA6IEluZmluaXR5LFxuICAgICAgfSxcbiAgICB9KVxuICB9XG4gIGNtLnNldFNlbGVjdGlvbnMobmV3X3NlbGVjdGlvbnMpXG59XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcbnJlcXVpcmUoXCJjb2RlbWlycm9yLWFkZG9uXCIpO1xucmVxdWlyZShcIi4vY29kZW1pcnJvci9zZWxlY3QtbGluZS5qc1wiKVxucmVxdWlyZShcIi4vY29kZW1pcnJvci9zcGxpdC1pbnRvLWxpbmVzLmpzXCIpXG5yZXF1aXJlKFwiLi90ZXh0LW1vZGUuanNcIik7XG5cbi8vIEVkaXRvck1hbmFnZXJcbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc3RhdHVzX2NoYW5nZWQgPSBuZXcgU2lnbmFsKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgZGF0YToge1xuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSl7XG4gICAgICBpZiAocmVwbHkuZXJyb3IpIHtcbiAgICAgICAgYWxlcnQocmVwbHkuZXJyb3IpO1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGVuY29kaW5nID0gcmVwbHkuZW5jb2Rpbmc7XG4gICAgICB2YXIgZWRpdG9yID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZWRpdG9yXCIpLmFwcGVuZFRvKFwiI2VkaXRvcnNcIik7XG4gICAgICB2YXIgbW9kZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIik7XG4gICAgICAgIHZhciBtb2RlID0ge1xuICAgICAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICAgICAgdGFnOiBcInBocFwiLFxuICAgICAgICB9W2V4dGVuc2lvbl07XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlLm1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwidGV4dFwiO1xuICAgICAgfSkoKTtcbiAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvZGVfbWlycm9yID0gQ29kZU1pcnJvcihlZGl0b3JbMF0sIHtcbiAgICAgICAgICB2YWx1ZTogcmVwbHkuY29udGVudCxcbiAgICAgICAgICBsaW5lTnVtYmVyczogdHJ1ZSxcbiAgICAgICAgICB0YWJTaXplOiA0LFxuICAgICAgICAgIHNob3dDdXJzb3JXaGVuU2VsZWN0aW5nOiB0cnVlLFxuICAgICAgICAgIGF1dG9DbG9zZUJyYWNrZXRzOiB0cnVlLFxuICAgICAgICAgIG1hdGNoQnJhY2tldHM6IHRydWUsXG4gICAgICAgICAgbWF0Y2hUYWdzOiB0cnVlLFxuICAgICAgICAgIGF1dG9DbG9zZVRhZ3M6IHRydWUsXG4gICAgICAgICAgc3R5bGVBY3RpdmVMaW5lOiB0cnVlLFxuICAgICAgICAgIHN0eWxlU2VsZWN0ZWRUZXh0OiB0cnVlLFxuICAgICAgICAgIG1vZGU6IG1vZGUsXG4gICAgICAgICAgZHJhZ0Ryb3A6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKTtcbiAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiZXh0cmFLZXlzXCIsIHtcbiAgICAgICAgICBcIkN0cmwtU3BhY2VcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICAgICAgICBcIkN0cmwtVVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgICAgICAgIFwiQ3RybC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgICAgICAgIFwiQ21kLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgICAgICAgVGFiOiBcImluZGVudEF1dG9cIixcbiAgICAgICAgICBcIkN0cmwtRFwiOiBmYWxzZSxcbiAgICAgICAgICBcIkNtZC1EXCI6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwic3R5bGVBY3RpdmVMaW5lXCIsIHtub25FbXB0eTogdHJ1ZX0pO1xuICAgICAgICAvLyBtYWludGFpbiBpbmRlbnRhdGlvbiBvbiBwYXN0ZVxuICAgICAgICBjb2RlX21pcnJvci5vbihcImJlZm9yZUNoYW5nZVwiLCBmdW5jdGlvbihjbSwgY2hhbmdlKSB7XG4gICAgICAgICAgaWYgKGNoYW5nZS5vcmlnaW4gIT0gXCJwYXN0ZVwiKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChDb2RlTWlycm9yLmNtcFBvcyhjaGFuZ2UuZnJvbSwgY2hhbmdlLnRvKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgaW5zZXJ0aW9uIHBvaW50IGlzIGF0IHRoZSBlbmQgb2YgdGhlIGxpbmVcbiAgICAgICAgICB2YXIgZGVzdCA9IGNtLmdldExpbmUoY2hhbmdlLmZyb20ubGluZSk7XG4gICAgICAgICAgaWYgKGRlc3QubGVuZ3RoICE9IGNoYW5nZS5mcm9tLmNoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBsaW5lIGNvbnNpc3RzIG9mIG9ubHkgd2hpdGUgc3BhY2VzXG4gICAgICAgICAgaWYgKGRlc3QubWF0Y2goL1teIFxcdF0vKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyByZW1vdmUgdGhlIGxhc3QgZW1wdHkgbGluZVxuICAgICAgICAgIGlmIChjaGFuZ2UudGV4dFtjaGFuZ2UudGV4dC5sZW5ndGggLSAxXSA9PSBcIlwiKSB7XG4gICAgICAgICAgICBjaGFuZ2UudGV4dC5wb3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGJhc2VfaW5kZW50ID0gY2hhbmdlLnRleHRbMF0ubWF0Y2goL15bIFxcdF0qLylbMF07XG4gICAgICAgICAgY2hhbmdlLnRleHQgPSBjaGFuZ2UudGV4dC5tYXAoZnVuY3Rpb24obGluZSwgaSkge1xuICAgICAgICAgICAgbGluZSA9IGxpbmUubWF0Y2goL14oWyBcXHRdKikoLiopLyk7XG4gICAgICAgICAgICB2YXIgaW5kZW50ID0gbGluZVsxXTtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gbGluZVsyXTtcbiAgICAgICAgICAgIGluZGVudCA9IChkZXN0ICsgaW5kZW50KS5zdWJzdHIoMCwgZGVzdC5sZW5ndGggKyBpbmRlbnQubGVuZ3RoIC0gYmFzZV9pbmRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgIHJldHVybiBpbmRlbnQgKyB0ZXh0O1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNoYW5nZS50ZXh0WzBdID0gY2hhbmdlLnRleHRbMF0uc3Vic3RyKGRlc3QubGVuZ3RoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvZGVfbWlycm9yLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdXRvU2F2ZSgpO1xuICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2goXG4gICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgY29kZV9taXJyb3IuaXNDbGVhbihjb2RlX21pcnJvci5sYXN0X3NhdmUpID8gXCJjbGVhblwiOiBcIm1vZGlmaWVkXCJcbiAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGNtX2lucHV0ID0gY29kZV9taXJyb3IuZ2V0SW5wdXRGaWVsZCgpO1xuICAgICAgICAkKGNtX2lucHV0KS5hZGRDbGFzcyhcIm1vdXNldHJhcFwiKTsgLy8gZW5hYmxlIGhvdGtleVxuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrYlwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvV29yZExlZnRcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2ZcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJnb1dvcmRSaWdodFwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQraFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImRlbFdvcmRCZWZvcmVcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJkZWxXb3JkQWZ0ZXJcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK2RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvZGVfbWlycm9yLmZpbmRXb3JkQXQoaS5hbmNob3IpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwic2VsZWN0TGluZVwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK3NoaWZ0K2xcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJzcGxpdEludG9MaW5lc1wiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gY29kZV9taXJyb3IuY2hhbmdlR2VuZXJhdGlvbih0cnVlKTtcbiAgICAgICAgLy8gc3RhdHVzIGJhclxuICAgICAgICBlZGl0b3IuYXBwZW5kKFxuICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZm9vdFwiPicpLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbWVzc2FnZVwiPicpLFxuICAgICAgICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1pbmRlbnQgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW9sXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVuY29kaW5nXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1vZGVcIj4nKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgICAgdmFyIHVwZGF0ZU1vZGVJbmZvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG1vZGUgPSBjb2RlX21pcnJvci5nZXRNb2RlKCk7XG4gICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlLm5hbWUpO1xuICAgICAgICB9O1xuICAgICAgICB1cGRhdGVNb2RlSW5mbygpO1xuICAgICAgICBcbiAgICAgICAgLy8gaW5kZW50XG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgdXBkYXRlSW5kZW50SW5mbyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikudGV4dCh0eXBlKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHZhciBJbmRlbnQgPSByZXF1aXJlKFwiLi9pbmRlbnQuanNcIik7XG4gICAgICAgICAgdmFyIGluZGVudCA9IEluZGVudCgpO1xuICAgICAgICAgIGluZGVudC5jaGFuZ2VkLmFkZChmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICBpZiAodHlwZSA9PSBcIlRBQlwiKSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIHRydWUpO1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRVbml0XCIsIDQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCBOdW1iZXIodHlwZS5yZXBsYWNlKFwiU1BcIiwgXCJcIikpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVwZGF0ZUluZGVudEluZm8odHlwZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaW5kZW50LnNldChJbmRlbnQuZGV0ZWN0SW5kZW50VHlwZShyZXBseS5jb250ZW50KSlcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaW5kZW50LnJvdGF0ZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gbGluZSBzZXByYXRvclxuICAgICAgICB2YXIgZW9sID0gc2VsZi5kZXRlY3RFb2wocmVwbHkuY29udGVudCk7XG4gICAgICAgIHZhciBlb2xfbmFtZXMgPSB7XG4gICAgICAgICAgXCJcXHJcIjogXCJDUlwiLFxuICAgICAgICAgIFwiXFxuXCI6IFwiTEZcIixcbiAgICAgICAgICBcIlxcclxcblwiOiBcIkNSTEZcIlxuICAgICAgICB9O1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQoZW9sX25hbWVzW2VvbF0pO1xuICAgICAgICAvLyBlbmNvZGluZ1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZyk7XG4gICAgICAgIFxuICAgICAgICBlZGl0b3IuZGF0YShcInBhdGhcIiwgcGF0aCk7XG4gICAgICAgIGVkaXRvci5kYXRhKFwiY29kZV9taXJyb3JcIiwgY29kZV9taXJyb3IpO1xuICAgICAgICAvLyBzYXZlXG4gICAgICAgIHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGdlbmVyYXRpb24gPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IFwiL3dyaXRlLnBocFwiLFxuICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgIGVuY29kaW5nOiBlbmNvZGluZyxcbiAgICAgICAgICAgICAgY29udGVudDogY29kZV9taXJyb3IuZ2V0VmFsdWUoKS5yZXBsYWNlKC9cXG4vZywgZW9sKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICAgIGlmIChyZXBseSA9PSBcIm9rXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gZ2VuZXJhdGlvbjtcbiAgICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImNsZWFuXCIpO1xuICAgICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZWQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlIGZhaWxlZC4gXCIgKyByZXBseS5lcnJvcik7XG4gICAgICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgXCJlcnJvclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLlwiKTtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgXCJlcnJvclwiKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gYXV0byBzYXZlXG4gICAgICAgIHZhciBhdXRvU2F2ZSA9IF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCFjb2RlX21pcnJvci5pc0NsZWFuKGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSkpIHtcbiAgICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDQwMDApO1xuICAgICAgICAvLyBzYXZlIHdpdGggY29tbWFuZC1zXG4gICAgICAgIE1vdXNldHJhcChlZGl0b3JbMF0pLmJpbmQoXCJtb2Qrc1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzYXZlKCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIG1hcmtzXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgbWFya3MgPSBbXTtcbiAgICAgICAgICBNb3VzZXRyYXAoZWRpdG9yWzBdKS5iaW5kKFwibW9kK21cIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gY29kZV9taXJyb3IuZ2V0Q3Vyc29yKCk7XG4gICAgICAgICAgICBpZiAobWFya3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciBsYXN0ID0gbWFya3NbbWFya3MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgIGlmIChsYXN0LmxpbmUgPT0gY3Vyc29yLmxpbmUgJiYgbGFzdC5jaCA9PSBjdXJzb3IuY2gpIHtcbiAgICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKG1hcmtzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge2hlYWQ6IG0sIGFuY2hvcjogbX07XG4gICAgICAgICAgICAgICAgfSksIG1hcmtzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgIG1hcmtzID0gW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXJrcy5wdXNoKGN1cnNvcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSkoKTtcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfSk7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICB2YXIgZm91bmQgPSB0aGlzLmdldChwYXRoKTtcbiAgaWYgKGZvdW5kLmxlbmd0aCkge1xuICAgIGZvdW5kLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5mb2N1cygpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5yZWZyZXNoKCk7XG4gIH1cbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5kYXRhKFwicGF0aFwiKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdGhpcy5nZXQocGF0aCkucmVtb3ZlKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZGV0ZWN0RW9sID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiO1xuICB9XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXCI7XG4gIH1cbiAgcmV0dXJuIFwiXFxuXCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBFZGl0b3JNYW5hZ2VyKCk7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcblxudmFyIGdldEZpbGVFbGVtZW50ID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gJChcIiNmaWxlcyAuZmlsZS1pdGVtXCIpLmZpbHRlcihmdW5jdGlvbihpZHgsIGl0ZW0pIHtcbiAgICByZXR1cm4gJChpdGVtKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gIH0pXG59XG5cbnZhciBGaWxlTWFuYWdlclZpZXcgPSBmdW5jdGlvbihtb2RlbCkge1xuICB2YXIgdmlldyA9IHtcbiAgICBhZGRJdGVtOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgZGlyID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKyRcIiksIFwiXCIpXG4gICAgICB2YXIgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKVxuICAgICAgJChcIjxkaXY+XCIpLmRhdGEoXCJwYXRoXCIsIHBhdGgpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZGlyXCIpLnRleHQoZGlyKSxcbiAgICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwibmFtZVwiKS50ZXh0KG5hbWUpLFxuICAgICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICAgICkuYXBwZW5kVG8oXCIjZmlsZXNcIilcbiAgICB9LFxuICAgIFxuICAgIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGdldEZpbGVFbGVtZW50KHBhdGgpLnJlbW92ZSgpXG4gICAgfSxcbiAgICBcbiAgICBhY3RpdmF0ZUl0ZW06IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZ2V0RmlsZUVsZW1lbnQocGF0aCkuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZVN0YXR1czogZnVuY3Rpb24ocGF0aCwgc3RhdHVzKSB7XG4gICAgICBnZXRGaWxlRWxlbWVudChwYXRoKVxuICAgICAgICAuZmluZChcIi5zdGF0dXNcIilcbiAgICAgICAgLnJlbW92ZUNsYXNzKFwiY2xlYW4gZXJyb3IgbW9kaWZpZWRcIilcbiAgICAgICAgLmFkZENsYXNzKHN0YXR1cylcbiAgICB9LFxuICB9XG4gIFxuICBtb2RlbC5vcGVuZWQuYWRkKHZpZXcuYWRkSXRlbSlcbiAgbW9kZWwuY2xvc2VkLmFkZCh2aWV3LnJlbW92ZUl0ZW0pXG4gIG1vZGVsLmFjdGl2YXRlZC5hZGQodmlldy5hY3RpdmF0ZUl0ZW0pXG4gIG1vZGVsLnN0YXR1c19jaGFuZ2VkLmFkZCh2aWV3LnVwZGF0ZVN0YXR1cylcbiAgXG4gICQoXCIjZmlsZXNcIikub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIG1vZGVsLmFjdGl2YXRlKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKFwicGF0aFwiKSlcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlTWFuYWdlclZpZXdcbiIsInZhciBzaWduYWxzID0gcmVxdWlyZShcInNpZ25hbHNcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciBGaWxlTWFuYWdlclZpZXcgPSByZXF1aXJlKFwiLi9maWxlLXZpZXcuanNcIilcbnZhciBlZGl0b3JfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci5qc1wiKVxuXG52YXIgRmlsZU1hbmFnZXIgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIG9wZW5lZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgY2xvc2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBhY3RpdmF0ZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIHN0YXR1c19jaGFuZ2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBcbiAgICBhY3RpdmU6IG51bGwsIC8vIHBhdGggb2YgYWN0aXZlIGZpbGVcbiAgICBmaWxlczogW10sXG4gICAgXG4gICAgZ2V0RmlsZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF8ucGx1Y2sobW9kZWwuZmlsZXMsIFwicGF0aFwiKVxuICAgIH0sXG4gICAgXG4gICAgb3BlbjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgXCJUaGUgcGF0aCBpcyBudWxsXCJcbiAgICAgIH1cbiAgICAgIC8vIHRyeSB0byBhY3RpdmF0ZSBhbHJlYWR5IG9wZW5lZCBmaWxlc1xuICAgICAgaWYgKG1vZGVsLmFjdGl2YXRlKHBhdGgpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZWRpdG9yX21hbmFnZXIub3BlbihwYXRoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RlbC5maWxlcy5wdXNoKHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIHN0YXR1czogXCJjbGVhblwiLFxuICAgICAgICB9KVxuICAgICAgICBtb2RlbC5vcGVuZWQuZGlzcGF0Y2gocGF0aClcbiAgICAgICAgbW9kZWwuYWN0aXZhdGUocGF0aClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBnZXRBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmFjdGl2ZVxuICAgIH0sXG4gICAgXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICAgIGlmIChwYXRoICE9PSBudWxsICYmIG1vZGVsLmluZGV4T2YocGF0aCkgPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICBmaW5kZXIuc2V0UGF0aChwYXRoKVxuICAgICAgZWRpdG9yX21hbmFnZXIuYWN0aXZhdGUocGF0aClcbiAgICAgIG1vZGVsLmFjdGl2ZSA9IHBhdGhcbiAgICAgIG1vZGVsLmFjdGl2YXRlZC5kaXNwYXRjaChwYXRoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFxuICAgIG5leHRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUodHJ1ZSlcbiAgICB9LFxuICAgIFxuICAgIHByZXZGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUoZmFsc2UpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGVGaWxlOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuZmlsZXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4XG4gICAgICBpZiAobW9kZWwuYWN0aXZlID09PSBudWxsKSB7XG4gICAgICAgIGlkeCA9IG5leHQgPyAwIDogbW9kZWwuZmlsZXMubGVuZ3RoIC0gMVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlkeCA9IG1vZGVsLmluZGV4T2YobW9kZWwuYWN0aXZlKVxuICAgICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgICAgaWR4ID0gKGlkeCArIG1vZGVsLmZpbGVzLmxlbmd0aCkgJSBtb2RlbC5maWxlcy5sZW5ndGhcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFjdGl2YXRlKG1vZGVsLmZpbGVzW2lkeF0ucGF0aClcbiAgICB9LFxuICAgIFxuICAgIGNsb3NlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaW5kZXhPZihwYXRoKVxuICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgaWYgKG1vZGVsLmZpbGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgbW9kZWwuYWN0aXZhdGUobnVsbClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtb2RlbC5wcmV2RmlsZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVkaXRvcl9tYW5hZ2VyLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5maWxlcy5zcGxpY2UoaWR4LCAxKVxuICAgICAgbW9kZWwuY2xvc2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICByZWxvYWQ6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5vcGVuKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBpbmRleE9mOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZ2V0RmlsZXMoKS5pbmRleE9mKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVTdGF0dXM6IGZ1bmN0aW9uKHBhdGgsIHN0YXR1cykge1xuICAgICAgbW9kZWwuaW5kZXhPZihwYXRoKS5zdGF0dXMgPSBzdGF0dXNcbiAgICAgIG1vZGVsLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIHN0YXR1cylcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIuc2VsZWN0ZWQuYWRkKG1vZGVsLm9wZW4pXG4gIGVkaXRvcl9tYW5hZ2VyLnN0YXR1c19jaGFuZ2VkLmFkZChtb2RlbC51cGRhdGVTdGF0dXMpXG4gIFxuICB2YXIgdmlldyA9IEZpbGVNYW5hZ2VyVmlldyhtb2RlbClcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVNYW5hZ2VyXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcblxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgdmFyIGxpc3QgPSAkKFwiI2ZpbmRlci1pdGVtc1wiKVxuICBcbiAgdmFyIHZpZXcgPSB7XG4gICAgdXBkYXRlSXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBsaXN0LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpLmVtcHR5KClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSAmJiBpdGVtc1swXSA9PSBtb2RlbC5nZXRDdXJzb3IoKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBuYW1lX3J4ID0gbmV3IFJlZ0V4cChcIi8oW14vXSovPykkXCIpXG4gICAgICBsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVfcnguZXhlYyhpdGVtKVsxXVxuICAgICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgICB9KSlcbiAgICAgIGxpc3Quc2Nyb2xsVG9wKDApLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGxpc3QuZmluZChcImEuc2VsZWN0ZWRcIikucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKVxuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgYSA9IGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gICAgICB9KVxuICAgICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcblxuICAgICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KClcbiAgICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgICAgdmFyIHZpZXdfaGVpZ2h0ID0gbGlzdC5pbm5lckhlaWdodCgpXG4gICAgICAgIGlmICh0b3AgLSBsaXN0LnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgICAgIGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm90dG9tIC0gbGlzdC5zY3JvbGxUb3AoKSA+IHZpZXdfaGVpZ2h0KSB7XG4gICAgICAgICAgbGlzdC5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNjcm9sbEludG9WaWV3KGEpXG4gICAgfVxuICB9XG4gIFxuICBtb2RlbC5pdGVtc19jaGFuZ2VkLmFkZCh2aWV3LnVwZGF0ZUl0ZW1zKVxuICBtb2RlbC5jdXJzb3JfbW92ZWQuYWRkKHZpZXcudXBkYXRlQ3Vyc29yKVxuICBcbiAgLy8gd2hlbiBpdGVtIHdhcyBzZWxlY3RlZFxuICBsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIFxuICAvLyBwcmV2ZW50IGZyb20gbG9vc2luZyBmb2N1c1xuICBsaXN0Lm9uKFwibW91c2Vkb3duXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIH0pXG4gIFxuICByZXR1cm4gdmlld1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RWaWV3XG4iLCJ2YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBGaW5kZXJTdWdnZXN0VmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LXZpZXcuanNcIilcblxudmFyIEZpbmRlclN1Z2dlc3QgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIGl0ZW1zOiBbXSxcbiAgICBjdXJzb3I6IG51bGwsIC8vIGhpZ2hsaWdodGVkIGl0ZW1cbiAgICBcbiAgICBpdGVtc19jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgY3Vyc29yX21vdmVkOiBuZXcgU2lnbmFsKCksXG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgIHVybDogXCIvZmluZGVyLnBocFwiLFxuICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJmYWlsZWQgdG8gZmV0Y2ggc3VnZ2VzdCBmb3IgdGhlIHBhdGg6IFwiICsgcGF0aClcbiAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgbW9kZWwuc2V0SXRlbXMocmVwbHkuaXRlbXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICByZXR1cm4gcmVwbHkuYmFzZSArIGlcbiAgICAgICAgfSkpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2V0SXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IobnVsbClcbiAgICAgIG1vZGVsLml0ZW1zID0gaXRlbXNcbiAgICAgIG1vZGVsLml0ZW1zX2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwuaXRlbXMpXG4gICAgfSxcbiAgICBcbiAgICBnZXRJdGVtczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuaXRlbXNcbiAgICB9LFxuICAgIFxuICAgIGdldEN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuY3Vyc29yXG4gICAgfSxcbiAgICBcbiAgICBzZXRDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5jdXJzb3IpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jdXJzb3IgPSBwYXRoXG4gICAgICBtb2RlbC5jdXJzb3JfbW92ZWQuZGlzcGF0Y2gobW9kZWwuY3Vyc29yKVxuICAgIH0sXG4gICAgXG4gICAgbW92ZUN1cnNvcjogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmN1cnNvciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAobW9kZWwuaXRlbXMubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbMF0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaXRlbXMuaW5kZXhPZihtb2RlbC5jdXJzb3IpXG4gICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgIGlkeCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vZGVsLml0ZW1zLmxlbmd0aCAtIDEsIGlkeCkpXG4gICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbaWR4XSlcbiAgICB9LFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKHBhdGgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgbW9kZWwudXBkYXRlKGZpbmRlci5nZXRQYXRoKCkpXG4gICAgfVxuICB9KVxuICBcbiAgZmluZGVyLnBhdGhfY2hhbmdlZC5hZGQoXy5kZWJvdW5jZShtb2RlbC51cGRhdGUsIDI1MCkpXG4gIFxuICB2YXIgdmlldyA9IEZpbmRlclN1Z2dlc3RWaWV3KG1vZGVsKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIEZhbHNlID0gcmVxdWlyZShcIi4vcmV0dXJuLWZhbHNlLmpzXCIpXG52YXIgSW5wdXRXYXRjaGVyID0gcmVxdWlyZShcIi4vaW5wdXQtd2F0Y2hlci5qc1wiKVxuXG52YXIgRmluZGVyVmlldyA9IGZ1bmN0aW9uKG1vZGVsLCBzdWdnZXN0KSB7XG4gIHZhciBwYXRoX2lucHV0ID0gJChcIiNmaW5kZXItcGF0aFwiKS52YWwoXCIvXCIpXG4gIFxuICB2YXIgcGF0aF93YXRjaGVyID0gSW5wdXRXYXRjaGVyKHBhdGhfaW5wdXQsIDUwKVxuICBwYXRoX3dhdGNoZXIuY2hhbmdlZC5hZGQobW9kZWwuc2V0UGF0aClcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgJChcIiNmaW5kZXJcIikuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIHBhdGhfaW5wdXQuZm9jdXMoKVxuICAgICAgcGF0aF93YXRjaGVyLnN0YXJ0KClcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgJChcIiNmaW5kZXJcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIHBhdGhfd2F0Y2hlci5zdG9wKClcbiAgICB9LFxuICB9XG4gIFxuICAvLyBoaWRlIG9uIGJsdXJcbiAgcGF0aF9pbnB1dC5ibHVyKG1vZGVsLmhpZGUoKSlcbiAgXG4gIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICB2aWV3LnNob3coKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZpZXcuaGlkZSgpXG4gICAgfVxuICB9KVxuICBcbiAgbW9kZWwucGF0aF9jaGFuZ2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgcGF0aF9pbnB1dC52YWwocGF0aClcbiAgfSlcbiAgXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZW50ZXJcIiwgRmFsc2UobW9kZWwuZW50ZXIpKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcInRhYlwiLCBGYWxzZShtb2RlbC50YWIpKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImVzY1wiLCBGYWxzZShtb2RlbC5oaWRlKSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJkb3duXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgIHN1Z2dlc3QubW92ZUN1cnNvcih0cnVlKVxuICB9KSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ1cFwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBzdWdnZXN0Lm1vdmVDdXJzb3IoZmFsc2UpXG4gIH0pKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcIm1vZCt1XCIsIEZhbHNlKFxuICAgIG1vZGVsLmdvVG9QYXJlbnREaXJlY3RvcnlcbiAgKSlcbiAgXG4gIHJldHVybiB2aWV3XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpXG52YXIgRmluZGVyVmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci12aWV3LmpzXCIpXG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LmpzXCIpXG5cbnZhciBGaW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgcGF0aF9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgdmlzaWJpbGl0eV9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgcGF0aDogXCJcIixcbiAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgocGF0aClcbiAgICAgIGlmIChwYXRoLnN1YnN0cigtMSkgPT0gXCIvXCIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5oaWRlKClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSB0cnVlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IGZhbHNlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKGVkaXRvcl9tYW5hZ2VyLmdldEFjdGl2ZSgpKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwucGF0aFxuICAgIH0sXG4gICAgXG4gICAgc2V0UGF0aDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwucGF0aCA9IHBhdGhcbiAgICAgIG1vZGVsLnBhdGhfY2hhbmdlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgZ29Ub1BhcmVudERpcmVjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKFxuICAgICAgICBtb2RlbC5wYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKVxuICAgICAgKVxuICAgIH0sXG4gICAgXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhdGggPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBtb2RlbC5zZWxlY3QocGF0aCA/IHBhdGggOiBtb2RlbC5wYXRoKVxuICAgIH0sXG4gICAgXG4gICAgdGFiOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoY3Vyc29yKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpdGVtcyA9IHN1Z2dlc3QuZ2V0SXRlbXMoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoaXRlbXNbMF0pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgc3VnZ2VzdC51cGRhdGUobW9kZWwucGF0aClcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgc3VnZ2VzdCA9IEZpbmRlclN1Z2dlc3QobW9kZWwpXG4gIHN1Z2dlc3Quc2VsZWN0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBtb2RlbC5zZWxlY3QocGF0aClcbiAgfSlcbiAgXG4gIHZhciB2aWV3ID0gRmluZGVyVmlldyhtb2RlbCwgc3VnZ2VzdClcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIFJvdGF0ZSA9IHJlcXVpcmUoXCIuL3JvdGF0ZS5qc1wiKVxuXG52YXIgSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICByZXR1cm4gUm90YXRlKFtcIjRTUFwiLCBcIjJTUFwiLCBcIlRBQlwiXSwgdHlwZSlcbn1cblxuSW5kZW50LmRldGVjdEluZGVudFR5cGUgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKC9bXFxyXFxuXStcXHQvKSkge1xuICAgIHJldHVybiBcIlRBQlwiXG4gIH1cbiAgdmFyIGxpbmVzID0gY29udGVudC5zcGxpdCgvW1xcclxcbl0rLylcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpbmRlbnQgPSBsaW5lc1tpXS5yZXBsYWNlKC9eKCAqKS4qLywgXCIkMVwiKVxuICAgIGlmIChpbmRlbnQubGVuZ3RoID09IDIpIHtcbiAgICAgIHJldHVybiBcIjJTUFwiXG4gICAgfVxuICB9XG4gIHJldHVybiBcIjRTUFwiXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kZW50XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcblxudmFyIElucHV0V2F0Y2hlciA9IGZ1bmN0aW9uKGlucHV0LCBpbnRlcnZhbCkge1xuICBpbnB1dCA9ICQoaW5wdXQpXG4gIFxuICB2YXIgbW9kZWwgPSB7XG4gICAgY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIGlucHV0OiBpbnB1dCxcbiAgICBpbnRlcnZhbDogaW50ZXJ2YWwsXG4gICAgbGFzdF92YWx1ZTogaW5wdXQudmFsKCksXG4gICAgdGltZXI6IG51bGwsXG4gICAgXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc3RvcCgpXG4gICAgICBtb2RlbC50aW1lciA9IHNldEludGVydmFsKG1vZGVsLmNoZWNrLCBtb2RlbC5pbnRlcnZhbClcbiAgICB9LFxuICAgIFxuICAgIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgICAgY2xlYXJJbnRlcnZhbChtb2RlbC50aW1lcilcbiAgICAgIG1vZGVsLnRpbWVyID0gbnVsbFxuICAgIH0sXG4gICAgXG4gICAgY2hlY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnJlbnQgPSBtb2RlbC5pbnB1dC52YWwoKVxuICAgICAgaWYgKGN1cnJlbnQgPT0gbW9kZWwubGFzdF92YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmNoYW5nZWQuZGlzcGF0Y2goY3VycmVudCwgbW9kZWwubGFzdF92YWx1ZSlcbiAgICAgIG1vZGVsLmxhc3RfdmFsdWUgPSBjdXJyZW50XG4gICAgfSxcbiAgICBcbiAgICBrZXlEb3duOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChtb2RlbC50aW1lcikge1xuICAgICAgICBtb2RlbC5jaGVjaygpXG4gICAgICB9XG4gICAgfSxcbiAgfVxuICBcbiAgaW5wdXQua2V5ZG93bihtb2RlbC5rZXlEb3duKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXRXYXRjaGVyXG4iLCJ2YXIgcmV0dXJuRmFsc2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJldHVybkZhbHNlXG4iLCJcInVzZSBzdHJpY3RcIlxuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG5cbnZhciBSb3RhdGUgPSBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlKSB7XG4gIHZhciBpc1ZhbGlkVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdmFsdWVzLmluZGV4T2YodikgIT0gLTFcbiAgfVxuICBcbiAgdmFyIGNoZWNrVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKCFpc1ZhbGlkVmFsdWUodikpIHtcbiAgICAgIHRocm93IFwiaW52YWxpZCB2YWx1ZTogXCIgKyB2XG4gICAgfVxuICB9XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFsdWUgPSBudWxsXG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSB7XG4gICAgY2hhbmdlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgXG4gICAgZ2V0VmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZXNcbiAgICB9LFxuICAgIFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAobmV3X3ZhbHVlID09IHZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY2hlY2tWYWx1ZShuZXdfdmFsdWUpXG4gICAgICB2YWx1ZSA9IG5ld192YWx1ZVxuICAgICAgcm90YXRlLmNoYW5nZWQuZGlzcGF0Y2godmFsdWUpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IHZhbHVlcy5pbmRleE9mKHZhbHVlKVxuICAgICAgaWR4ID0gKGlkeCArIDEpICUgdmFsdWVzLmxlbmd0aFxuICAgICAgcm90YXRlLnNldCh2YWx1ZXNbaWR4XSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdGF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdGF0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzLnJ1biA9IGZ1bmN0aW9uKCkge1xuICB2YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxuICB2YXIgZmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyLmpzXCIpKClcbiAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIikoZmluZGVyKVxuICBcbiAgdmFyIHNhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaWxlcyA9IGZpbGVfbWFuYWdlci5nZXRGaWxlcygpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJvcGVuLWZpbGVzXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzKSlcbiAgfVxuICB2YXIgbG9hZEZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJvcGVuLWZpbGVzXCIpIHx8IFwiW11cIilcbiAgfVxuICBsb2FkRmlsZUxpc3QoKS5mb3JFYWNoKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBmaWxlX21hbmFnZXIub3BlbihwYXRoKVxuICB9KVxuICBcbiAgZmlsZV9tYW5hZ2VyLm9wZW5lZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBmaWxlX21hbmFnZXIuY2xvc2VkLmFkZChzYXZlRmlsZUxpc3QpXG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLm5leHRGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtzaGlmdCtcIiwgXCJtb2Qrc2hpZnQrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5jbG9zZShmaWxlX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrclwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnJlbG9hZCgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICAvLyBzaG93IGZpbmRlclxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrb1wiLCBcIm1vZCtwXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc2hvdygpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxufVxuIl19
