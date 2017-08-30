require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var $ = require("jquery");
var _ = require("underscore");
var Signal = require("signals").Signal
var CodeMirror = require("codemirror");
require("codemirror-addon");
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
          code_mirror.setSelections(
            code_mirror.listSelections().map(function(i) {
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
            })
          );
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

},{"./indent.js":7,"./text-mode.js":11,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","jquery":"jquery","signals":"signals","underscore":"underscore"}],2:[function(require,module,exports){
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

},{"jquery":"jquery"}],3:[function(require,module,exports){
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

},{"./editor.js":1,"./file-view.js":2,"signals":"signals","underscore":"underscore"}],4:[function(require,module,exports){
var $ = require("jquery")
var _ = require("underscore")
var Signal = require("signals").Signal

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
  
  // view
  var list = $("#finder-items")
  model.items_changed.add(function(items) {
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
  })
  
  model.cursor_moved.add(function(path) {
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
  })
  
  // when item was selected
  list.on("click", "a", function(e) {
    e.preventDefault()
    model.select($(e.target).data("path"))
  })
  // prevent from loosing focus
  list.on("mousedown", "a", function(e) {
    e.preventDefault()
  })
  
  return model
}

module.exports = FinderSuggest

},{"jquery":"jquery","signals":"signals","underscore":"underscore"}],5:[function(require,module,exports){
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

},{"./input-watcher.js":8,"./return-false.js":9,"jquery":"jquery","mousetrap":"mousetrap"}],6:[function(require,module,exports){
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

},{"./editor.js":1,"./finder-suggest.js":4,"./finder-view.js":5,"signals":"signals"}],7:[function(require,module,exports){
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

},{"./rotate.js":10}],8:[function(require,module,exports){
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

},{"jquery":"jquery","signals":"signals"}],9:[function(require,module,exports){
var returnFalse = function(func) {
  return function() {
    func.apply(this, arguments)
    return false
  }
}

module.exports = returnFalse

},{}],10:[function(require,module,exports){
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

},{"signals":"signals"}],11:[function(require,module,exports){
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

},{"./file.js":3,"./finder.js":6,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9maWxlLXZpZXcuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXItdmlldy5qcyIsImpzL2ZpbmRlci5qcyIsImpzL2luZGVudC5qcyIsImpzL2lucHV0LXdhdGNoZXIuanMiLCJqcy9yZXR1cm4tZmFsc2UuanMiLCJqcy9yb3RhdGUuanMiLCJqcy90ZXh0LW1vZGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpO1xucmVxdWlyZShcImNvZGVtaXJyb3ItYWRkb25cIik7XG5yZXF1aXJlKFwiLi90ZXh0LW1vZGUuanNcIik7XG5cbi8vIEVkaXRvck1hbmFnZXJcbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc3RhdHVzX2NoYW5nZWQgPSBuZXcgU2lnbmFsKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgZGF0YToge1xuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSl7XG4gICAgICBpZiAocmVwbHkuZXJyb3IpIHtcbiAgICAgICAgYWxlcnQocmVwbHkuZXJyb3IpO1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGVuY29kaW5nID0gcmVwbHkuZW5jb2Rpbmc7XG4gICAgICB2YXIgZWRpdG9yID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZWRpdG9yXCIpLmFwcGVuZFRvKFwiI2VkaXRvcnNcIik7XG4gICAgICB2YXIgbW9kZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIik7XG4gICAgICAgIHZhciBtb2RlID0ge1xuICAgICAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICAgICAgdGFnOiBcInBocFwiLFxuICAgICAgICB9W2V4dGVuc2lvbl07XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlLm1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwidGV4dFwiO1xuICAgICAgfSkoKTtcbiAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvZGVfbWlycm9yID0gQ29kZU1pcnJvcihlZGl0b3JbMF0sIHtcbiAgICAgICAgICB2YWx1ZTogcmVwbHkuY29udGVudCxcbiAgICAgICAgICBsaW5lTnVtYmVyczogdHJ1ZSxcbiAgICAgICAgICB0YWJTaXplOiA0LFxuICAgICAgICAgIHNob3dDdXJzb3JXaGVuU2VsZWN0aW5nOiB0cnVlLFxuICAgICAgICAgIGF1dG9DbG9zZUJyYWNrZXRzOiB0cnVlLFxuICAgICAgICAgIG1hdGNoQnJhY2tldHM6IHRydWUsXG4gICAgICAgICAgbWF0Y2hUYWdzOiB0cnVlLFxuICAgICAgICAgIGF1dG9DbG9zZVRhZ3M6IHRydWUsXG4gICAgICAgICAgc3R5bGVBY3RpdmVMaW5lOiB0cnVlLFxuICAgICAgICAgIHN0eWxlU2VsZWN0ZWRUZXh0OiB0cnVlLFxuICAgICAgICAgIG1vZGU6IG1vZGUsXG4gICAgICAgICAgZHJhZ0Ryb3A6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKTtcbiAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiZXh0cmFLZXlzXCIsIHtcbiAgICAgICAgICBcIkN0cmwtU3BhY2VcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICAgICAgICBcIkN0cmwtVVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgICAgICAgIFwiQ3RybC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgICAgICAgIFwiQ21kLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgICAgICAgVGFiOiBcImluZGVudEF1dG9cIixcbiAgICAgICAgICBcIkN0cmwtRFwiOiBmYWxzZSxcbiAgICAgICAgICBcIkNtZC1EXCI6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwic3R5bGVBY3RpdmVMaW5lXCIsIHtub25FbXB0eTogdHJ1ZX0pO1xuICAgICAgICAvLyBtYWludGFpbiBpbmRlbnRhdGlvbiBvbiBwYXN0ZVxuICAgICAgICBjb2RlX21pcnJvci5vbihcImJlZm9yZUNoYW5nZVwiLCBmdW5jdGlvbihjbSwgY2hhbmdlKSB7XG4gICAgICAgICAgaWYgKGNoYW5nZS5vcmlnaW4gIT0gXCJwYXN0ZVwiKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChDb2RlTWlycm9yLmNtcFBvcyhjaGFuZ2UuZnJvbSwgY2hhbmdlLnRvKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgaW5zZXJ0aW9uIHBvaW50IGlzIGF0IHRoZSBlbmQgb2YgdGhlIGxpbmVcbiAgICAgICAgICB2YXIgZGVzdCA9IGNtLmdldExpbmUoY2hhbmdlLmZyb20ubGluZSk7XG4gICAgICAgICAgaWYgKGRlc3QubGVuZ3RoICE9IGNoYW5nZS5mcm9tLmNoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBsaW5lIGNvbnNpc3RzIG9mIG9ubHkgd2hpdGUgc3BhY2VzXG4gICAgICAgICAgaWYgKGRlc3QubWF0Y2goL1teIFxcdF0vKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyByZW1vdmUgdGhlIGxhc3QgZW1wdHkgbGluZVxuICAgICAgICAgIGlmIChjaGFuZ2UudGV4dFtjaGFuZ2UudGV4dC5sZW5ndGggLSAxXSA9PSBcIlwiKSB7XG4gICAgICAgICAgICBjaGFuZ2UudGV4dC5wb3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGJhc2VfaW5kZW50ID0gY2hhbmdlLnRleHRbMF0ubWF0Y2goL15bIFxcdF0qLylbMF07XG4gICAgICAgICAgY2hhbmdlLnRleHQgPSBjaGFuZ2UudGV4dC5tYXAoZnVuY3Rpb24obGluZSwgaSkge1xuICAgICAgICAgICAgbGluZSA9IGxpbmUubWF0Y2goL14oWyBcXHRdKikoLiopLyk7XG4gICAgICAgICAgICB2YXIgaW5kZW50ID0gbGluZVsxXTtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gbGluZVsyXTtcbiAgICAgICAgICAgIGluZGVudCA9IChkZXN0ICsgaW5kZW50KS5zdWJzdHIoMCwgZGVzdC5sZW5ndGggKyBpbmRlbnQubGVuZ3RoIC0gYmFzZV9pbmRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgIHJldHVybiBpbmRlbnQgKyB0ZXh0O1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNoYW5nZS50ZXh0WzBdID0gY2hhbmdlLnRleHRbMF0uc3Vic3RyKGRlc3QubGVuZ3RoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvZGVfbWlycm9yLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdXRvU2F2ZSgpO1xuICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2goXG4gICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgY29kZV9taXJyb3IuaXNDbGVhbihjb2RlX21pcnJvci5sYXN0X3NhdmUpID8gXCJjbGVhblwiOiBcIm1vZGlmaWVkXCJcbiAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGNtX2lucHV0ID0gY29kZV9taXJyb3IuZ2V0SW5wdXRGaWVsZCgpO1xuICAgICAgICAkKGNtX2lucHV0KS5hZGRDbGFzcyhcIm1vdXNldHJhcFwiKTsgLy8gZW5hYmxlIGhvdGtleVxuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrYlwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvV29yZExlZnRcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2ZcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJnb1dvcmRSaWdodFwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQraFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImRlbFdvcmRCZWZvcmVcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJkZWxXb3JkQWZ0ZXJcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK2RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvZGVfbWlycm9yLmZpbmRXb3JkQXQoaS5hbmNob3IpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMoXG4gICAgICAgICAgICBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgICAgICAgICBsaW5lOiBpLmhlYWQubGluZSArIDEsXG4gICAgICAgICAgICAgICAgICBjaDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaGVhZDoge1xuICAgICAgICAgICAgICAgICAgbGluZTogaS5hbmNob3IubGluZSxcbiAgICAgICAgICAgICAgICAgIGNoOiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2Qrc2hpZnQrbFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgc2VsZWN0aW9ucyA9IGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCk7XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbnMubGVuZ3RoICE9IDEpIHtcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmc7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBhbmNob3IgPSBzZWxlY3Rpb25zWzBdLmFuY2hvcjtcbiAgICAgICAgICB2YXIgaGVhZCA9IHNlbGVjdGlvbnNbMF0uaGVhZDtcbiAgICAgICAgICB2YXIgbmV3X3NlbGVjdGlvbnMgPSBbXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gYW5jaG9yLmxpbmU7IGkgPD0gaGVhZC5saW5lOyArK2kpIHtcbiAgICAgICAgICAgIG5ld19zZWxlY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBpLFxuICAgICAgICAgICAgICAgIGNoOiBpID09IGFuY2hvci5saW5lID8gYW5jaG9yLmNoIDogMFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgICAgICAgbGluZTogaSxcbiAgICAgICAgICAgICAgICBjaDogaSA9PSBoZWFkLmxpbmUgPyBoZWFkLmNoIDogSW5maW5pdHlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMobmV3X3NlbGVjdGlvbnMpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAvLyBzdGF0dXMgYmFyXG4gICAgICAgIGVkaXRvci5hcHBlbmQoXG4gICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAgICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1lb2xcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmdcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgICB2YXIgdXBkYXRlTW9kZUluZm8gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgbW9kZSA9IGNvZGVfbWlycm9yLmdldE1vZGUoKTtcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbW9kZVwiKS50ZXh0KG1vZGUubmFtZSk7XG4gICAgICAgIH07XG4gICAgICAgIHVwZGF0ZU1vZGVJbmZvKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBpbmRlbnRcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB1cGRhdGVJbmRlbnRJbmZvID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudC5qc1wiKTtcbiAgICAgICAgICB2YXIgaW5kZW50ID0gSW5kZW50KCk7XG4gICAgICAgICAgaW5kZW50LmNoYW5nZWQuYWRkKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlID09IFwiVEFCXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRVbml0XCIsIE51bWJlcih0eXBlLnJlcGxhY2UoXCJTUFwiLCBcIlwiKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXBkYXRlSW5kZW50SW5mbyh0eXBlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbmRlbnQuc2V0KEluZGVudC5kZXRlY3RJbmRlbnRUeXBlKHJlcGx5LmNvbnRlbnQpKVxuICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpbmRlbnQucm90YXRlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBsaW5lIHNlcHJhdG9yXG4gICAgICAgIHZhciBlb2wgPSBzZWxmLmRldGVjdEVvbChyZXBseS5jb250ZW50KTtcbiAgICAgICAgdmFyIGVvbF9uYW1lcyA9IHtcbiAgICAgICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICAgICAgXCJcXG5cIjogXCJMRlwiLFxuICAgICAgICAgIFwiXFxyXFxuXCI6IFwiQ1JMRlwiXG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lb2xcIikudGV4dChlb2xfbmFtZXNbZW9sXSk7XG4gICAgICAgIC8vIGVuY29kaW5nXG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lbmNvZGluZ1wiKS50ZXh0KGVuY29kaW5nKTtcbiAgICAgICAgXG4gICAgICAgIGVkaXRvci5kYXRhKFwicGF0aFwiLCBwYXRoKTtcbiAgICAgICAgZWRpdG9yLmRhdGEoXCJjb2RlX21pcnJvclwiLCBjb2RlX21pcnJvcik7XG4gICAgICAgIC8vIHNhdmVcbiAgICAgICAgdmFyIHNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZ2VuZXJhdGlvbiA9IGNvZGVfbWlycm9yLmNoYW5nZUdlbmVyYXRpb24odHJ1ZSk7XG4gICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogXCIvd3JpdGUucGhwXCIsXG4gICAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgZW5jb2Rpbmc6IGVuY29kaW5nLFxuICAgICAgICAgICAgICBjb250ZW50OiBjb2RlX21pcnJvci5nZXRWYWx1ZSgpLnJlcGxhY2UoL1xcbi9nLCBlb2wpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgICAgaWYgKHJlcGx5ID09IFwib2tcIikge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBnZW5lcmF0aW9uO1xuICAgICAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIFwiY2xlYW5cIik7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLiBcIiArIHJlcGx5LmVycm9yKTtcbiAgICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuXCIpO1xuICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvLyBhdXRvIHNhdmVcbiAgICAgICAgdmFyIGF1dG9TYXZlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIWNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSkge1xuICAgICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgNDAwMCk7XG4gICAgICAgIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgICAgICAgTW91c2V0cmFwKGVkaXRvclswXSkuYmluZChcIm1vZCtzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gbWFya3NcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBtYXJrcyA9IFtdO1xuICAgICAgICAgIE1vdXNldHJhcChlZGl0b3JbMF0pLmJpbmQoXCJtb2QrbVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSBjb2RlX21pcnJvci5nZXRDdXJzb3IoKTtcbiAgICAgICAgICAgIGlmIChtYXJrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdmFyIGxhc3QgPSBtYXJrc1ttYXJrcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgaWYgKGxhc3QubGluZSA9PSBjdXJzb3IubGluZSAmJiBsYXN0LmNoID09IGN1cnNvci5jaCkge1xuICAgICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMobWFya3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7aGVhZDogbSwgYW5jaG9yOiBtfTtcbiAgICAgICAgICAgICAgICB9KSwgbWFya3MubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgbWFya3MgPSBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hcmtzLnB1c2goY3Vyc29yKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KSgpO1xuICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICByZWplY3QoKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gJChcIiNlZGl0b3JzIC5lZGl0b3JcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAkKHRoaXMpLmRhdGEoXCJwYXRoXCIpID09IHBhdGg7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICAkKFwiI2VkaXRvcnMgLmVkaXRvci5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG4gIHZhciBmb3VuZCA9IHRoaXMuZ2V0KHBhdGgpO1xuICBpZiAoZm91bmQubGVuZ3RoKSB7XG4gICAgZm91bmQuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gICAgZm91bmQuZGF0YShcImNvZGVfbWlycm9yXCIpLmZvY3VzKCk7XG4gICAgZm91bmQuZGF0YShcImNvZGVfbWlycm9yXCIpLnJlZnJlc2goKTtcbiAgfVxufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldEFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLmRhdGEoXCJwYXRoXCIpO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLmdldChwYXRoKS5yZW1vdmUoKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5kZXRlY3RFb2wgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXFxuXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXFxuXCI7XG4gIH1cbiAgaWYgKGNvbnRlbnQubWF0Y2goXCJcXHJcIikpIHtcbiAgICByZXR1cm4gXCJcXHJcIjtcbiAgfVxuICByZXR1cm4gXCJcXG5cIjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEVkaXRvck1hbmFnZXIoKTtcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuXG52YXIgZ2V0RmlsZUVsZW1lbnQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAkKFwiI2ZpbGVzIC5maWxlLWl0ZW1cIikuZmlsdGVyKGZ1bmN0aW9uKGlkeCwgaXRlbSkge1xuICAgIHJldHVybiAkKGl0ZW0pLmRhdGEoXCJwYXRoXCIpID09IHBhdGhcbiAgfSlcbn1cblxudmFyIEZpbGVNYW5hZ2VyVmlldyA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gIHZhciB2aWV3ID0ge1xuICAgIGFkZEl0ZW06IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIilcbiAgICAgIHZhciBuYW1lID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCIuKi9cIiksIFwiXCIpXG4gICAgICAkKFwiPGRpdj5cIikuZGF0YShcInBhdGhcIiwgcGF0aCkuYWRkQ2xhc3MoXCJmaWxlLWl0ZW1cIikuYXBwZW5kKFxuICAgICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJkaXJcIikudGV4dChkaXIpLFxuICAgICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAgICQoJzxkaXYgY2xhc3M9XCJzdGF0dXMgY2xlYW5cIj4nKVxuICAgICAgKS5hcHBlbmRUbyhcIiNmaWxlc1wiKVxuICAgIH0sXG4gICAgXG4gICAgcmVtb3ZlSXRlbTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgZ2V0RmlsZUVsZW1lbnQocGF0aCkucmVtb3ZlKClcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlSXRlbTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJChcIiNmaWxlcyAuZmlsZS1pdGVtLmFjdGl2ZVwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBnZXRGaWxlRWxlbWVudChwYXRoKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlU3RhdHVzOiBmdW5jdGlvbihwYXRoLCBzdGF0dXMpIHtcbiAgICAgIGdldEZpbGVFbGVtZW50KHBhdGgpXG4gICAgICAgIC5maW5kKFwiLnN0YXR1c1wiKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoXCJjbGVhbiBlcnJvciBtb2RpZmllZFwiKVxuICAgICAgICAuYWRkQ2xhc3Moc3RhdHVzKVxuICAgIH0sXG4gIH1cbiAgXG4gIG1vZGVsLm9wZW5lZC5hZGQodmlldy5hZGRJdGVtKVxuICBtb2RlbC5jbG9zZWQuYWRkKHZpZXcucmVtb3ZlSXRlbSlcbiAgbW9kZWwuYWN0aXZhdGVkLmFkZCh2aWV3LmFjdGl2YXRlSXRlbSlcbiAgbW9kZWwuc3RhdHVzX2NoYW5nZWQuYWRkKHZpZXcudXBkYXRlU3RhdHVzKVxuICBcbiAgJChcIiNmaWxlc1wiKS5vbihcImNsaWNrXCIsIFwiLmZpbGUtaXRlbVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgbW9kZWwuYWN0aXZhdGUoJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJwYXRoXCIpKVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVNYW5hZ2VyVmlld1xuIiwidmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIEZpbGVNYW5hZ2VyVmlldyA9IHJlcXVpcmUoXCIuL2ZpbGUtdmlldy5qc1wiKVxudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpXG5cbnZhciBGaWxlTWFuYWdlciA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgb3BlbmVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBjbG9zZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGFjdGl2YXRlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgc3RhdHVzX2NoYW5nZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGFjdGl2ZTogbnVsbCwgLy8gcGF0aCBvZiBhY3RpdmUgZmlsZVxuICAgIGZpbGVzOiBbXSxcbiAgICBcbiAgICBnZXRGaWxlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXy5wbHVjayhtb2RlbC5maWxlcywgXCJwYXRoXCIpXG4gICAgfSxcbiAgICBcbiAgICBvcGVuOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBcIlRoZSBwYXRoIGlzIG51bGxcIlxuICAgICAgfVxuICAgICAgLy8gdHJ5IHRvIGFjdGl2YXRlIGFscmVhZHkgb3BlbmVkIGZpbGVzXG4gICAgICBpZiAobW9kZWwuYWN0aXZhdGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBlZGl0b3JfbWFuYWdlci5vcGVuKHBhdGgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGVsLmZpbGVzLnB1c2goe1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgc3RhdHVzOiBcImNsZWFuXCIsXG4gICAgICAgIH0pXG4gICAgICAgIG1vZGVsLm9wZW5lZC5kaXNwYXRjaChwYXRoKVxuICAgICAgICBtb2RlbC5hY3RpdmF0ZShwYXRoKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGdldEFjdGl2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuYWN0aXZlXG4gICAgfSxcbiAgICBcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgICAgaWYgKHBhdGggIT09IG51bGwgJiYgbW9kZWwuaW5kZXhPZihwYXRoKSA9PSAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIGZpbmRlci5zZXRQYXRoKHBhdGgpXG4gICAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShwYXRoKVxuICAgICAgbW9kZWwuYWN0aXZlID0gcGF0aFxuICAgICAgbW9kZWwuYWN0aXZhdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0sXG4gICAgXG4gICAgbmV4dEZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZSh0cnVlKVxuICAgIH0sXG4gICAgXG4gICAgcHJldkZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZShmYWxzZSlcbiAgICB9LFxuICAgIFxuICAgIHJvdGF0ZUZpbGU6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5maWxlcy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHhcbiAgICAgIGlmIChtb2RlbC5hY3RpdmUgPT09IG51bGwpIHtcbiAgICAgICAgaWR4ID0gbmV4dCA/IDAgOiBtb2RlbC5maWxlcy5sZW5ndGggLSAxXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWR4ID0gbW9kZWwuaW5kZXhPZihtb2RlbC5hY3RpdmUpXG4gICAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgICBpZHggPSAoaWR4ICsgbW9kZWwuZmlsZXMubGVuZ3RoKSAlIG1vZGVsLmZpbGVzLmxlbmd0aFxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZhdGUobW9kZWwuZmlsZXNbaWR4XS5wYXRoKVxuICAgIH0sXG4gICAgXG4gICAgY2xvc2U6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHZhciBpZHggPSBtb2RlbC5pbmRleE9mKHBhdGgpXG4gICAgICBpZiAoaWR4ID09IC0xKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICBpZiAobW9kZWwuZmlsZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBtb2RlbC5hY3RpdmF0ZShudWxsKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1vZGVsLnByZXZGaWxlKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWRpdG9yX21hbmFnZXIuY2xvc2UocGF0aClcbiAgICAgIG1vZGVsLmZpbGVzLnNwbGljZShpZHgsIDEpXG4gICAgICBtb2RlbC5jbG9zZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHJlbG9hZDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuY2xvc2UocGF0aClcbiAgICAgIG1vZGVsLm9wZW4ocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGluZGV4T2Y6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHJldHVybiBtb2RlbC5nZXRGaWxlcygpLmluZGV4T2YocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZVN0YXR1czogZnVuY3Rpb24ocGF0aCwgc3RhdHVzKSB7XG4gICAgICBtb2RlbC5pbmRleE9mKHBhdGgpLnN0YXR1cyA9IHN0YXR1c1xuICAgICAgbW9kZWwuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgc3RhdHVzKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci5zZWxlY3RlZC5hZGQobW9kZWwub3BlbilcbiAgZWRpdG9yX21hbmFnZXIuc3RhdHVzX2NoYW5nZWQuYWRkKG1vZGVsLnVwZGF0ZVN0YXR1cylcbiAgXG4gIHZhciB2aWV3ID0gRmlsZU1hbmFnZXJWaWV3KG1vZGVsKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZU1hbmFnZXJcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgRmluZGVyU3VnZ2VzdCA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgaXRlbXM6IFtdLFxuICAgIGN1cnNvcjogbnVsbCwgLy8gaGlnaGxpZ2h0ZWQgaXRlbVxuICAgIFxuICAgIGl0ZW1zX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBjdXJzb3JfbW92ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgdXJsOiBcIi9maW5kZXIucGhwXCIsXG4gICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICB9LFxuICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImZhaWxlZCB0byBmZXRjaCBzdWdnZXN0IGZvciB0aGUgcGF0aDogXCIgKyBwYXRoKVxuICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICBtb2RlbC5zZXRJdGVtcyhyZXBseS5pdGVtcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgIHJldHVybiByZXBseS5iYXNlICsgaVxuICAgICAgICB9KSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBzZXRJdGVtczogZnVuY3Rpb24oaXRlbXMpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihudWxsKVxuICAgICAgbW9kZWwuaXRlbXMgPSBpdGVtc1xuICAgICAgbW9kZWwuaXRlbXNfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC5pdGVtcylcbiAgICB9LFxuICAgIFxuICAgIGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5pdGVtc1xuICAgIH0sXG4gICAgXG4gICAgZ2V0Q3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5jdXJzb3JcbiAgICB9LFxuICAgIFxuICAgIHNldEN1cnNvcjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmN1cnNvcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmN1cnNvciA9IHBhdGhcbiAgICAgIG1vZGVsLmN1cnNvcl9tb3ZlZC5kaXNwYXRjaChtb2RlbC5jdXJzb3IpXG4gICAgfSxcbiAgICBcbiAgICBtb3ZlQ3Vyc29yOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuY3Vyc29yID09PSBudWxsKSB7XG4gICAgICAgIGlmIChtb2RlbC5pdGVtcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1swXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHggPSBtb2RlbC5pdGVtcy5pbmRleE9mKG1vZGVsLmN1cnNvcilcbiAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgaWR4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW9kZWwuaXRlbXMubGVuZ3RoIC0gMSwgaWR4KSlcbiAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1tpZHhdKVxuICAgIH0sXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IocGF0aClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICBtb2RlbC51cGRhdGUoZmluZGVyLmdldFBhdGgoKSlcbiAgICB9XG4gIH0pXG4gIFxuICBmaW5kZXIucGF0aF9jaGFuZ2VkLmFkZChfLmRlYm91bmNlKG1vZGVsLnVwZGF0ZSwgMjUwKSlcbiAgXG4gIC8vIHZpZXdcbiAgdmFyIGxpc3QgPSAkKFwiI2ZpbmRlci1pdGVtc1wiKVxuICBtb2RlbC5pdGVtc19jaGFuZ2VkLmFkZChmdW5jdGlvbihpdGVtcykge1xuICAgIGxpc3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIikuZW1wdHkoKVxuICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSAmJiBpdGVtc1swXSA9PSBtb2RlbC5nZXRDdXJzb3IoKSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHZhciBuYW1lX3J4ID0gbmV3IFJlZ0V4cChcIi8oW14vXSovPykkXCIpXG4gICAgbGlzdC5hcHBlbmQoaXRlbXMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZV9yeC5leGVjKGl0ZW0pWzFdXG4gICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgfSkpXG4gICAgbGlzdC5zY3JvbGxUb3AoMCkuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgfSlcbiAgXG4gIG1vZGVsLmN1cnNvcl9tb3ZlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIGxpc3QuZmluZChcImEuc2VsZWN0ZWRcIikucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKVxuICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdmFyIGEgPSBsaXN0LmZpbmQoXCJhXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAkKHRoaXMpLmRhdGEoXCJwYXRoXCIpID09IHBhdGhcbiAgICB9KVxuICAgIGlmIChhLmxlbmd0aCA9PSAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgYS5hZGRDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgXG4gICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgIHZhciBzY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdmFyIGhlaWdodCA9IHRhcmdldC5oZWlnaHQoKVxuICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICB2YXIgYm90dG9tID0gdG9wICsgaGVpZ2h0XG4gICAgICB2YXIgdmlld19oZWlnaHQgPSBsaXN0LmlubmVySGVpZ2h0KClcbiAgICAgIGlmICh0b3AgLSBsaXN0LnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgICBsaXN0LnNjcm9sbFRvcCh0b3ApXG4gICAgICB9XG4gICAgICBpZiAoYm90dG9tIC0gbGlzdC5zY3JvbGxUb3AoKSA+IHZpZXdfaGVpZ2h0KSB7XG4gICAgICAgIGxpc3Quc2Nyb2xsVG9wKGJvdHRvbSAtIHZpZXdfaGVpZ2h0KVxuICAgICAgfVxuICAgIH1cbiAgICBzY3JvbGxJbnRvVmlldyhhKVxuICB9KVxuICBcbiAgLy8gd2hlbiBpdGVtIHdhcyBzZWxlY3RlZFxuICBsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIC8vIHByZXZlbnQgZnJvbSBsb29zaW5nIGZvY3VzXG4gIGxpc3Qub24oXCJtb3VzZWRvd25cIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgfSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbnZhciBGYWxzZSA9IHJlcXVpcmUoXCIuL3JldHVybi1mYWxzZS5qc1wiKVxudmFyIElucHV0V2F0Y2hlciA9IHJlcXVpcmUoXCIuL2lucHV0LXdhdGNoZXIuanNcIilcblxudmFyIEZpbmRlclZpZXcgPSBmdW5jdGlvbihtb2RlbCwgc3VnZ2VzdCkge1xuICB2YXIgcGF0aF9pbnB1dCA9ICQoXCIjZmluZGVyLXBhdGhcIikudmFsKFwiL1wiKVxuICBcbiAgdmFyIHBhdGhfd2F0Y2hlciA9IElucHV0V2F0Y2hlcihwYXRoX2lucHV0LCA1MClcbiAgcGF0aF93YXRjaGVyLmNoYW5nZWQuYWRkKG1vZGVsLnNldFBhdGgpXG4gIFxuICB2YXIgdmlldyA9IHtcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX2lucHV0LmZvY3VzKClcbiAgICAgIHBhdGhfd2F0Y2hlci5zdGFydCgpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RvcCgpXG4gICAgfSxcbiAgfVxuICBcbiAgLy8gaGlkZSBvbiBibHVyXG4gIHBhdGhfaW5wdXQuYmx1cihtb2RlbC5oaWRlKCkpXG4gIFxuICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgdmlldy5zaG93KClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2aWV3LmhpZGUoKVxuICAgIH1cbiAgfSlcbiAgXG4gIG1vZGVsLnBhdGhfY2hhbmdlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIHBhdGhfaW5wdXQudmFsKHBhdGgpXG4gIH0pXG4gIFxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImVudGVyXCIsIEZhbHNlKG1vZGVsLmVudGVyKSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ0YWJcIiwgRmFsc2UobW9kZWwudGFiKSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJlc2NcIiwgRmFsc2UobW9kZWwuaGlkZSkpXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZG93blwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBzdWdnZXN0Lm1vdmVDdXJzb3IodHJ1ZSlcbiAgfSkpXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwidXBcIiwgRmFsc2UoZnVuY3Rpb24oKSB7XG4gICAgc3VnZ2VzdC5tb3ZlQ3Vyc29yKGZhbHNlKVxuICB9KSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJtb2QrdVwiLCBGYWxzZShcbiAgICBtb2RlbC5nb1RvUGFyZW50RGlyZWN0b3J5XG4gICkpXG4gIFxuICByZXR1cm4gdmlld1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclZpZXdcbiIsInZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBlZGl0b3JfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci5qc1wiKVxudmFyIEZpbmRlclZpZXcgPSByZXF1aXJlKFwiLi9maW5kZXItdmlldy5qc1wiKVxudmFyIEZpbmRlclN1Z2dlc3QgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdC5qc1wiKVxuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIHBhdGhfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIHZpc2liaWxpdHlfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHBhdGg6IFwiXCIsXG4gICAgdmlzaWJsZTogZmFsc2UsXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKHBhdGgpXG4gICAgICBpZiAocGF0aC5zdWJzdHIoLTEpID09IFwiL1wiKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuaGlkZSgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gdHJ1ZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSBmYWxzZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShlZGl0b3JfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICB9LFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLnBhdGhcbiAgICB9LFxuICAgIFxuICAgIHNldFBhdGg6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnBhdGggPSBwYXRoXG4gICAgICBtb2RlbC5wYXRoX2NoYW5nZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGdvVG9QYXJlbnREaXJlY3Rvcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChcbiAgICAgICAgbW9kZWwucGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKi8/JFwiKSwgXCJcIilcbiAgICAgIClcbiAgICB9LFxuICAgIFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXRoID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgbW9kZWwuc2VsZWN0KHBhdGggPyBwYXRoIDogbW9kZWwucGF0aClcbiAgICB9LFxuICAgIFxuICAgIHRhYjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGN1cnNvcilcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaXRlbXMgPSBzdWdnZXN0LmdldEl0ZW1zKClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSkge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGl0ZW1zWzBdKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHN1Z2dlc3QudXBkYXRlKG1vZGVsLnBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgdmFyIHN1Z2dlc3QgPSBGaW5kZXJTdWdnZXN0KG1vZGVsKVxuICBzdWdnZXN0LnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwuc2VsZWN0KHBhdGgpXG4gIH0pXG4gIFxuICB2YXIgdmlldyA9IEZpbmRlclZpZXcobW9kZWwsIHN1Z2dlc3QpXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGUuanNcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCI0U1BcIiwgXCIyU1BcIiwgXCJUQUJcIl0sIHR5cGUpXG59XG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBJbnB1dFdhdGNoZXIgPSBmdW5jdGlvbihpbnB1dCwgaW50ZXJ2YWwpIHtcbiAgaW5wdXQgPSAkKGlucHV0KVxuICBcbiAgdmFyIG1vZGVsID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBpbnB1dDogaW5wdXQsXG4gICAgaW50ZXJ2YWw6IGludGVydmFsLFxuICAgIGxhc3RfdmFsdWU6IGlucHV0LnZhbCgpLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIFxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnN0b3AoKVxuICAgICAgbW9kZWwudGltZXIgPSBzZXRJbnRlcnZhbChtb2RlbC5jaGVjaywgbW9kZWwuaW50ZXJ2YWwpXG4gICAgfSxcbiAgICBcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwobW9kZWwudGltZXIpXG4gICAgICBtb2RlbC50aW1lciA9IG51bGxcbiAgICB9LFxuICAgIFxuICAgIGNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbW9kZWwuaW5wdXQudmFsKClcbiAgICAgIGlmIChjdXJyZW50ID09IG1vZGVsLmxhc3RfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jaGFuZ2VkLmRpc3BhdGNoKGN1cnJlbnQsIG1vZGVsLmxhc3RfdmFsdWUpXG4gICAgICBtb2RlbC5sYXN0X3ZhbHVlID0gY3VycmVudFxuICAgIH0sXG4gICAgXG4gICAga2V5RG93bjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAobW9kZWwudGltZXIpIHtcbiAgICAgICAgbW9kZWwuY2hlY2soKVxuICAgICAgfVxuICAgIH0sXG4gIH1cbiAgXG4gIGlucHV0LmtleWRvd24obW9kZWwua2V5RG93bilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0V2F0Y2hlclxuIiwidmFyIHJldHVybkZhbHNlID0gZnVuY3Rpb24oZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZXR1cm5GYWxzZVxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxuXG52YXIgUm90YXRlID0gZnVuY3Rpb24odmFsdWVzLCB2YWx1ZSkge1xuICB2YXIgaXNWYWxpZFZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB2ID09PSBudWxsIHx8IHZhbHVlcy5pbmRleE9mKHYpICE9IC0xXG4gIH1cbiAgXG4gIHZhciBjaGVja1ZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIGlmICghaXNWYWxpZFZhbHVlKHYpKSB7XG4gICAgICB0aHJvdyBcImludmFsaWQgdmFsdWU6IFwiICsgdlxuICAgIH1cbiAgfVxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhbHVlID0gbnVsbFxuICB9XG4gIGNoZWNrVmFsdWUodmFsdWUpXG4gIFxuICB2YXIgcm90YXRlID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGdldFZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVzXG4gICAgfSxcbiAgICBcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfSxcbiAgICBcbiAgICBzZXQ6IGZ1bmN0aW9uKG5ld192YWx1ZSkge1xuICAgICAgaWYgKG5ld192YWx1ZSA9PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGNoZWNrVmFsdWUobmV3X3ZhbHVlKVxuICAgICAgdmFsdWUgPSBuZXdfdmFsdWVcbiAgICAgIHJvdGF0ZS5jaGFuZ2VkLmRpc3BhdGNoKHZhbHVlKVxuICAgIH0sXG4gICAgXG4gICAgcm90YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHggPSB2YWx1ZXMuaW5kZXhPZih2YWx1ZSlcbiAgICAgIGlkeCA9IChpZHggKyAxKSAlIHZhbHVlcy5sZW5ndGhcbiAgICAgIHJvdGF0ZS5zZXQodmFsdWVzW2lkeF0pXG4gICAgfVxuICB9XG4gIHJldHVybiByb3RhdGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSb3RhdGVcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIik7XG5cbkNvZGVNaXJyb3IuZGVmaW5lU2ltcGxlTW9kZShcInRleHRcIiwge1xuICBzdGFydDogW10sXG4gIGNvbW1lbnQ6IFtdLFxuICBtZXRhOiB7fVxufSk7XG4iLCJtb2R1bGUuZXhwb3J0cy5ydW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbiAgdmFyIGZpbmRlciA9IHJlcXVpcmUoXCIuL2ZpbmRlci5qc1wiKSgpXG4gIHZhciBmaWxlX21hbmFnZXIgPSByZXF1aXJlKFwiLi9maWxlLmpzXCIpKGZpbmRlcilcbiAgXG4gIHZhciBzYXZlRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmlsZXMgPSBmaWxlX21hbmFnZXIuZ2V0RmlsZXMoKVxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwib3Blbi1maWxlc1wiLCBKU09OLnN0cmluZ2lmeShmaWxlcykpXG4gIH1cbiAgdmFyIGxvYWRGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwib3Blbi1maWxlc1wiKSB8fCBcIltdXCIpXG4gIH1cbiAgbG9hZEZpbGVMaXN0KCkuZm9yRWFjaChmdW5jdGlvbihwYXRoKSB7XG4gICAgZmlsZV9tYW5hZ2VyLm9wZW4ocGF0aClcbiAgfSlcbiAgXG4gIGZpbGVfbWFuYWdlci5vcGVuZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgZmlsZV9tYW5hZ2VyLmNsb3NlZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBcbiAgLy8gc2hvcnRjdXQga2V5c1xuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrXCIsIFwibW9kKz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5uZXh0RmlsZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrc2hpZnQrXCIsIFwibW9kK3NoaWZ0Kz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5wcmV2RmlsZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrd1wiLCBcIm1vZCtrXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIuY2xvc2UoZmlsZV9tYW5hZ2VyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3JcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5yZWxvYWQoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgLy8gc2hvdyBmaW5kZXJcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK29cIiwgXCJtb2QrcFwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmluZGVyLnNob3coKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbn1cbiJdfQ==
