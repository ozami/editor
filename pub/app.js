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

},{"./indent.js":5,"./text-mode.js":8,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","jquery":"jquery","signals":"signals","underscore":"underscore"}],2:[function(require,module,exports){
var $ = require("jquery")
var signals = require("signals")
var editor_manager = require("./editor.js")

var FileManager = function(finder) {
  var model = {
    opened: new signals.Signal(),
    closed: new signals.Signal(),
    activated: new signals.Signal(),
    
    active: null,
    files: [],
    
    getFiles: function() {
      return model.files
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
        model.files.push(path)
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
      if (path !== null && model.files.indexOf(path) == -1) {
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
        idx = model.files.indexOf(model.active)
        idx += next ? +1 : -1
        idx = (idx + model.files.length) % model.files.length
      }
      model.activate(model.files[idx])
    },
    
    close: function(path) {
      var idx = model.files.indexOf(path)
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
  }
  
  // view
  var getFileElement = function(path) {
    return $("#files .file-item").filter(function(idx, item) {
      return $(item).data("path") == path
    })
  }
  
  model.opened.add(function(path) {
    var dir = path.replace(new RegExp("[^/]+$"), "")
    var name = path.replace(new RegExp(".*/"), "")
    $("<div>").data("path", path).addClass("file-item").append(
      $("<div>").addClass("dir").text(dir),
      $("<div>").addClass("name").text(name),
      $('<div class="status clean">')
    ).appendTo("#files")
  })
  
  model.closed.add(function(path) {
    getFileElement(path).remove()
  })
  
  model.activated.add(function(path) {
    $("#files .file-item.active").removeClass("active")
    if (path === null) {
      return
    }
    getFileElement(path).addClass("active")
  })
  
  editor_manager.status_changed.add(function(path, status) {
    var el = getFileElement(path)
    el.find(".status").removeClass("clean error modified").addClass(status)
  })
  
  finder.selected.add(function(path) {
    model.open(path)
  })
  
  $("#files").on("click", ".file-item", function(e) {
    e.preventDefault()
    model.activate($(e.currentTarget).data("path"))
  })
  
  return model
}

module.exports = FileManager

},{"./editor.js":1,"jquery":"jquery","signals":"signals"}],3:[function(require,module,exports){
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

},{"jquery":"jquery","signals":"signals","underscore":"underscore"}],4:[function(require,module,exports){
var $ = require("jquery")
var Signal = require("signals").Signal
var Mousetrap = require("mousetrap")
var editor_manager = require("./editor.js")
var FinderSuggest = require("./finder-suggest.js")
var InputWatcher = require("./input-watcher.js")

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
  }
  
  var suggest = FinderSuggest(model)
  suggest.selected.add(function(path) {
    model.select(path)
  })
  
  // View
  
  var path_input = $("#finder-path").val("/")
  
  // path watcher
  var path_watcher = InputWatcher(path_input, 40)
  path_watcher.changed.add(model.setPath)
  
  model.visibility_changed.add(function(visible) {
    if (visible) {
      $("#finder").addClass("active")
      path_watcher.start()
    }
    else {
      $("#finder").removeClass("active")
      path_watcher.stop()
    }
  })
  
  model.path_changed.add(function(path) {
    path_input.val(path)
  })
  
  // open file with enter key
  Mousetrap(path_input[0]).bind("enter", function() {
    var path = suggest.getCursor()
    model.select(path ? path : path_input.val())
    return false
  })
  
  // path completion with tab key
  Mousetrap(path_input[0]).bind("tab", function() {
    var cursor = suggest.getCursor()
    if (cursor) {
      model.setPath(cursor)
      return false
    }
    var items = suggest.getItems()
    if (items.length == 1) {
      model.setPath(items[0])
      return false
    }
    suggest.update(path_input.val())
    return false
  })
  
  // quit finder with esc key
  Mousetrap(path_input[0]).bind("esc", function() {
    model.hide()
    editor_manager.activate(editor_manager.getActive())
    return false
  })
  
  // select item with up/down key
  Mousetrap(path_input[0]).bind("down", function() {
    suggest.moveCursor(true)
    return false
  })
  Mousetrap(path_input[0]).bind("up", function() {
    suggest.moveCursor(false)
    return false
  })
  
  //
  Mousetrap(path_input[0]).bind("mod+u", function() {
    model.goToParentDirectory()
    return false
  })
  
  // focus on shown
  model.visibility_changed.add(function(visible) {
    if (visible) {
      path_input.focus()
    }
  })
  
  // hide on blur
  path_input.blur(function() {
    model.hide()
  })
  
  return model
}

module.exports = Finder

},{"./editor.js":1,"./finder-suggest.js":3,"./input-watcher.js":6,"jquery":"jquery","mousetrap":"mousetrap","signals":"signals"}],5:[function(require,module,exports){
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

},{"./rotate.js":7}],6:[function(require,module,exports){
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
  }
  return model
}

