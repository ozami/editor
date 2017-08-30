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
var $ = require("jquery");
var _ = require("underscore");
var Signal = require("signals").Signal
var CodeMirror = require("codemirror");
require("codemirror-addon");
require("./codemirror/select-line.js")
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
          var selections = code_mirror.listSelections();
          if (selections.length != 1) {
            // Do nothing;
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
          code_mirror.setSelections(new_selections);
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

},{"./codemirror/select-line.js":1,"./indent.js":9,"./text-mode.js":13,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","jquery":"jquery","signals":"signals","underscore":"underscore"}],3:[function(require,module,exports){
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

},{"jquery":"jquery"}],4:[function(require,module,exports){
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

},{"./editor.js":2,"./file-view.js":3,"signals":"signals","underscore":"underscore"}],5:[function(require,module,exports){
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

},{"jquery":"jquery"}],6:[function(require,module,exports){
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

},{"./finder-suggest-view.js":5,"jquery":"jquery","signals":"signals","underscore":"underscore"}],7:[function(require,module,exports){
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

},{"./input-watcher.js":10,"./return-false.js":11,"jquery":"jquery","mousetrap":"mousetrap"}],8:[function(require,module,exports){
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

},{"./editor.js":2,"./finder-suggest.js":6,"./finder-view.js":7,"signals":"signals"}],9:[function(require,module,exports){
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

},{"./rotate.js":12}],10:[function(require,module,exports){
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

},{"jquery":"jquery","signals":"signals"}],11:[function(require,module,exports){
var returnFalse = function(func) {
  return function() {
    func.apply(this, arguments)
    return false
  }
}

module.exports = returnFalse

},{}],12:[function(require,module,exports){
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

},{"signals":"signals"}],13:[function(require,module,exports){
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

},{"./file.js":4,"./finder.js":8,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvZWRpdG9yLmpzIiwianMvZmlsZS12aWV3LmpzIiwianMvZmlsZS5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LXZpZXcuanMiLCJqcy9maW5kZXItc3VnZ2VzdC5qcyIsImpzL2ZpbmRlci12aWV3LmpzIiwianMvZmluZGVyLmpzIiwianMvaW5kZW50LmpzIiwianMvaW5wdXQtd2F0Y2hlci5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL3RleHQtbW9kZS5qcyIsImpzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zZWxlY3RMaW5lID0gZnVuY3Rpb24oY20pIHtcbiAgY20uc2V0U2VsZWN0aW9ucyhcbiAgICBjbS5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICBsaW5lOiBpLmhlYWQubGluZSArIDEsXG4gICAgICAgICAgY2g6IDAsXG4gICAgICAgIH0sXG4gICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICBsaW5lOiBpLmFuY2hvci5saW5lLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgKVxufVxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpO1xudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIik7XG5yZXF1aXJlKFwiY29kZW1pcnJvci1hZGRvblwiKTtcbnJlcXVpcmUoXCIuL2NvZGVtaXJyb3Ivc2VsZWN0LWxpbmUuanNcIilcbnJlcXVpcmUoXCIuL3RleHQtbW9kZS5qc1wiKTtcblxuLy8gRWRpdG9yTWFuYWdlclxudmFyIEVkaXRvck1hbmFnZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zdGF0dXNfY2hhbmdlZCA9IG5ldyBTaWduYWwoKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAkLmFqYXgoe1xuICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgIHVybDogXCIvcmVhZC5waHBcIixcbiAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KXtcbiAgICAgIGlmIChyZXBseS5lcnJvcikge1xuICAgICAgICBhbGVydChyZXBseS5lcnJvcik7XG4gICAgICAgIHJlamVjdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZW5jb2RpbmcgPSByZXBseS5lbmNvZGluZztcbiAgICAgIHZhciBlZGl0b3IgPSAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJlZGl0b3JcIikuYXBwZW5kVG8oXCIjZWRpdG9yc1wiKTtcbiAgICAgIHZhciBtb2RlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZXh0ZW5zaW9uID0gcGF0aC5yZXBsYWNlKC8uKlsuXSguKykkLywgXCIkMVwiKTtcbiAgICAgICAgdmFyIG1vZGUgPSB7XG4gICAgICAgICAgaHRtbDogXCJwaHBcIixcbiAgICAgICAgICB0YWc6IFwicGhwXCIsXG4gICAgICAgIH1bZXh0ZW5zaW9uXTtcbiAgICAgICAgaWYgKG1vZGUpIHtcbiAgICAgICAgICByZXR1cm4gbW9kZTtcbiAgICAgICAgfVxuICAgICAgICBtb2RlID0gQ29kZU1pcnJvci5maW5kTW9kZUJ5RXh0ZW5zaW9uKGV4dGVuc2lvbik7XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGUubW9kZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJ0ZXh0XCI7XG4gICAgICB9KSgpO1xuICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29kZV9taXJyb3IgPSBDb2RlTWlycm9yKGVkaXRvclswXSwge1xuICAgICAgICAgIHZhbHVlOiByZXBseS5jb250ZW50LFxuICAgICAgICAgIGxpbmVOdW1iZXJzOiB0cnVlLFxuICAgICAgICAgIHRhYlNpemU6IDQsXG4gICAgICAgICAgc2hvd0N1cnNvcldoZW5TZWxlY3Rpbmc6IHRydWUsXG4gICAgICAgICAgYXV0b0Nsb3NlQnJhY2tldHM6IHRydWUsXG4gICAgICAgICAgbWF0Y2hCcmFja2V0czogdHJ1ZSxcbiAgICAgICAgICBtYXRjaFRhZ3M6IHRydWUsXG4gICAgICAgICAgYXV0b0Nsb3NlVGFnczogdHJ1ZSxcbiAgICAgICAgICBzdHlsZUFjdGl2ZUxpbmU6IHRydWUsXG4gICAgICAgICAgc3R5bGVTZWxlY3RlZFRleHQ6IHRydWUsXG4gICAgICAgICAgbW9kZTogbW9kZSxcbiAgICAgICAgICBkcmFnRHJvcDogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBDb2RlTWlycm9yLnJlZ2lzdGVySGVscGVyKFwiaGludFdvcmRzXCIsIG1vZGUsIG51bGwpO1xuICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJleHRyYUtleXNcIiwge1xuICAgICAgICAgIFwiQ3RybC1TcGFjZVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgICAgICAgIFwiQ3RybC1VXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgICAgICAgXCJDdHJsLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgICAgICAgXCJDbWQtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICAgICAgICBUYWI6IFwiaW5kZW50QXV0b1wiLFxuICAgICAgICAgIFwiQ3RybC1EXCI6IGZhbHNlLFxuICAgICAgICAgIFwiQ21kLURcIjogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJzdHlsZUFjdGl2ZUxpbmVcIiwge25vbkVtcHR5OiB0cnVlfSk7XG4gICAgICAgIC8vIG1haW50YWluIGluZGVudGF0aW9uIG9uIHBhc3RlXG4gICAgICAgIGNvZGVfbWlycm9yLm9uKFwiYmVmb3JlQ2hhbmdlXCIsIGZ1bmN0aW9uKGNtLCBjaGFuZ2UpIHtcbiAgICAgICAgICBpZiAoY2hhbmdlLm9yaWdpbiAhPSBcInBhc3RlXCIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKENvZGVNaXJyb3IuY21wUG9zKGNoYW5nZS5mcm9tLCBjaGFuZ2UudG8pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBpbnNlcnRpb24gcG9pbnQgaXMgYXQgdGhlIGVuZCBvZiB0aGUgbGluZVxuICAgICAgICAgIHZhciBkZXN0ID0gY20uZ2V0TGluZShjaGFuZ2UuZnJvbS5saW5lKTtcbiAgICAgICAgICBpZiAoZGVzdC5sZW5ndGggIT0gY2hhbmdlLmZyb20uY2gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGxpbmUgY29uc2lzdHMgb2Ygb25seSB3aGl0ZSBzcGFjZXNcbiAgICAgICAgICBpZiAoZGVzdC5tYXRjaCgvW14gXFx0XS8pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCBlbXB0eSBsaW5lXG4gICAgICAgICAgaWYgKGNoYW5nZS50ZXh0W2NoYW5nZS50ZXh0Lmxlbmd0aCAtIDFdID09IFwiXCIpIHtcbiAgICAgICAgICAgIGNoYW5nZS50ZXh0LnBvcCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYmFzZV9pbmRlbnQgPSBjaGFuZ2UudGV4dFswXS5tYXRjaCgvXlsgXFx0XSovKVswXTtcbiAgICAgICAgICBjaGFuZ2UudGV4dCA9IGNoYW5nZS50ZXh0Lm1hcChmdW5jdGlvbihsaW5lLCBpKSB7XG4gICAgICAgICAgICBsaW5lID0gbGluZS5tYXRjaCgvXihbIFxcdF0qKSguKikvKTtcbiAgICAgICAgICAgIHZhciBpbmRlbnQgPSBsaW5lWzFdO1xuICAgICAgICAgICAgdmFyIHRleHQgPSBsaW5lWzJdO1xuICAgICAgICAgICAgaW5kZW50ID0gKGRlc3QgKyBpbmRlbnQpLnN1YnN0cigwLCBkZXN0Lmxlbmd0aCArIGluZGVudC5sZW5ndGggLSBiYXNlX2luZGVudC5sZW5ndGgpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGVudCArIHRleHQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY2hhbmdlLnRleHRbMF0gPSBjaGFuZ2UudGV4dFswXS5zdWJzdHIoZGVzdC5sZW5ndGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJjaGFuZ2VzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1dG9TYXZlKCk7XG4gICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBjb2RlX21pcnJvci5pc0NsZWFuKGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSkgPyBcImNsZWFuXCI6IFwibW9kaWZpZWRcIlxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgY21faW5wdXQgPSBjb2RlX21pcnJvci5nZXRJbnB1dEZpZWxkKCk7XG4gICAgICAgICQoY21faW5wdXQpLmFkZENsYXNzKFwibW91c2V0cmFwXCIpOyAvLyBlbmFibGUgaG90a2V5XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtiXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZ29Xb3JkTGVmdFwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrZlwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvV29yZFJpZ2h0XCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtoXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZGVsV29yZEJlZm9yZVwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImRlbFdvcmRBZnRlclwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2QrZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKFxuICAgICAgICAgICAgY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICByZXR1cm4gY29kZV9taXJyb3IuZmluZFdvcmRBdChpLmFuY2hvcik7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK2xcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJzZWxlY3RMaW5lXCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2Qrc2hpZnQrbFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgc2VsZWN0aW9ucyA9IGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCk7XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbnMubGVuZ3RoICE9IDEpIHtcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmc7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBhbmNob3IgPSBzZWxlY3Rpb25zWzBdLmFuY2hvcjtcbiAgICAgICAgICB2YXIgaGVhZCA9IHNlbGVjdGlvbnNbMF0uaGVhZDtcbiAgICAgICAgICB2YXIgbmV3X3NlbGVjdGlvbnMgPSBbXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gYW5jaG9yLmxpbmU7IGkgPD0gaGVhZC5saW5lOyArK2kpIHtcbiAgICAgICAgICAgIG5ld19zZWxlY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBpLFxuICAgICAgICAgICAgICAgIGNoOiBpID09IGFuY2hvci5saW5lID8gYW5jaG9yLmNoIDogMFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgICAgICAgbGluZTogaSxcbiAgICAgICAgICAgICAgICBjaDogaSA9PSBoZWFkLmxpbmUgPyBoZWFkLmNoIDogSW5maW5pdHlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMobmV3X3NlbGVjdGlvbnMpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAvLyBzdGF0dXMgYmFyXG4gICAgICAgIGVkaXRvci5hcHBlbmQoXG4gICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAgICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1lb2xcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmdcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgICB2YXIgdXBkYXRlTW9kZUluZm8gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgbW9kZSA9IGNvZGVfbWlycm9yLmdldE1vZGUoKTtcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbW9kZVwiKS50ZXh0KG1vZGUubmFtZSk7XG4gICAgICAgIH07XG4gICAgICAgIHVwZGF0ZU1vZGVJbmZvKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBpbmRlbnRcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB1cGRhdGVJbmRlbnRJbmZvID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudC5qc1wiKTtcbiAgICAgICAgICB2YXIgaW5kZW50ID0gSW5kZW50KCk7XG4gICAgICAgICAgaW5kZW50LmNoYW5nZWQuYWRkKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlID09IFwiVEFCXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRVbml0XCIsIE51bWJlcih0eXBlLnJlcGxhY2UoXCJTUFwiLCBcIlwiKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXBkYXRlSW5kZW50SW5mbyh0eXBlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbmRlbnQuc2V0KEluZGVudC5kZXRlY3RJbmRlbnRUeXBlKHJlcGx5LmNvbnRlbnQpKVxuICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpbmRlbnQucm90YXRlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBsaW5lIHNlcHJhdG9yXG4gICAgICAgIHZhciBlb2wgPSBzZWxmLmRldGVjdEVvbChyZXBseS5jb250ZW50KTtcbiAgICAgICAgdmFyIGVvbF9uYW1lcyA9IHtcbiAgICAgICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICAgICAgXCJcXG5cIjogXCJMRlwiLFxuICAgICAgICAgIFwiXFxyXFxuXCI6IFwiQ1JMRlwiXG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lb2xcIikudGV4dChlb2xfbmFtZXNbZW9sXSk7XG4gICAgICAgIC8vIGVuY29kaW5nXG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lbmNvZGluZ1wiKS50ZXh0KGVuY29kaW5nKTtcbiAgICAgICAgXG4gICAgICAgIGVkaXRvci5kYXRhKFwicGF0aFwiLCBwYXRoKTtcbiAgICAgICAgZWRpdG9yLmRhdGEoXCJjb2RlX21pcnJvclwiLCBjb2RlX21pcnJvcik7XG4gICAgICAgIC8vIHNhdmVcbiAgICAgICAgdmFyIHNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZ2VuZXJhdGlvbiA9IGNvZGVfbWlycm9yLmNoYW5nZUdlbmVyYXRpb24odHJ1ZSk7XG4gICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogXCIvd3JpdGUucGhwXCIsXG4gICAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgZW5jb2Rpbmc6IGVuY29kaW5nLFxuICAgICAgICAgICAgICBjb250ZW50OiBjb2RlX21pcnJvci5nZXRWYWx1ZSgpLnJlcGxhY2UoL1xcbi9nLCBlb2wpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgICAgaWYgKHJlcGx5ID09IFwib2tcIikge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBnZW5lcmF0aW9uO1xuICAgICAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIFwiY2xlYW5cIik7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLiBcIiArIHJlcGx5LmVycm9yKTtcbiAgICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuXCIpO1xuICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvLyBhdXRvIHNhdmVcbiAgICAgICAgdmFyIGF1dG9TYXZlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIWNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSkge1xuICAgICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgNDAwMCk7XG4gICAgICAgIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgICAgICAgTW91c2V0cmFwKGVkaXRvclswXSkuYmluZChcIm1vZCtzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gbWFya3NcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBtYXJrcyA9IFtdO1xuICAgICAgICAgIE1vdXNldHJhcChlZGl0b3JbMF0pLmJpbmQoXCJtb2QrbVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSBjb2RlX21pcnJvci5nZXRDdXJzb3IoKTtcbiAgICAgICAgICAgIGlmIChtYXJrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdmFyIGxhc3QgPSBtYXJrc1ttYXJrcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgaWYgKGxhc3QubGluZSA9PSBjdXJzb3IubGluZSAmJiBsYXN0LmNoID09IGN1cnNvci5jaCkge1xuICAgICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMobWFya3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7aGVhZDogbSwgYW5jaG9yOiBtfTtcbiAgICAgICAgICAgICAgICB9KSwgbWFya3MubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgbWFya3MgPSBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hcmtzLnB1c2goY3Vyc29yKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KSgpO1xuICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICByZWplY3QoKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gJChcIiNlZGl0b3JzIC5lZGl0b3JcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAkKHRoaXMpLmRhdGEoXCJwYXRoXCIpID09IHBhdGg7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICAkKFwiI2VkaXRvcnMgLmVkaXRvci5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG4gIHZhciBmb3VuZCA9IHRoaXMuZ2V0KHBhdGgpO1xuICBpZiAoZm91bmQubGVuZ3RoKSB7XG4gICAgZm91bmQuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gICAgZm91bmQuZGF0YShcImNvZGVfbWlycm9yXCIpLmZvY3VzKCk7XG4gICAgZm91bmQuZGF0YShcImNvZGVfbWlycm9yXCIpLnJlZnJlc2goKTtcbiAgfVxufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldEFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLmRhdGEoXCJwYXRoXCIpO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLmdldChwYXRoKS5yZW1vdmUoKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5kZXRlY3RFb2wgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXFxuXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXFxuXCI7XG4gIH1cbiAgaWYgKGNvbnRlbnQubWF0Y2goXCJcXHJcIikpIHtcbiAgICByZXR1cm4gXCJcXHJcIjtcbiAgfVxuICByZXR1cm4gXCJcXG5cIjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEVkaXRvck1hbmFnZXIoKTtcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuXG52YXIgZ2V0RmlsZUVsZW1lbnQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAkKFwiI2ZpbGVzIC5maWxlLWl0ZW1cIikuZmlsdGVyKGZ1bmN0aW9uKGlkeCwgaXRlbSkge1xuICAgIHJldHVybiAkKGl0ZW0pLmRhdGEoXCJwYXRoXCIpID09IHBhdGhcbiAgfSlcbn1cblxudmFyIEZpbGVNYW5hZ2VyVmlldyA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gIHZhciB2aWV3ID0ge1xuICAgIGFkZEl0ZW06IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIilcbiAgICAgIHZhciBuYW1lID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCIuKi9cIiksIFwiXCIpXG4gICAgICAkKFwiPGRpdj5cIikuZGF0YShcInBhdGhcIiwgcGF0aCkuYWRkQ2xhc3MoXCJmaWxlLWl0ZW1cIikuYXBwZW5kKFxuICAgICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJkaXJcIikudGV4dChkaXIpLFxuICAgICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAgICQoJzxkaXYgY2xhc3M9XCJzdGF0dXMgY2xlYW5cIj4nKVxuICAgICAgKS5hcHBlbmRUbyhcIiNmaWxlc1wiKVxuICAgIH0sXG4gICAgXG4gICAgcmVtb3ZlSXRlbTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgZ2V0RmlsZUVsZW1lbnQocGF0aCkucmVtb3ZlKClcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlSXRlbTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJChcIiNmaWxlcyAuZmlsZS1pdGVtLmFjdGl2ZVwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBnZXRGaWxlRWxlbWVudChwYXRoKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlU3RhdHVzOiBmdW5jdGlvbihwYXRoLCBzdGF0dXMpIHtcbiAgICAgIGdldEZpbGVFbGVtZW50KHBhdGgpXG4gICAgICAgIC5maW5kKFwiLnN0YXR1c1wiKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoXCJjbGVhbiBlcnJvciBtb2RpZmllZFwiKVxuICAgICAgICAuYWRkQ2xhc3Moc3RhdHVzKVxuICAgIH0sXG4gIH1cbiAgXG4gIG1vZGVsLm9wZW5lZC5hZGQodmlldy5hZGRJdGVtKVxuICBtb2RlbC5jbG9zZWQuYWRkKHZpZXcucmVtb3ZlSXRlbSlcbiAgbW9kZWwuYWN0aXZhdGVkLmFkZCh2aWV3LmFjdGl2YXRlSXRlbSlcbiAgbW9kZWwuc3RhdHVzX2NoYW5nZWQuYWRkKHZpZXcudXBkYXRlU3RhdHVzKVxuICBcbiAgJChcIiNmaWxlc1wiKS5vbihcImNsaWNrXCIsIFwiLmZpbGUtaXRlbVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgbW9kZWwuYWN0aXZhdGUoJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJwYXRoXCIpKVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVNYW5hZ2VyVmlld1xuIiwidmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIEZpbGVNYW5hZ2VyVmlldyA9IHJlcXVpcmUoXCIuL2ZpbGUtdmlldy5qc1wiKVxudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpXG5cbnZhciBGaWxlTWFuYWdlciA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgb3BlbmVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBjbG9zZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGFjdGl2YXRlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgc3RhdHVzX2NoYW5nZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGFjdGl2ZTogbnVsbCwgLy8gcGF0aCBvZiBhY3RpdmUgZmlsZVxuICAgIGZpbGVzOiBbXSxcbiAgICBcbiAgICBnZXRGaWxlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXy5wbHVjayhtb2RlbC5maWxlcywgXCJwYXRoXCIpXG4gICAgfSxcbiAgICBcbiAgICBvcGVuOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBcIlRoZSBwYXRoIGlzIG51bGxcIlxuICAgICAgfVxuICAgICAgLy8gdHJ5IHRvIGFjdGl2YXRlIGFscmVhZHkgb3BlbmVkIGZpbGVzXG4gICAgICBpZiAobW9kZWwuYWN0aXZhdGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBlZGl0b3JfbWFuYWdlci5vcGVuKHBhdGgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGVsLmZpbGVzLnB1c2goe1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgc3RhdHVzOiBcImNsZWFuXCIsXG4gICAgICAgIH0pXG4gICAgICAgIG1vZGVsLm9wZW5lZC5kaXNwYXRjaChwYXRoKVxuICAgICAgICBtb2RlbC5hY3RpdmF0ZShwYXRoKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGdldEFjdGl2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuYWN0aXZlXG4gICAgfSxcbiAgICBcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgICAgaWYgKHBhdGggIT09IG51bGwgJiYgbW9kZWwuaW5kZXhPZihwYXRoKSA9PSAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIGZpbmRlci5zZXRQYXRoKHBhdGgpXG4gICAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShwYXRoKVxuICAgICAgbW9kZWwuYWN0aXZlID0gcGF0aFxuICAgICAgbW9kZWwuYWN0aXZhdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0sXG4gICAgXG4gICAgbmV4dEZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZSh0cnVlKVxuICAgIH0sXG4gICAgXG4gICAgcHJldkZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZShmYWxzZSlcbiAgICB9LFxuICAgIFxuICAgIHJvdGF0ZUZpbGU6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5maWxlcy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHhcbiAgICAgIGlmIChtb2RlbC5hY3RpdmUgPT09IG51bGwpIHtcbiAgICAgICAgaWR4ID0gbmV4dCA/IDAgOiBtb2RlbC5maWxlcy5sZW5ndGggLSAxXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWR4ID0gbW9kZWwuaW5kZXhPZihtb2RlbC5hY3RpdmUpXG4gICAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgICBpZHggPSAoaWR4ICsgbW9kZWwuZmlsZXMubGVuZ3RoKSAlIG1vZGVsLmZpbGVzLmxlbmd0aFxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZhdGUobW9kZWwuZmlsZXNbaWR4XS5wYXRoKVxuICAgIH0sXG4gICAgXG4gICAgY2xvc2U6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHZhciBpZHggPSBtb2RlbC5pbmRleE9mKHBhdGgpXG4gICAgICBpZiAoaWR4ID09IC0xKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICBpZiAobW9kZWwuZmlsZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBtb2RlbC5hY3RpdmF0ZShudWxsKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1vZGVsLnByZXZGaWxlKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWRpdG9yX21hbmFnZXIuY2xvc2UocGF0aClcbiAgICAgIG1vZGVsLmZpbGVzLnNwbGljZShpZHgsIDEpXG4gICAgICBtb2RlbC5jbG9zZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHJlbG9hZDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuY2xvc2UocGF0aClcbiAgICAgIG1vZGVsLm9wZW4ocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGluZGV4T2Y6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHJldHVybiBtb2RlbC5nZXRGaWxlcygpLmluZGV4T2YocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZVN0YXR1czogZnVuY3Rpb24ocGF0aCwgc3RhdHVzKSB7XG4gICAgICBtb2RlbC5pbmRleE9mKHBhdGgpLnN0YXR1cyA9IHN0YXR1c1xuICAgICAgbW9kZWwuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgc3RhdHVzKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci5zZWxlY3RlZC5hZGQobW9kZWwub3BlbilcbiAgZWRpdG9yX21hbmFnZXIuc3RhdHVzX2NoYW5nZWQuYWRkKG1vZGVsLnVwZGF0ZVN0YXR1cylcbiAgXG4gIHZhciB2aWV3ID0gRmlsZU1hbmFnZXJWaWV3KG1vZGVsKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZU1hbmFnZXJcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuXG52YXIgRmluZGVyU3VnZ2VzdFZpZXcgPSBmdW5jdGlvbihtb2RlbCkge1xuICB2YXIgbGlzdCA9ICQoXCIjZmluZGVyLWl0ZW1zXCIpXG4gIFxuICB2YXIgdmlldyA9IHtcbiAgICB1cGRhdGVJdGVtczogZnVuY3Rpb24oaXRlbXMpIHtcbiAgICAgIGxpc3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIikuZW1wdHkoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxICYmIGl0ZW1zWzBdID09IG1vZGVsLmdldEN1cnNvcigpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIG5hbWVfcnggPSBuZXcgUmVnRXhwKFwiLyhbXi9dKi8/KSRcIilcbiAgICAgIGxpc3QuYXBwZW5kKGl0ZW1zLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHZhciBuYW1lID0gbmFtZV9yeC5leGVjKGl0ZW0pWzFdXG4gICAgICAgIHJldHVybiAkKFwiPGE+XCIpLnRleHQobmFtZSkuZGF0YShcInBhdGhcIiwgaXRlbSlcbiAgICAgIH0pKVxuICAgICAgbGlzdC5zY3JvbGxUb3AoMCkuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUN1cnNvcjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbGlzdC5maW5kKFwiYS5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBhID0gbGlzdC5maW5kKFwiYVwiKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkKHRoaXMpLmRhdGEoXCJwYXRoXCIpID09IHBhdGhcbiAgICAgIH0pXG4gICAgICBpZiAoYS5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGEuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKVxuXG4gICAgICAvLyBzY3JvbGwgdGhlIGxpc3QgdG8gbWFrZSB0aGUgc2VsZWN0ZWQgaXRlbSB2aXNpYmxlXG4gICAgICB2YXIgc2Nyb2xsSW50b1ZpZXcgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRhcmdldC5oZWlnaHQoKVxuICAgICAgICB2YXIgdG9wID0gdGFyZ2V0LnByZXZBbGwoKS5sZW5ndGggKiBoZWlnaHRcbiAgICAgICAgdmFyIGJvdHRvbSA9IHRvcCArIGhlaWdodFxuICAgICAgICB2YXIgdmlld19oZWlnaHQgPSBsaXN0LmlubmVySGVpZ2h0KClcbiAgICAgICAgaWYgKHRvcCAtIGxpc3Quc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICAgICAgbGlzdC5zY3JvbGxUb3AodG9wKVxuICAgICAgICB9XG4gICAgICAgIGlmIChib3R0b20gLSBsaXN0LnNjcm9sbFRvcCgpID4gdmlld19oZWlnaHQpIHtcbiAgICAgICAgICBsaXN0LnNjcm9sbFRvcChib3R0b20gLSB2aWV3X2hlaWdodClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2Nyb2xsSW50b1ZpZXcoYSlcbiAgICB9XG4gIH1cbiAgXG4gIG1vZGVsLml0ZW1zX2NoYW5nZWQuYWRkKHZpZXcudXBkYXRlSXRlbXMpXG4gIG1vZGVsLmN1cnNvcl9tb3ZlZC5hZGQodmlldy51cGRhdGVDdXJzb3IpXG4gIFxuICAvLyB3aGVuIGl0ZW0gd2FzIHNlbGVjdGVkXG4gIGxpc3Qub24oXCJjbGlja1wiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIG1vZGVsLnNlbGVjdCgkKGUudGFyZ2V0KS5kYXRhKFwicGF0aFwiKSlcbiAgfSlcbiAgXG4gIC8vIHByZXZlbnQgZnJvbSBsb29zaW5nIGZvY3VzXG4gIGxpc3Qub24oXCJtb3VzZWRvd25cIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgfSlcbiAgXG4gIHJldHVybiB2aWV3XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFZpZXdcbiIsInZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3Qtdmlldy5qc1wiKVxuXG52YXIgRmluZGVyU3VnZ2VzdCA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgaXRlbXM6IFtdLFxuICAgIGN1cnNvcjogbnVsbCwgLy8gaGlnaGxpZ2h0ZWQgaXRlbVxuICAgIFxuICAgIGl0ZW1zX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBjdXJzb3JfbW92ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgdXJsOiBcIi9maW5kZXIucGhwXCIsXG4gICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICB9LFxuICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImZhaWxlZCB0byBmZXRjaCBzdWdnZXN0IGZvciB0aGUgcGF0aDogXCIgKyBwYXRoKVxuICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICBtb2RlbC5zZXRJdGVtcyhyZXBseS5pdGVtcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgIHJldHVybiByZXBseS5iYXNlICsgaVxuICAgICAgICB9KSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBzZXRJdGVtczogZnVuY3Rpb24oaXRlbXMpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihudWxsKVxuICAgICAgbW9kZWwuaXRlbXMgPSBpdGVtc1xuICAgICAgbW9kZWwuaXRlbXNfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC5pdGVtcylcbiAgICB9LFxuICAgIFxuICAgIGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5pdGVtc1xuICAgIH0sXG4gICAgXG4gICAgZ2V0Q3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5jdXJzb3JcbiAgICB9LFxuICAgIFxuICAgIHNldEN1cnNvcjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmN1cnNvcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmN1cnNvciA9IHBhdGhcbiAgICAgIG1vZGVsLmN1cnNvcl9tb3ZlZC5kaXNwYXRjaChtb2RlbC5jdXJzb3IpXG4gICAgfSxcbiAgICBcbiAgICBtb3ZlQ3Vyc29yOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuY3Vyc29yID09PSBudWxsKSB7XG4gICAgICAgIGlmIChtb2RlbC5pdGVtcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1swXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHggPSBtb2RlbC5pdGVtcy5pbmRleE9mKG1vZGVsLmN1cnNvcilcbiAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgaWR4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW9kZWwuaXRlbXMubGVuZ3RoIC0gMSwgaWR4KSlcbiAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1tpZHhdKVxuICAgIH0sXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IocGF0aClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICBtb2RlbC51cGRhdGUoZmluZGVyLmdldFBhdGgoKSlcbiAgICB9XG4gIH0pXG4gIFxuICBmaW5kZXIucGF0aF9jaGFuZ2VkLmFkZChfLmRlYm91bmNlKG1vZGVsLnVwZGF0ZSwgMjUwKSlcbiAgXG4gIHZhciB2aWV3ID0gRmluZGVyU3VnZ2VzdFZpZXcobW9kZWwpXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG52YXIgRmFsc2UgPSByZXF1aXJlKFwiLi9yZXR1cm4tZmFsc2UuanNcIilcbnZhciBJbnB1dFdhdGNoZXIgPSByZXF1aXJlKFwiLi9pbnB1dC13YXRjaGVyLmpzXCIpXG5cbnZhciBGaW5kZXJWaWV3ID0gZnVuY3Rpb24obW9kZWwsIHN1Z2dlc3QpIHtcbiAgdmFyIHBhdGhfaW5wdXQgPSAkKFwiI2ZpbmRlci1wYXRoXCIpLnZhbChcIi9cIilcbiAgXG4gIHZhciBwYXRoX3dhdGNoZXIgPSBJbnB1dFdhdGNoZXIocGF0aF9pbnB1dCwgNTApXG4gIHBhdGhfd2F0Y2hlci5jaGFuZ2VkLmFkZChtb2RlbC5zZXRQYXRoKVxuICBcbiAgdmFyIHZpZXcgPSB7XG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICAkKFwiI2ZpbmRlclwiKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgICAgcGF0aF9pbnB1dC5mb2N1cygpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RhcnQoKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICAkKFwiI2ZpbmRlclwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgICAgcGF0aF93YXRjaGVyLnN0b3AoKVxuICAgIH0sXG4gIH1cbiAgXG4gIC8vIGhpZGUgb24gYmx1clxuICBwYXRoX2lucHV0LmJsdXIobW9kZWwuaGlkZSgpKVxuICBcbiAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIHZpZXcuc2hvdygpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmlldy5oaWRlKClcbiAgICB9XG4gIH0pXG4gIFxuICBtb2RlbC5wYXRoX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBwYXRoX2lucHV0LnZhbChwYXRoKVxuICB9KVxuICBcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJlbnRlclwiLCBGYWxzZShtb2RlbC5lbnRlcikpXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwidGFiXCIsIEZhbHNlKG1vZGVsLnRhYikpXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZXNjXCIsIEZhbHNlKG1vZGVsLmhpZGUpKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImRvd25cIiwgRmFsc2UoZnVuY3Rpb24oKSB7XG4gICAgc3VnZ2VzdC5tb3ZlQ3Vyc29yKHRydWUpXG4gIH0pKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcInVwXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgIHN1Z2dlc3QubW92ZUN1cnNvcihmYWxzZSlcbiAgfSkpXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwibW9kK3VcIiwgRmFsc2UoXG4gICAgbW9kZWwuZ29Ub1BhcmVudERpcmVjdG9yeVxuICApKVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJWaWV3XG4iLCJ2YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgZWRpdG9yX21hbmFnZXIgPSByZXF1aXJlKFwiLi9lZGl0b3IuanNcIilcbnZhciBGaW5kZXJWaWV3ID0gcmVxdWlyZShcIi4vZmluZGVyLXZpZXcuanNcIilcbnZhciBGaW5kZXJTdWdnZXN0ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3QuanNcIilcblxudmFyIEZpbmRlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBwYXRoX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICB2aXNpYmlsaXR5X2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBwYXRoOiBcIlwiLFxuICAgIHZpc2libGU6IGZhbHNlLFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChwYXRoKVxuICAgICAgaWYgKHBhdGguc3Vic3RyKC0xKSA9PSBcIi9cIikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmhpZGUoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IHRydWVcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gZmFsc2VcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuICAgICAgZWRpdG9yX21hbmFnZXIuYWN0aXZhdGUoZWRpdG9yX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgfSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5wYXRoXG4gICAgfSxcbiAgICBcbiAgICBzZXRQYXRoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5wYXRoID0gcGF0aFxuICAgICAgbW9kZWwucGF0aF9jaGFuZ2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBnb1RvUGFyZW50RGlyZWN0b3J5OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgoXG4gICAgICAgIG1vZGVsLnBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSovPyRcIiksIFwiXCIpXG4gICAgICApXG4gICAgfSxcbiAgICBcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGF0aCA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICAgIG1vZGVsLnNlbGVjdChwYXRoID8gcGF0aCA6IG1vZGVsLnBhdGgpXG4gICAgfSxcbiAgICBcbiAgICB0YWI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgbW9kZWwuc2V0UGF0aChjdXJzb3IpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGl0ZW1zID0gc3VnZ2VzdC5nZXRJdGVtcygpXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgbW9kZWwuc2V0UGF0aChpdGVtc1swXSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBzdWdnZXN0LnVwZGF0ZShtb2RlbC5wYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIHZhciBzdWdnZXN0ID0gRmluZGVyU3VnZ2VzdChtb2RlbClcbiAgc3VnZ2VzdC5zZWxlY3RlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIG1vZGVsLnNlbGVjdChwYXRoKVxuICB9KVxuICBcbiAgdmFyIHZpZXcgPSBGaW5kZXJWaWV3KG1vZGVsLCBzdWdnZXN0KVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyXG4iLCJcInVzZSBzdHJpY3RcIlxuXG52YXIgUm90YXRlID0gcmVxdWlyZShcIi4vcm90YXRlLmpzXCIpXG5cbnZhciBJbmRlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHJldHVybiBSb3RhdGUoW1wiNFNQXCIsIFwiMlNQXCIsIFwiVEFCXCJdLCB0eXBlKVxufVxuXG5JbmRlbnQuZGV0ZWN0SW5kZW50VHlwZSA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgaWYgKGNvbnRlbnQubWF0Y2goL1tcXHJcXG5dK1xcdC8pKSB7XG4gICAgcmV0dXJuIFwiVEFCXCJcbiAgfVxuICB2YXIgbGluZXMgPSBjb250ZW50LnNwbGl0KC9bXFxyXFxuXSsvKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGluZGVudCA9IGxpbmVzW2ldLnJlcGxhY2UoL14oICopLiovLCBcIiQxXCIpXG4gICAgaWYgKGluZGVudC5sZW5ndGggPT0gMikge1xuICAgICAgcmV0dXJuIFwiMlNQXCJcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFwiNFNQXCJcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbmRlbnRcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgSW5wdXRXYXRjaGVyID0gZnVuY3Rpb24oaW5wdXQsIGludGVydmFsKSB7XG4gIGlucHV0ID0gJChpbnB1dClcbiAgXG4gIHZhciBtb2RlbCA9IHtcbiAgICBjaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgaW5wdXQ6IGlucHV0LFxuICAgIGludGVydmFsOiBpbnRlcnZhbCxcbiAgICBsYXN0X3ZhbHVlOiBpbnB1dC52YWwoKSxcbiAgICB0aW1lcjogbnVsbCxcbiAgICBcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zdG9wKClcbiAgICAgIG1vZGVsLnRpbWVyID0gc2V0SW50ZXJ2YWwobW9kZWwuY2hlY2ssIG1vZGVsLmludGVydmFsKVxuICAgIH0sXG4gICAgXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgICBjbGVhckludGVydmFsKG1vZGVsLnRpbWVyKVxuICAgICAgbW9kZWwudGltZXIgPSBudWxsXG4gICAgfSxcbiAgICBcbiAgICBjaGVjazogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3VycmVudCA9IG1vZGVsLmlucHV0LnZhbCgpXG4gICAgICBpZiAoY3VycmVudCA9PSBtb2RlbC5sYXN0X3ZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuY2hhbmdlZC5kaXNwYXRjaChjdXJyZW50LCBtb2RlbC5sYXN0X3ZhbHVlKVxuICAgICAgbW9kZWwubGFzdF92YWx1ZSA9IGN1cnJlbnRcbiAgICB9LFxuICAgIFxuICAgIGtleURvd246IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKG1vZGVsLnRpbWVyKSB7XG4gICAgICAgIG1vZGVsLmNoZWNrKClcbiAgICAgIH1cbiAgICB9LFxuICB9XG4gIFxuICBpbnB1dC5rZXlkb3duKG1vZGVsLmtleURvd24pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dFdhdGNoZXJcbiIsInZhciByZXR1cm5GYWxzZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmV0dXJuRmFsc2VcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBzaWduYWxzID0gcmVxdWlyZShcInNpZ25hbHNcIilcblxudmFyIFJvdGF0ZSA9IGZ1bmN0aW9uKHZhbHVlcywgdmFsdWUpIHtcbiAgdmFyIGlzVmFsaWRWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2YWx1ZXMuaW5kZXhPZih2KSAhPSAtMVxuICB9XG4gIFxuICB2YXIgY2hlY2tWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoIWlzVmFsaWRWYWx1ZSh2KSkge1xuICAgICAgdGhyb3cgXCJpbnZhbGlkIHZhbHVlOiBcIiArIHZcbiAgICB9XG4gIH1cbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IG51bGxcbiAgfVxuICBjaGVja1ZhbHVlKHZhbHVlKVxuICBcbiAgdmFyIHJvdGF0ZSA9IHtcbiAgICBjaGFuZ2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBcbiAgICBnZXRWYWx1ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlc1xuICAgIH0sXG4gICAgXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH0sXG4gICAgXG4gICAgc2V0OiBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICAgIGlmIChuZXdfdmFsdWUgPT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBjaGVja1ZhbHVlKG5ld192YWx1ZSlcbiAgICAgIHZhbHVlID0gbmV3X3ZhbHVlXG4gICAgICByb3RhdGUuY2hhbmdlZC5kaXNwYXRjaCh2YWx1ZSlcbiAgICB9LFxuICAgIFxuICAgIHJvdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gdmFsdWVzLmluZGV4T2YodmFsdWUpXG4gICAgICBpZHggPSAoaWR4ICsgMSkgJSB2YWx1ZXMubGVuZ3RoXG4gICAgICByb3RhdGUuc2V0KHZhbHVlc1tpZHhdKVxuICAgIH1cbiAgfVxuICByZXR1cm4gcm90YXRlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUm90YXRlXG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpO1xuXG5Db2RlTWlycm9yLmRlZmluZVNpbXBsZU1vZGUoXCJ0ZXh0XCIsIHtcbiAgc3RhcnQ6IFtdLFxuICBjb21tZW50OiBbXSxcbiAgbWV0YToge31cbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMucnVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG4gIHZhciBmaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXIuanNcIikoKVxuICB2YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKShmaW5kZXIpXG4gIFxuICB2YXIgc2F2ZUZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpbGVzID0gZmlsZV9tYW5hZ2VyLmdldEZpbGVzKClcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm9wZW4tZmlsZXNcIiwgSlNPTi5zdHJpbmdpZnkoZmlsZXMpKVxuICB9XG4gIHZhciBsb2FkRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm9wZW4tZmlsZXNcIikgfHwgXCJbXVwiKVxuICB9XG4gIGxvYWRGaWxlTGlzdCgpLmZvckVhY2goZnVuY3Rpb24ocGF0aCkge1xuICAgIGZpbGVfbWFuYWdlci5vcGVuKHBhdGgpXG4gIH0pXG4gIFxuICBmaWxlX21hbmFnZXIub3BlbmVkLmFkZChzYXZlRmlsZUxpc3QpXG4gIGZpbGVfbWFuYWdlci5jbG9zZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgXG4gIC8vIHNob3J0Y3V0IGtleXNcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK1wiLCBcIm1vZCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIubmV4dEZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3NoaWZ0K1wiLCBcIm1vZCtzaGlmdCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIucHJldkZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3dcIiwgXCJtb2Qra1wiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLmNsb3NlKGZpbGVfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIucmVsb2FkKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zaG93KClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG59XG4iXX0=