module.exports = InputWatcher

},{"jquery":"jquery","signals":"signals"}],7:[function(require,module,exports){
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

},{"signals":"signals"}],8:[function(require,module,exports){
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

},{"./file.js":2,"./finder.js":4,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9pbnB1dC13YXRjaGVyLmpzIiwianMvcm90YXRlLmpzIiwianMvdGV4dC1tb2RlLmpzIiwianMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcbnJlcXVpcmUoXCJjb2RlbWlycm9yLWFkZG9uXCIpO1xucmVxdWlyZShcIi4vdGV4dC1tb2RlLmpzXCIpO1xuXG4vLyBFZGl0b3JNYW5hZ2VyXG52YXIgRWRpdG9yTWFuYWdlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN0YXR1c19jaGFuZ2VkID0gbmV3IFNpZ25hbCgpO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICQuYWpheCh7XG4gICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgdXJsOiBcIi9yZWFkLnBocFwiLFxuICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpe1xuICAgICAgaWYgKHJlcGx5LmVycm9yKSB7XG4gICAgICAgIGFsZXJ0KHJlcGx5LmVycm9yKTtcbiAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBlbmNvZGluZyA9IHJlcGx5LmVuY29kaW5nO1xuICAgICAgdmFyIGVkaXRvciA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImVkaXRvclwiKS5hcHBlbmRUbyhcIiNlZGl0b3JzXCIpO1xuICAgICAgdmFyIG1vZGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBleHRlbnNpb24gPSBwYXRoLnJlcGxhY2UoLy4qWy5dKC4rKSQvLCBcIiQxXCIpO1xuICAgICAgICB2YXIgbW9kZSA9IHtcbiAgICAgICAgICBodG1sOiBcInBocFwiLFxuICAgICAgICAgIHRhZzogXCJwaHBcIixcbiAgICAgICAgfVtleHRlbnNpb25dO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlO1xuICAgICAgICB9XG4gICAgICAgIG1vZGUgPSBDb2RlTWlycm9yLmZpbmRNb2RlQnlFeHRlbnNpb24oZXh0ZW5zaW9uKTtcbiAgICAgICAgaWYgKG1vZGUpIHtcbiAgICAgICAgICByZXR1cm4gbW9kZS5tb2RlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcInRleHRcIjtcbiAgICAgIH0pKCk7XG4gICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb2RlX21pcnJvciA9IENvZGVNaXJyb3IoZWRpdG9yWzBdLCB7XG4gICAgICAgICAgdmFsdWU6IHJlcGx5LmNvbnRlbnQsXG4gICAgICAgICAgbGluZU51bWJlcnM6IHRydWUsXG4gICAgICAgICAgdGFiU2l6ZTogNCxcbiAgICAgICAgICBzaG93Q3Vyc29yV2hlblNlbGVjdGluZzogdHJ1ZSxcbiAgICAgICAgICBhdXRvQ2xvc2VCcmFja2V0czogdHJ1ZSxcbiAgICAgICAgICBtYXRjaEJyYWNrZXRzOiB0cnVlLFxuICAgICAgICAgIG1hdGNoVGFnczogdHJ1ZSxcbiAgICAgICAgICBhdXRvQ2xvc2VUYWdzOiB0cnVlLFxuICAgICAgICAgIHN0eWxlQWN0aXZlTGluZTogdHJ1ZSxcbiAgICAgICAgICBzdHlsZVNlbGVjdGVkVGV4dDogdHJ1ZSxcbiAgICAgICAgICBtb2RlOiBtb2RlLFxuICAgICAgICAgIGRyYWdEcm9wOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIENvZGVNaXJyb3IucmVnaXN0ZXJIZWxwZXIoXCJoaW50V29yZHNcIiwgbW9kZSwgbnVsbCk7XG4gICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImV4dHJhS2V5c1wiLCB7XG4gICAgICAgICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgICAgICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICAgICAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICAgICAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgICAgICAgIFRhYjogXCJpbmRlbnRBdXRvXCIsXG4gICAgICAgICAgXCJDdHJsLURcIjogZmFsc2UsXG4gICAgICAgICAgXCJDbWQtRFwiOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcInN0eWxlQWN0aXZlTGluZVwiLCB7bm9uRW1wdHk6IHRydWV9KTtcbiAgICAgICAgLy8gbWFpbnRhaW4gaW5kZW50YXRpb24gb24gcGFzdGVcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJiZWZvcmVDaGFuZ2VcIiwgZnVuY3Rpb24oY20sIGNoYW5nZSkge1xuICAgICAgICAgIGlmIChjaGFuZ2Uub3JpZ2luICE9IFwicGFzdGVcIikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoQ29kZU1pcnJvci5jbXBQb3MoY2hhbmdlLmZyb20sIGNoYW5nZS50bykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gICAgICAgICAgdmFyIGRlc3QgPSBjbS5nZXRMaW5lKGNoYW5nZS5mcm9tLmxpbmUpO1xuICAgICAgICAgIGlmIChkZXN0Lmxlbmd0aCAhPSBjaGFuZ2UuZnJvbS5jaCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICAgICAgICAgIGlmIChkZXN0Lm1hdGNoKC9bXiBcXHRdLykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgICAgICAgICBpZiAoY2hhbmdlLnRleHRbY2hhbmdlLnRleHQubGVuZ3RoIC0gMV0gPT0gXCJcIikge1xuICAgICAgICAgICAgY2hhbmdlLnRleHQucG9wKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdO1xuICAgICAgICAgIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLm1hdGNoKC9eKFsgXFx0XSopKC4qKS8pO1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IGxpbmVbMV07XG4gICAgICAgICAgICB2YXIgdGV4dCA9IGxpbmVbMl07XG4gICAgICAgICAgICBpbmRlbnQgPSAoZGVzdCArIGluZGVudCkuc3Vic3RyKDAsIGRlc3QubGVuZ3RoICsgaW5kZW50Lmxlbmd0aCAtIGJhc2VfaW5kZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZW50ICsgdGV4dDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjaGFuZ2UudGV4dFswXSA9IGNoYW5nZS50ZXh0WzBdLnN1YnN0cihkZXN0Lmxlbmd0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2RlX21pcnJvci5vbihcImNoYW5nZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYXV0b1NhdmUoKTtcbiAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKFxuICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSA/IFwiY2xlYW5cIjogXCJtb2RpZmllZFwiXG4gICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBjbV9pbnB1dCA9IGNvZGVfbWlycm9yLmdldElucHV0RmllbGQoKTtcbiAgICAgICAgJChjbV9pbnB1dCkuYWRkQ2xhc3MoXCJtb3VzZXRyYXBcIik7IC8vIGVuYWJsZSBob3RrZXlcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2JcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJnb1dvcmRMZWZ0XCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtmXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZ29Xb3JkUmlnaHRcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2hcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJkZWxXb3JkQmVmb3JlXCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtkXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZGVsV29yZEFmdGVyXCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtkXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMoXG4gICAgICAgICAgICBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjb2RlX21pcnJvci5maW5kV29yZEF0KGkuYW5jaG9yKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2QrbFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKFxuICAgICAgICAgICAgY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgICAgICAgICAgY2g6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICAgICAgICAgIGxpbmU6IGkuYW5jaG9yLmxpbmUsXG4gICAgICAgICAgICAgICAgICBjaDogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK3NoaWZ0K2xcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGlvbnMgPSBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpO1xuICAgICAgICAgIGlmIChzZWxlY3Rpb25zLmxlbmd0aCAhPSAxKSB7XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYW5jaG9yID0gc2VsZWN0aW9uc1swXS5hbmNob3I7XG4gICAgICAgICAgdmFyIGhlYWQgPSBzZWxlY3Rpb25zWzBdLmhlYWQ7XG4gICAgICAgICAgdmFyIG5ld19zZWxlY3Rpb25zID0gW107XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGFuY2hvci5saW5lOyBpIDw9IGhlYWQubGluZTsgKytpKSB7XG4gICAgICAgICAgICBuZXdfc2VsZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgICAgICAgbGluZTogaSxcbiAgICAgICAgICAgICAgICBjaDogaSA9PSBhbmNob3IubGluZSA/IGFuY2hvci5jaCA6IDBcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaGVhZDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGksXG4gICAgICAgICAgICAgICAgY2g6IGkgPT0gaGVhZC5saW5lID8gaGVhZC5jaCA6IEluZmluaXR5XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKG5ld19zZWxlY3Rpb25zKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gY29kZV9taXJyb3IuY2hhbmdlR2VuZXJhdGlvbih0cnVlKTtcbiAgICAgICAgLy8gc3RhdHVzIGJhclxuICAgICAgICBlZGl0b3IuYXBwZW5kKFxuICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZm9vdFwiPicpLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbWVzc2FnZVwiPicpLFxuICAgICAgICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1pbmRlbnQgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW9sXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVuY29kaW5nXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1vZGVcIj4nKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgICAgdmFyIHVwZGF0ZU1vZGVJbmZvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG1vZGUgPSBjb2RlX21pcnJvci5nZXRNb2RlKCk7XG4gICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlLm5hbWUpO1xuICAgICAgICB9O1xuICAgICAgICB1cGRhdGVNb2RlSW5mbygpO1xuICAgICAgICBcbiAgICAgICAgLy8gaW5kZW50XG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgdXBkYXRlSW5kZW50SW5mbyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikudGV4dCh0eXBlKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHZhciBJbmRlbnQgPSByZXF1aXJlKFwiLi9pbmRlbnQuanNcIik7XG4gICAgICAgICAgdmFyIGluZGVudCA9IEluZGVudCgpO1xuICAgICAgICAgIGluZGVudC5jaGFuZ2VkLmFkZChmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICBpZiAodHlwZSA9PSBcIlRBQlwiKSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIHRydWUpO1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRVbml0XCIsIDQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCBOdW1iZXIodHlwZS5yZXBsYWNlKFwiU1BcIiwgXCJcIikpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVwZGF0ZUluZGVudEluZm8odHlwZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaW5kZW50LnNldChJbmRlbnQuZGV0ZWN0SW5kZW50VHlwZShyZXBseS5jb250ZW50KSlcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaW5kZW50LnJvdGF0ZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gbGluZSBzZXByYXRvclxuICAgICAgICB2YXIgZW9sID0gc2VsZi5kZXRlY3RFb2wocmVwbHkuY29udGVudCk7XG4gICAgICAgIHZhciBlb2xfbmFtZXMgPSB7XG4gICAgICAgICAgXCJcXHJcIjogXCJDUlwiLFxuICAgICAgICAgIFwiXFxuXCI6IFwiTEZcIixcbiAgICAgICAgICBcIlxcclxcblwiOiBcIkNSTEZcIlxuICAgICAgICB9O1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQoZW9sX25hbWVzW2VvbF0pO1xuICAgICAgICAvLyBlbmNvZGluZ1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZyk7XG4gICAgICAgIFxuICAgICAgICBlZGl0b3IuZGF0YShcInBhdGhcIiwgcGF0aCk7XG4gICAgICAgIGVkaXRvci5kYXRhKFwiY29kZV9taXJyb3JcIiwgY29kZV9taXJyb3IpO1xuICAgICAgICAvLyBzYXZlXG4gICAgICAgIHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGdlbmVyYXRpb24gPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IFwiL3dyaXRlLnBocFwiLFxuICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgIGVuY29kaW5nOiBlbmNvZGluZyxcbiAgICAgICAgICAgICAgY29udGVudDogY29kZV9taXJyb3IuZ2V0VmFsdWUoKS5yZXBsYWNlKC9cXG4vZywgZW9sKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICAgIGlmIChyZXBseSA9PSBcIm9rXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gZ2VuZXJhdGlvbjtcbiAgICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImNsZWFuXCIpO1xuICAgICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZWQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlIGZhaWxlZC4gXCIgKyByZXBseS5lcnJvcik7XG4gICAgICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgXCJlcnJvclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLlwiKTtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgXCJlcnJvclwiKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gYXV0byBzYXZlXG4gICAgICAgIHZhciBhdXRvU2F2ZSA9IF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCFjb2RlX21pcnJvci5pc0NsZWFuKGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSkpIHtcbiAgICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDQwMDApO1xuICAgICAgICAvLyBzYXZlIHdpdGggY29tbWFuZC1zXG4gICAgICAgIE1vdXNldHJhcChlZGl0b3JbMF0pLmJpbmQoXCJtb2Qrc1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzYXZlKCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIG1hcmtzXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgbWFya3MgPSBbXTtcbiAgICAgICAgICBNb3VzZXRyYXAoZWRpdG9yWzBdKS5iaW5kKFwibW9kK21cIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gY29kZV9taXJyb3IuZ2V0Q3Vyc29yKCk7XG4gICAgICAgICAgICBpZiAobWFya3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciBsYXN0ID0gbWFya3NbbWFya3MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgIGlmIChsYXN0LmxpbmUgPT0gY3Vyc29yLmxpbmUgJiYgbGFzdC5jaCA9PSBjdXJzb3IuY2gpIHtcbiAgICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKG1hcmtzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge2hlYWQ6IG0sIGFuY2hvcjogbX07XG4gICAgICAgICAgICAgICAgfSksIG1hcmtzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgIG1hcmtzID0gW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXJrcy5wdXNoKGN1cnNvcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSkoKTtcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfSk7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICB2YXIgZm91bmQgPSB0aGlzLmdldChwYXRoKTtcbiAgaWYgKGZvdW5kLmxlbmd0aCkge1xuICAgIGZvdW5kLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5mb2N1cygpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5yZWZyZXNoKCk7XG4gIH1cbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5kYXRhKFwicGF0aFwiKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdGhpcy5nZXQocGF0aCkucmVtb3ZlKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZGV0ZWN0RW9sID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiO1xuICB9XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXCI7XG4gIH1cbiAgcmV0dXJuIFwiXFxuXCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBFZGl0b3JNYW5hZ2VyKCk7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBzaWduYWxzID0gcmVxdWlyZShcInNpZ25hbHNcIilcbnZhciBlZGl0b3JfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci5qc1wiKVxuXG52YXIgRmlsZU1hbmFnZXIgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIG9wZW5lZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgY2xvc2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBhY3RpdmF0ZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGFjdGl2ZTogbnVsbCxcbiAgICBmaWxlczogW10sXG4gICAgXG4gICAgZ2V0RmlsZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmZpbGVzXG4gICAgfSxcbiAgICBcbiAgICBvcGVuOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBcIlRoZSBwYXRoIGlzIG51bGxcIlxuICAgICAgfVxuICAgICAgLy8gdHJ5IHRvIGFjdGl2YXRlIGFscmVhZHkgb3BlbmVkIGZpbGVzXG4gICAgICBpZiAobW9kZWwuYWN0aXZhdGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBlZGl0b3JfbWFuYWdlci5vcGVuKHBhdGgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGVsLmZpbGVzLnB1c2gocGF0aClcbiAgICAgICAgbW9kZWwub3BlbmVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICAgIG1vZGVsLmFjdGl2YXRlKHBhdGgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgZ2V0QWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5hY3RpdmVcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgICBpZiAocGF0aCAhPT0gbnVsbCAmJiBtb2RlbC5maWxlcy5pbmRleE9mKHBhdGgpID09IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgZmluZGVyLnNldFBhdGgocGF0aClcbiAgICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKHBhdGgpXG4gICAgICBtb2RlbC5hY3RpdmUgPSBwYXRoXG4gICAgICBtb2RlbC5hY3RpdmF0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSxcbiAgICBcbiAgICBuZXh0RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKHRydWUpXG4gICAgfSxcbiAgICBcbiAgICBwcmV2RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKGZhbHNlKVxuICAgIH0sXG4gICAgXG4gICAgcm90YXRlRmlsZTogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmZpbGVzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeFxuICAgICAgaWYgKG1vZGVsLmFjdGl2ZSA9PT0gbnVsbCkge1xuICAgICAgICBpZHggPSBuZXh0ID8gMCA6IG1vZGVsLmZpbGVzLmxlbmd0aCAtIDFcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZHggPSBtb2RlbC5maWxlcy5pbmRleE9mKG1vZGVsLmFjdGl2ZSlcbiAgICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICAgIGlkeCA9IChpZHggKyBtb2RlbC5maWxlcy5sZW5ndGgpICUgbW9kZWwuZmlsZXMubGVuZ3RoXG4gICAgICB9XG4gICAgICBtb2RlbC5hY3RpdmF0ZShtb2RlbC5maWxlc1tpZHhdKVxuICAgIH0sXG4gICAgXG4gICAgY2xvc2U6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHZhciBpZHggPSBtb2RlbC5maWxlcy5pbmRleE9mKHBhdGgpXG4gICAgICBpZiAoaWR4ID09IC0xKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICBpZiAobW9kZWwuZmlsZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBtb2RlbC5hY3RpdmF0ZShudWxsKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1vZGVsLnByZXZGaWxlKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWRpdG9yX21hbmFnZXIuY2xvc2UocGF0aClcbiAgICAgIG1vZGVsLmZpbGVzLnNwbGljZShpZHgsIDEpXG4gICAgICBtb2RlbC5jbG9zZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHJlbG9hZDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuY2xvc2UocGF0aClcbiAgICAgIG1vZGVsLm9wZW4ocGF0aClcbiAgICB9LFxuICB9XG4gIFxuICAvLyB2aWV3XG4gIHZhciBnZXRGaWxlRWxlbWVudCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICByZXR1cm4gJChcIiNmaWxlcyAuZmlsZS1pdGVtXCIpLmZpbHRlcihmdW5jdGlvbihpZHgsIGl0ZW0pIHtcbiAgICAgIHJldHVybiAkKGl0ZW0pLmRhdGEoXCJwYXRoXCIpID09IHBhdGhcbiAgICB9KVxuICB9XG4gIFxuICBtb2RlbC5vcGVuZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICB2YXIgZGlyID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKyRcIiksIFwiXCIpXG4gICAgdmFyIG5hbWUgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIi4qL1wiKSwgXCJcIilcbiAgICAkKFwiPGRpdj5cIikuZGF0YShcInBhdGhcIiwgcGF0aCkuYWRkQ2xhc3MoXCJmaWxlLWl0ZW1cIikuYXBwZW5kKFxuICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZGlyXCIpLnRleHQoZGlyKSxcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcIm5hbWVcIikudGV4dChuYW1lKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJzdGF0dXMgY2xlYW5cIj4nKVxuICAgICkuYXBwZW5kVG8oXCIjZmlsZXNcIilcbiAgfSlcbiAgXG4gIG1vZGVsLmNsb3NlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIGdldEZpbGVFbGVtZW50KHBhdGgpLnJlbW92ZSgpXG4gIH0pXG4gIFxuICBtb2RlbC5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAkKFwiI2ZpbGVzIC5maWxlLWl0ZW0uYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBnZXRGaWxlRWxlbWVudChwYXRoKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICB9KVxuICBcbiAgZWRpdG9yX21hbmFnZXIuc3RhdHVzX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHBhdGgsIHN0YXR1cykge1xuICAgIHZhciBlbCA9IGdldEZpbGVFbGVtZW50KHBhdGgpXG4gICAgZWwuZmluZChcIi5zdGF0dXNcIikucmVtb3ZlQ2xhc3MoXCJjbGVhbiBlcnJvciBtb2RpZmllZFwiKS5hZGRDbGFzcyhzdGF0dXMpXG4gIH0pXG4gIFxuICBmaW5kZXIuc2VsZWN0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBtb2RlbC5vcGVuKHBhdGgpXG4gIH0pXG4gIFxuICAkKFwiI2ZpbGVzXCIpLm9uKFwiY2xpY2tcIiwgXCIuZmlsZS1pdGVtXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5hY3RpdmF0ZSgkKGUuY3VycmVudFRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlTWFuYWdlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBGaW5kZXJTdWdnZXN0ID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBpdGVtczogW10sXG4gICAgY3Vyc29yOiBudWxsLCAvLyBoaWdobGlnaHRlZCBpdGVtXG4gICAgXG4gICAgaXRlbXNfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIGN1cnNvcl9tb3ZlZDogbmV3IFNpZ25hbCgpLFxuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICB1cmw6IFwiL2ZpbmRlci5waHBcIixcbiAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZmFpbGVkIHRvIGZldGNoIHN1Z2dlc3QgZm9yIHRoZSBwYXRoOiBcIiArIHBhdGgpXG4gICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgIG1vZGVsLnNldEl0ZW1zKHJlcGx5Lml0ZW1zLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlcGx5LmJhc2UgKyBpXG4gICAgICAgIH0pKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHNldEl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG51bGwpXG4gICAgICBtb2RlbC5pdGVtcyA9IGl0ZW1zXG4gICAgICBtb2RlbC5pdGVtc19jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLml0ZW1zKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLml0ZW1zXG4gICAgfSxcbiAgICBcbiAgICBnZXRDdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmN1cnNvclxuICAgIH0sXG4gICAgXG4gICAgc2V0Q3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuY3Vyc29yKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuY3Vyc29yID0gcGF0aFxuICAgICAgbW9kZWwuY3Vyc29yX21vdmVkLmRpc3BhdGNoKG1vZGVsLmN1cnNvcilcbiAgICB9LFxuICAgIFxuICAgIG1vdmVDdXJzb3I6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5jdXJzb3IgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKG1vZGVsLml0ZW1zLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zWzBdKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IG1vZGVsLml0ZW1zLmluZGV4T2YobW9kZWwuY3Vyc29yKVxuICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICBpZHggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb2RlbC5pdGVtcy5sZW5ndGggLSAxLCBpZHgpKVxuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zW2lkeF0pXG4gICAgfSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihwYXRoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIG1vZGVsLnVwZGF0ZShmaW5kZXIuZ2V0UGF0aCgpKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKF8uZGVib3VuY2UobW9kZWwudXBkYXRlLCAyNTApKVxuICBcbiAgLy8gdmlld1xuICB2YXIgbGlzdCA9ICQoXCIjZmluZGVyLWl0ZW1zXCIpXG4gIG1vZGVsLml0ZW1zX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgbGlzdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKS5lbXB0eSgpXG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxICYmIGl0ZW1zWzBdID09IG1vZGVsLmdldEN1cnNvcigpKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdmFyIG5hbWVfcnggPSBuZXcgUmVnRXhwKFwiLyhbXi9dKi8/KSRcIilcbiAgICBsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgdmFyIG5hbWUgPSBuYW1lX3J4LmV4ZWMoaXRlbSlbMV1cbiAgICAgIHJldHVybiAkKFwiPGE+XCIpLnRleHQobmFtZSkuZGF0YShcInBhdGhcIiwgaXRlbSlcbiAgICB9KSlcbiAgICBsaXN0LnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICB9KVxuICBcbiAgbW9kZWwuY3Vyc29yX21vdmVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbGlzdC5maW5kKFwiYS5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB2YXIgYSA9IGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICQodGhpcykuZGF0YShcInBhdGhcIikgPT0gcGF0aFxuICAgIH0pXG4gICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcbiAgICBcbiAgICAvLyBzY3JvbGwgdGhlIGxpc3QgdG8gbWFrZSB0aGUgc2VsZWN0ZWQgaXRlbSB2aXNpYmxlXG4gICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICB2YXIgaGVpZ2h0ID0gdGFyZ2V0LmhlaWdodCgpXG4gICAgICB2YXIgdG9wID0gdGFyZ2V0LnByZXZBbGwoKS5sZW5ndGggKiBoZWlnaHRcbiAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgIHZhciB2aWV3X2hlaWdodCA9IGxpc3QuaW5uZXJIZWlnaHQoKVxuICAgICAgaWYgKHRvcCAtIGxpc3Quc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICAgIGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgIH1cbiAgICAgIGlmIChib3R0b20gLSBsaXN0LnNjcm9sbFRvcCgpID4gdmlld19oZWlnaHQpIHtcbiAgICAgICAgbGlzdC5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpXG4gICAgICB9XG4gICAgfVxuICAgIHNjcm9sbEludG9WaWV3KGEpXG4gIH0pXG4gIFxuICAvLyB3aGVuIGl0ZW0gd2FzIHNlbGVjdGVkXG4gIGxpc3Qub24oXCJjbGlja1wiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIG1vZGVsLnNlbGVjdCgkKGUudGFyZ2V0KS5kYXRhKFwicGF0aFwiKSlcbiAgfSlcbiAgLy8gcHJldmVudCBmcm9tIGxvb3NpbmcgZm9jdXNcbiAgbGlzdC5vbihcIm1vdXNlZG93blwiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICB9KVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpXG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LmpzXCIpXG52YXIgSW5wdXRXYXRjaGVyID0gcmVxdWlyZShcIi4vaW5wdXQtd2F0Y2hlci5qc1wiKVxuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIHBhdGhfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIHZpc2liaWxpdHlfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHBhdGg6IFwiXCIsXG4gICAgdmlzaWJsZTogZmFsc2UsXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKHBhdGgpXG4gICAgICBpZiAocGF0aC5zdWJzdHIoLTEpID09IFwiL1wiKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuaGlkZSgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gdHJ1ZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSBmYWxzZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgfSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5wYXRoXG4gICAgfSxcbiAgICBcbiAgICBzZXRQYXRoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5wYXRoID0gcGF0aFxuICAgICAgbW9kZWwucGF0aF9jaGFuZ2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBnb1RvUGFyZW50RGlyZWN0b3J5OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgoXG4gICAgICAgIG1vZGVsLnBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSovPyRcIiksIFwiXCIpXG4gICAgICApXG4gICAgfSxcbiAgfVxuICBcbiAgdmFyIHN1Z2dlc3QgPSBGaW5kZXJTdWdnZXN0KG1vZGVsKVxuICBzdWdnZXN0LnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwuc2VsZWN0KHBhdGgpXG4gIH0pXG4gIFxuICAvLyBWaWV3XG4gIFxuICB2YXIgcGF0aF9pbnB1dCA9ICQoXCIjZmluZGVyLXBhdGhcIikudmFsKFwiL1wiKVxuICBcbiAgLy8gcGF0aCB3YXRjaGVyXG4gIHZhciBwYXRoX3dhdGNoZXIgPSBJbnB1dFdhdGNoZXIocGF0aF9pbnB1dCwgNDApXG4gIHBhdGhfd2F0Y2hlci5jaGFuZ2VkLmFkZChtb2RlbC5zZXRQYXRoKVxuICBcbiAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RhcnQoKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RvcCgpXG4gICAgfVxuICB9KVxuICBcbiAgbW9kZWwucGF0aF9jaGFuZ2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgcGF0aF9pbnB1dC52YWwocGF0aClcbiAgfSlcbiAgXG4gIC8vIG9wZW4gZmlsZSB3aXRoIGVudGVyIGtleVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImVudGVyXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgIG1vZGVsLnNlbGVjdChwYXRoID8gcGF0aCA6IHBhdGhfaW5wdXQudmFsKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG4gIFxuICAvLyBwYXRoIGNvbXBsZXRpb24gd2l0aCB0YWIga2V5XG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwidGFiXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXJzb3IgPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgaWYgKGN1cnNvcikge1xuICAgICAgbW9kZWwuc2V0UGF0aChjdXJzb3IpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgdmFyIGl0ZW1zID0gc3VnZ2VzdC5nZXRJdGVtcygpXG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKGl0ZW1zWzBdKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHN1Z2dlc3QudXBkYXRlKHBhdGhfaW5wdXQudmFsKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG4gIFxuICAvLyBxdWl0IGZpbmRlciB3aXRoIGVzYyBrZXlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJlc2NcIiwgZnVuY3Rpb24oKSB7XG4gICAgbW9kZWwuaGlkZSgpXG4gICAgZWRpdG9yX21hbmFnZXIuYWN0aXZhdGUoZWRpdG9yX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG4gIFxuICAvLyBzZWxlY3QgaXRlbSB3aXRoIHVwL2Rvd24ga2V5XG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZG93blwiLCBmdW5jdGlvbigpIHtcbiAgICBzdWdnZXN0Lm1vdmVDdXJzb3IodHJ1ZSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ1cFwiLCBmdW5jdGlvbigpIHtcbiAgICBzdWdnZXN0Lm1vdmVDdXJzb3IoZmFsc2UpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG4gIFxuICAvL1xuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcIm1vZCt1XCIsIGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLmdvVG9QYXJlbnREaXJlY3RvcnkoKVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxuICBcbiAgLy8gZm9jdXMgb24gc2hvd25cbiAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIHBhdGhfaW5wdXQuZm9jdXMoKVxuICAgIH1cbiAgfSlcbiAgXG4gIC8vIGhpZGUgb24gYmx1clxuICBwYXRoX2lucHV0LmJsdXIoZnVuY3Rpb24oKSB7XG4gICAgbW9kZWwuaGlkZSgpXG4gIH0pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGUuanNcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCI0U1BcIiwgXCIyU1BcIiwgXCJUQUJcIl0sIHR5cGUpXG59XG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBJbnB1dFdhdGNoZXIgPSBmdW5jdGlvbihpbnB1dCwgaW50ZXJ2YWwpIHtcbiAgaW5wdXQgPSAkKGlucHV0KVxuICBcbiAgdmFyIG1vZGVsID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBpbnB1dDogaW5wdXQsXG4gICAgaW50ZXJ2YWw6IGludGVydmFsLFxuICAgIGxhc3RfdmFsdWU6IGlucHV0LnZhbCgpLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIFxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnN0b3AoKVxuICAgICAgbW9kZWwudGltZXIgPSBzZXRJbnRlcnZhbChtb2RlbC5jaGVjaywgbW9kZWwuaW50ZXJ2YWwpXG4gICAgfSxcbiAgICBcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwobW9kZWwudGltZXIpXG4gICAgICBtb2RlbC50aW1lciA9IG51bGxcbiAgICB9LFxuICAgIFxuICAgIGNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbW9kZWwuaW5wdXQudmFsKClcbiAgICAgIGlmIChjdXJyZW50ID09IG1vZGVsLmxhc3RfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jaGFuZ2VkLmRpc3BhdGNoKGN1cnJlbnQsIG1vZGVsLmxhc3RfdmFsdWUpXG4gICAgICBtb2RlbC5sYXN0X3ZhbHVlID0gY3VycmVudFxuICAgIH0sXG4gIH1cbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXRXYXRjaGVyXG4iLCJcInVzZSBzdHJpY3RcIlxuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG5cbnZhciBSb3RhdGUgPSBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlKSB7XG4gIHZhciBpc1ZhbGlkVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdmFsdWVzLmluZGV4T2YodikgIT0gLTFcbiAgfVxuICBcbiAgdmFyIGNoZWNrVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKCFpc1ZhbGlkVmFsdWUodikpIHtcbiAgICAgIHRocm93IFwiaW52YWxpZCB2YWx1ZTogXCIgKyB2XG4gICAgfVxuICB9XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFsdWUgPSBudWxsXG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSB7XG4gICAgY2hhbmdlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgXG4gICAgZ2V0VmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZXNcbiAgICB9LFxuICAgIFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAobmV3X3ZhbHVlID09IHZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY2hlY2tWYWx1ZShuZXdfdmFsdWUpXG4gICAgICB2YWx1ZSA9IG5ld192YWx1ZVxuICAgICAgcm90YXRlLmNoYW5nZWQuZGlzcGF0Y2godmFsdWUpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IHZhbHVlcy5pbmRleE9mKHZhbHVlKVxuICAgICAgaWR4ID0gKGlkeCArIDEpICUgdmFsdWVzLmxlbmd0aFxuICAgICAgcm90YXRlLnNldCh2YWx1ZXNbaWR4XSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdGF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdGF0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzLnJ1biA9IGZ1bmN0aW9uKCkge1xuICB2YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxuICB2YXIgZmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyLmpzXCIpKClcbiAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIikoZmluZGVyKVxuICBcbiAgdmFyIHNhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaWxlcyA9IGZpbGVfbWFuYWdlci5nZXRGaWxlcygpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJvcGVuLWZpbGVzXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzKSlcbiAgfVxuICB2YXIgbG9hZEZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJvcGVuLWZpbGVzXCIpIHx8IFwiW11cIilcbiAgfVxuICBsb2FkRmlsZUxpc3QoKS5mb3JFYWNoKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBmaWxlX21hbmFnZXIub3BlbihwYXRoKVxuICB9KVxuICBcbiAgZmlsZV9tYW5hZ2VyLm9wZW5lZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBmaWxlX21hbmFnZXIuY2xvc2VkLmFkZChzYXZlRmlsZUxpc3QpXG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLm5leHRGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtzaGlmdCtcIiwgXCJtb2Qrc2hpZnQrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5jbG9zZShmaWxlX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrclwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnJlbG9hZCgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICAvLyBzaG93IGZpbmRlclxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrb1wiLCBcIm1vZCtwXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc2hvdygpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxufVxuIl19
