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

},{"./indent.js":5,"./text-mode.js":7,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","jquery":"jquery","signals":"signals","underscore":"underscore"}],2:[function(require,module,exports){
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
  
  finder.path_changed.add(function(path) {
    model.update(path)
  })
  
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

},{"jquery":"jquery","signals":"signals"}],4:[function(require,module,exports){
var $ = require("jquery")
var _ = require("underscore")
var Signal = require("signals").Signal
var Mousetrap = require("mousetrap")
var editor_manager = require("./editor.js")
var FinderSuggest = require("./finder-suggest.js")

var _setLastPath = function(path) {
  localStorage.setItem("finder-path", path)
}

var _getLastPath = function() {
  return localStorage.getItem("finder-path") || "/"
}

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
  
  var path_input = $("#finder-path").val(_getLastPath())
  
  model.visibility_changed.add(function(visible) {
    if (visible) {
      $("#finder").addClass("active")
    }
    else {
      $("#finder").removeClass("active")
    }
  })
  
  // start suggest
  var pathChanged = _.debounce(function() {
    model.setPath(path_input.val())
  }, 300)
  var path_watcher = setInterval(function() {
    var current = path_input.val()
    if (current != _getLastPath()) {
      _setLastPath(current)
      pathChanged()
    }
  }, 50)
  
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

},{"./editor.js":1,"./finder-suggest.js":3,"jquery":"jquery","mousetrap":"mousetrap","signals":"signals","underscore":"underscore"}],5:[function(require,module,exports){
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

},{"./rotate.js":6}],6:[function(require,module,exports){
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

},{"signals":"signals"}],7:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9yb3RhdGUuanMiLCJqcy90ZXh0LW1vZGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpO1xucmVxdWlyZShcImNvZGVtaXJyb3ItYWRkb25cIik7XG5yZXF1aXJlKFwiLi90ZXh0LW1vZGUuanNcIik7XG5cbi8vIEVkaXRvck1hbmFnZXJcbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc3RhdHVzX2NoYW5nZWQgPSBuZXcgU2lnbmFsKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgZGF0YToge1xuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSl7XG4gICAgICBpZiAocmVwbHkuZXJyb3IpIHtcbiAgICAgICAgYWxlcnQocmVwbHkuZXJyb3IpO1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGVuY29kaW5nID0gcmVwbHkuZW5jb2Rpbmc7XG4gICAgICB2YXIgZWRpdG9yID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZWRpdG9yXCIpLmFwcGVuZFRvKFwiI2VkaXRvcnNcIik7XG4gICAgICB2YXIgbW9kZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIik7XG4gICAgICAgIHZhciBtb2RlID0ge1xuICAgICAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICAgICAgdGFnOiBcInBocFwiLFxuICAgICAgICB9W2V4dGVuc2lvbl07XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlLm1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwidGV4dFwiO1xuICAgICAgfSkoKTtcbiAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvZGVfbWlycm9yID0gQ29kZU1pcnJvcihlZGl0b3JbMF0sIHtcbiAgICAgICAgICB2YWx1ZTogcmVwbHkuY29udGVudCxcbiAgICAgICAgICBsaW5lTnVtYmVyczogdHJ1ZSxcbiAgICAgICAgICB0YWJTaXplOiA0LFxuICAgICAgICAgIHNob3dDdXJzb3JXaGVuU2VsZWN0aW5nOiB0cnVlLFxuICAgICAgICAgIGF1dG9DbG9zZUJyYWNrZXRzOiB0cnVlLFxuICAgICAgICAgIG1hdGNoQnJhY2tldHM6IHRydWUsXG4gICAgICAgICAgbWF0Y2hUYWdzOiB0cnVlLFxuICAgICAgICAgIGF1dG9DbG9zZVRhZ3M6IHRydWUsXG4gICAgICAgICAgc3R5bGVBY3RpdmVMaW5lOiB0cnVlLFxuICAgICAgICAgIHN0eWxlU2VsZWN0ZWRUZXh0OiB0cnVlLFxuICAgICAgICAgIG1vZGU6IG1vZGUsXG4gICAgICAgICAgZHJhZ0Ryb3A6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKTtcbiAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiZXh0cmFLZXlzXCIsIHtcbiAgICAgICAgICBcIkN0cmwtU3BhY2VcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICAgICAgICBcIkN0cmwtVVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgICAgICAgIFwiQ3RybC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgICAgICAgIFwiQ21kLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgICAgICAgVGFiOiBcImluZGVudEF1dG9cIixcbiAgICAgICAgICBcIkN0cmwtRFwiOiBmYWxzZSxcbiAgICAgICAgICBcIkNtZC1EXCI6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwic3R5bGVBY3RpdmVMaW5lXCIsIHtub25FbXB0eTogdHJ1ZX0pO1xuICAgICAgICAvLyBtYWludGFpbiBpbmRlbnRhdGlvbiBvbiBwYXN0ZVxuICAgICAgICBjb2RlX21pcnJvci5vbihcImJlZm9yZUNoYW5nZVwiLCBmdW5jdGlvbihjbSwgY2hhbmdlKSB7XG4gICAgICAgICAgaWYgKGNoYW5nZS5vcmlnaW4gIT0gXCJwYXN0ZVwiKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChDb2RlTWlycm9yLmNtcFBvcyhjaGFuZ2UuZnJvbSwgY2hhbmdlLnRvKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgaW5zZXJ0aW9uIHBvaW50IGlzIGF0IHRoZSBlbmQgb2YgdGhlIGxpbmVcbiAgICAgICAgICB2YXIgZGVzdCA9IGNtLmdldExpbmUoY2hhbmdlLmZyb20ubGluZSk7XG4gICAgICAgICAgaWYgKGRlc3QubGVuZ3RoICE9IGNoYW5nZS5mcm9tLmNoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBsaW5lIGNvbnNpc3RzIG9mIG9ubHkgd2hpdGUgc3BhY2VzXG4gICAgICAgICAgaWYgKGRlc3QubWF0Y2goL1teIFxcdF0vKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyByZW1vdmUgdGhlIGxhc3QgZW1wdHkgbGluZVxuICAgICAgICAgIGlmIChjaGFuZ2UudGV4dFtjaGFuZ2UudGV4dC5sZW5ndGggLSAxXSA9PSBcIlwiKSB7XG4gICAgICAgICAgICBjaGFuZ2UudGV4dC5wb3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGJhc2VfaW5kZW50ID0gY2hhbmdlLnRleHRbMF0ubWF0Y2goL15bIFxcdF0qLylbMF07XG4gICAgICAgICAgY2hhbmdlLnRleHQgPSBjaGFuZ2UudGV4dC5tYXAoZnVuY3Rpb24obGluZSwgaSkge1xuICAgICAgICAgICAgbGluZSA9IGxpbmUubWF0Y2goL14oWyBcXHRdKikoLiopLyk7XG4gICAgICAgICAgICB2YXIgaW5kZW50ID0gbGluZVsxXTtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gbGluZVsyXTtcbiAgICAgICAgICAgIGluZGVudCA9IChkZXN0ICsgaW5kZW50KS5zdWJzdHIoMCwgZGVzdC5sZW5ndGggKyBpbmRlbnQubGVuZ3RoIC0gYmFzZV9pbmRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgIHJldHVybiBpbmRlbnQgKyB0ZXh0O1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNoYW5nZS50ZXh0WzBdID0gY2hhbmdlLnRleHRbMF0uc3Vic3RyKGRlc3QubGVuZ3RoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvZGVfbWlycm9yLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdXRvU2F2ZSgpO1xuICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2goXG4gICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgY29kZV9taXJyb3IuaXNDbGVhbihjb2RlX21pcnJvci5sYXN0X3NhdmUpID8gXCJjbGVhblwiOiBcIm1vZGlmaWVkXCJcbiAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGNtX2lucHV0ID0gY29kZV9taXJyb3IuZ2V0SW5wdXRGaWVsZCgpO1xuICAgICAgICAkKGNtX2lucHV0KS5hZGRDbGFzcyhcIm1vdXNldHJhcFwiKTsgLy8gZW5hYmxlIGhvdGtleVxuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrYlwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvV29yZExlZnRcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2ZcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJnb1dvcmRSaWdodFwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQraFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImRlbFdvcmRCZWZvcmVcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJkZWxXb3JkQWZ0ZXJcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK2RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvZGVfbWlycm9yLmZpbmRXb3JkQXQoaS5hbmNob3IpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMoXG4gICAgICAgICAgICBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgICAgICAgICBsaW5lOiBpLmhlYWQubGluZSArIDEsXG4gICAgICAgICAgICAgICAgICBjaDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaGVhZDoge1xuICAgICAgICAgICAgICAgICAgbGluZTogaS5hbmNob3IubGluZSxcbiAgICAgICAgICAgICAgICAgIGNoOiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2Qrc2hpZnQrbFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgc2VsZWN0aW9ucyA9IGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCk7XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbnMubGVuZ3RoICE9IDEpIHtcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmc7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBhbmNob3IgPSBzZWxlY3Rpb25zWzBdLmFuY2hvcjtcbiAgICAgICAgICB2YXIgaGVhZCA9IHNlbGVjdGlvbnNbMF0uaGVhZDtcbiAgICAgICAgICB2YXIgbmV3X3NlbGVjdGlvbnMgPSBbXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gYW5jaG9yLmxpbmU7IGkgPD0gaGVhZC5saW5lOyArK2kpIHtcbiAgICAgICAgICAgIG5ld19zZWxlY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBpLFxuICAgICAgICAgICAgICAgIGNoOiBpID09IGFuY2hvci5saW5lID8gYW5jaG9yLmNoIDogMFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgICAgICAgbGluZTogaSxcbiAgICAgICAgICAgICAgICBjaDogaSA9PSBoZWFkLmxpbmUgPyBoZWFkLmNoIDogSW5maW5pdHlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMobmV3X3NlbGVjdGlvbnMpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAvLyBzdGF0dXMgYmFyXG4gICAgICAgIGVkaXRvci5hcHBlbmQoXG4gICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAgICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1lb2xcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmdcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgICB2YXIgdXBkYXRlTW9kZUluZm8gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgbW9kZSA9IGNvZGVfbWlycm9yLmdldE1vZGUoKTtcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbW9kZVwiKS50ZXh0KG1vZGUubmFtZSk7XG4gICAgICAgIH07XG4gICAgICAgIHVwZGF0ZU1vZGVJbmZvKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBpbmRlbnRcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB1cGRhdGVJbmRlbnRJbmZvID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudC5qc1wiKTtcbiAgICAgICAgICB2YXIgaW5kZW50ID0gSW5kZW50KCk7XG4gICAgICAgICAgaW5kZW50LmNoYW5nZWQuYWRkKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlID09IFwiVEFCXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRVbml0XCIsIE51bWJlcih0eXBlLnJlcGxhY2UoXCJTUFwiLCBcIlwiKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXBkYXRlSW5kZW50SW5mbyh0eXBlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbmRlbnQuc2V0KEluZGVudC5kZXRlY3RJbmRlbnRUeXBlKHJlcGx5LmNvbnRlbnQpKVxuICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpbmRlbnQucm90YXRlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBsaW5lIHNlcHJhdG9yXG4gICAgICAgIHZhciBlb2wgPSBzZWxmLmRldGVjdEVvbChyZXBseS5jb250ZW50KTtcbiAgICAgICAgdmFyIGVvbF9uYW1lcyA9IHtcbiAgICAgICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICAgICAgXCJcXG5cIjogXCJMRlwiLFxuICAgICAgICAgIFwiXFxyXFxuXCI6IFwiQ1JMRlwiXG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lb2xcIikudGV4dChlb2xfbmFtZXNbZW9sXSk7XG4gICAgICAgIC8vIGVuY29kaW5nXG4gICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1lbmNvZGluZ1wiKS50ZXh0KGVuY29kaW5nKTtcbiAgICAgICAgXG4gICAgICAgIGVkaXRvci5kYXRhKFwicGF0aFwiLCBwYXRoKTtcbiAgICAgICAgZWRpdG9yLmRhdGEoXCJjb2RlX21pcnJvclwiLCBjb2RlX21pcnJvcik7XG4gICAgICAgIC8vIHNhdmVcbiAgICAgICAgdmFyIHNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZ2VuZXJhdGlvbiA9IGNvZGVfbWlycm9yLmNoYW5nZUdlbmVyYXRpb24odHJ1ZSk7XG4gICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogXCIvd3JpdGUucGhwXCIsXG4gICAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgZW5jb2Rpbmc6IGVuY29kaW5nLFxuICAgICAgICAgICAgICBjb250ZW50OiBjb2RlX21pcnJvci5nZXRWYWx1ZSgpLnJlcGxhY2UoL1xcbi9nLCBlb2wpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgICAgaWYgKHJlcGx5ID09IFwib2tcIikge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5sYXN0X3NhdmUgPSBnZW5lcmF0aW9uO1xuICAgICAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIFwiY2xlYW5cIik7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLiBcIiArIHJlcGx5LmVycm9yKTtcbiAgICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuXCIpO1xuICAgICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvLyBhdXRvIHNhdmVcbiAgICAgICAgdmFyIGF1dG9TYXZlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIWNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSkge1xuICAgICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgNDAwMCk7XG4gICAgICAgIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgICAgICAgTW91c2V0cmFwKGVkaXRvclswXSkuYmluZChcIm1vZCtzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gbWFya3NcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBtYXJrcyA9IFtdO1xuICAgICAgICAgIE1vdXNldHJhcChlZGl0b3JbMF0pLmJpbmQoXCJtb2QrbVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSBjb2RlX21pcnJvci5nZXRDdXJzb3IoKTtcbiAgICAgICAgICAgIGlmIChtYXJrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdmFyIGxhc3QgPSBtYXJrc1ttYXJrcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgaWYgKGxhc3QubGluZSA9PSBjdXJzb3IubGluZSAmJiBsYXN0LmNoID09IGN1cnNvci5jaCkge1xuICAgICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMobWFya3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7aGVhZDogbSwgYW5jaG9yOiBtfTtcbiAgICAgICAgICAgICAgICB9KSwgbWFya3MubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgbWFya3MgPSBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hcmtzLnB1c2goY3Vyc29yKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KSgpO1xuICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICByZWplY3QoKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gJChcIiNlZGl0b3JzIC5lZGl0b3JcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAkKHRoaXMpLmRhdGEoXCJwYXRoXCIpID09IHBhdGg7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICAkKFwiI2VkaXRvcnMgLmVkaXRvci5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG4gIHZhciBmb3VuZCA9IHRoaXMuZ2V0KHBhdGgpO1xuICBpZiAoZm91bmQubGVuZ3RoKSB7XG4gICAgZm91bmQuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gICAgZm91bmQuZGF0YShcImNvZGVfbWlycm9yXCIpLmZvY3VzKCk7XG4gICAgZm91bmQuZGF0YShcImNvZGVfbWlycm9yXCIpLnJlZnJlc2goKTtcbiAgfVxufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldEFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLmRhdGEoXCJwYXRoXCIpO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLmdldChwYXRoKS5yZW1vdmUoKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5kZXRlY3RFb2wgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXFxuXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXFxuXCI7XG4gIH1cbiAgaWYgKGNvbnRlbnQubWF0Y2goXCJcXHJcIikpIHtcbiAgICByZXR1cm4gXCJcXHJcIjtcbiAgfVxuICByZXR1cm4gXCJcXG5cIjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEVkaXRvck1hbmFnZXIoKTtcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpXG5cbnZhciBGaWxlTWFuYWdlciA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgb3BlbmVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBjbG9zZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGFjdGl2YXRlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgXG4gICAgYWN0aXZlOiBudWxsLFxuICAgIGZpbGVzOiBbXSxcbiAgICBcbiAgICBnZXRGaWxlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZmlsZXNcbiAgICB9LFxuICAgIFxuICAgIG9wZW46IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IFwiVGhlIHBhdGggaXMgbnVsbFwiXG4gICAgICB9XG4gICAgICAvLyB0cnkgdG8gYWN0aXZhdGUgYWxyZWFkeSBvcGVuZWQgZmlsZXNcbiAgICAgIGlmIChtb2RlbC5hY3RpdmF0ZShwYXRoKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGVkaXRvcl9tYW5hZ2VyLm9wZW4ocGF0aCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kZWwuZmlsZXMucHVzaChwYXRoKVxuICAgICAgICBtb2RlbC5vcGVuZWQuZGlzcGF0Y2gocGF0aClcbiAgICAgICAgbW9kZWwuYWN0aXZhdGUocGF0aClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBnZXRBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmFjdGl2ZVxuICAgIH0sXG4gICAgXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICAgIGlmIChwYXRoICE9PSBudWxsICYmIG1vZGVsLmZpbGVzLmluZGV4T2YocGF0aCkgPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICBmaW5kZXIuc2V0UGF0aChwYXRoKVxuICAgICAgZWRpdG9yX21hbmFnZXIuYWN0aXZhdGUocGF0aClcbiAgICAgIG1vZGVsLmFjdGl2ZSA9IHBhdGhcbiAgICAgIG1vZGVsLmFjdGl2YXRlZC5kaXNwYXRjaChwYXRoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFxuICAgIG5leHRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUodHJ1ZSlcbiAgICB9LFxuICAgIFxuICAgIHByZXZGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUoZmFsc2UpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGVGaWxlOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuZmlsZXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4XG4gICAgICBpZiAobW9kZWwuYWN0aXZlID09PSBudWxsKSB7XG4gICAgICAgIGlkeCA9IG5leHQgPyAwIDogbW9kZWwuZmlsZXMubGVuZ3RoIC0gMVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlkeCA9IG1vZGVsLmZpbGVzLmluZGV4T2YobW9kZWwuYWN0aXZlKVxuICAgICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgICAgaWR4ID0gKGlkeCArIG1vZGVsLmZpbGVzLmxlbmd0aCkgJSBtb2RlbC5maWxlcy5sZW5ndGhcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFjdGl2YXRlKG1vZGVsLmZpbGVzW2lkeF0pXG4gICAgfSxcbiAgICBcbiAgICBjbG9zZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgdmFyIGlkeCA9IG1vZGVsLmZpbGVzLmluZGV4T2YocGF0aClcbiAgICAgIGlmIChpZHggPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIGlmIChtb2RlbC5maWxlcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgIG1vZGVsLmFjdGl2YXRlKG51bGwpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbW9kZWwucHJldkZpbGUoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlZGl0b3JfbWFuYWdlci5jbG9zZShwYXRoKVxuICAgICAgbW9kZWwuZmlsZXMuc3BsaWNlKGlkeCwgMSlcbiAgICAgIG1vZGVsLmNsb3NlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgcmVsb2FkOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5jbG9zZShwYXRoKVxuICAgICAgbW9kZWwub3BlbihwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIC8vIHZpZXdcbiAgdmFyIGdldEZpbGVFbGVtZW50ID0gZnVuY3Rpb24ocGF0aCkge1xuICAgIHJldHVybiAkKFwiI2ZpbGVzIC5maWxlLWl0ZW1cIikuZmlsdGVyKGZ1bmN0aW9uKGlkeCwgaXRlbSkge1xuICAgICAgcmV0dXJuICQoaXRlbSkuZGF0YShcInBhdGhcIikgPT0gcGF0aFxuICAgIH0pXG4gIH1cbiAgXG4gIG1vZGVsLm9wZW5lZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIilcbiAgICB2YXIgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKVxuICAgICQoXCI8ZGl2PlwiKS5kYXRhKFwicGF0aFwiLCBwYXRoKS5hZGRDbGFzcyhcImZpbGUtaXRlbVwiKS5hcHBlbmQoXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJkaXJcIikudGV4dChkaXIpLFxuICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwibmFtZVwiKS50ZXh0KG5hbWUpLFxuICAgICAgJCgnPGRpdiBjbGFzcz1cInN0YXR1cyBjbGVhblwiPicpXG4gICAgKS5hcHBlbmRUbyhcIiNmaWxlc1wiKVxuICB9KVxuICBcbiAgbW9kZWwuY2xvc2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgZ2V0RmlsZUVsZW1lbnQocGF0aCkucmVtb3ZlKClcbiAgfSlcbiAgXG4gIG1vZGVsLmFjdGl2YXRlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGdldEZpbGVFbGVtZW50KHBhdGgpLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gIH0pXG4gIFxuICBlZGl0b3JfbWFuYWdlci5zdGF0dXNfY2hhbmdlZC5hZGQoZnVuY3Rpb24ocGF0aCwgc3RhdHVzKSB7XG4gICAgdmFyIGVsID0gZ2V0RmlsZUVsZW1lbnQocGF0aClcbiAgICBlbC5maW5kKFwiLnN0YXR1c1wiKS5yZW1vdmVDbGFzcyhcImNsZWFuIGVycm9yIG1vZGlmaWVkXCIpLmFkZENsYXNzKHN0YXR1cylcbiAgfSlcbiAgXG4gIGZpbmRlci5zZWxlY3RlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIG1vZGVsLm9wZW4ocGF0aClcbiAgfSlcbiAgXG4gICQoXCIjZmlsZXNcIikub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIG1vZGVsLmFjdGl2YXRlKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKFwicGF0aFwiKSlcbiAgfSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVNYW5hZ2VyXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcblxudmFyIEZpbmRlclN1Z2dlc3QgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIGl0ZW1zOiBbXSxcbiAgICBjdXJzb3I6IG51bGwsIC8vIGhpZ2hsaWdodGVkIGl0ZW1cbiAgICBcbiAgICBpdGVtc19jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgY3Vyc29yX21vdmVkOiBuZXcgU2lnbmFsKCksXG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgIHVybDogXCIvZmluZGVyLnBocFwiLFxuICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJmYWlsZWQgdG8gZmV0Y2ggc3VnZ2VzdCBmb3IgdGhlIHBhdGg6IFwiICsgcGF0aClcbiAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgbW9kZWwuc2V0SXRlbXMocmVwbHkuaXRlbXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICByZXR1cm4gcmVwbHkuYmFzZSArIGlcbiAgICAgICAgfSkpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2V0SXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IobnVsbClcbiAgICAgIG1vZGVsLml0ZW1zID0gaXRlbXNcbiAgICAgIG1vZGVsLml0ZW1zX2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwuaXRlbXMpXG4gICAgfSxcbiAgICBcbiAgICBnZXRJdGVtczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuaXRlbXNcbiAgICB9LFxuICAgIFxuICAgIGdldEN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuY3Vyc29yXG4gICAgfSxcbiAgICBcbiAgICBzZXRDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5jdXJzb3IpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jdXJzb3IgPSBwYXRoXG4gICAgICBtb2RlbC5jdXJzb3JfbW92ZWQuZGlzcGF0Y2gobW9kZWwuY3Vyc29yKVxuICAgIH0sXG4gICAgXG4gICAgbW92ZUN1cnNvcjogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmN1cnNvciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAobW9kZWwuaXRlbXMubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbMF0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaXRlbXMuaW5kZXhPZihtb2RlbC5jdXJzb3IpXG4gICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgIGlkeCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vZGVsLml0ZW1zLmxlbmd0aCAtIDEsIGlkeCkpXG4gICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbaWR4XSlcbiAgICB9LFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKHBhdGgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBtb2RlbC51cGRhdGUocGF0aClcbiAgfSlcbiAgXG4gIC8vIHZpZXdcbiAgdmFyIGxpc3QgPSAkKFwiI2ZpbmRlci1pdGVtc1wiKVxuICBtb2RlbC5pdGVtc19jaGFuZ2VkLmFkZChmdW5jdGlvbihpdGVtcykge1xuICAgIGxpc3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIikuZW1wdHkoKVxuICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSAmJiBpdGVtc1swXSA9PSBtb2RlbC5nZXRDdXJzb3IoKSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHZhciBuYW1lX3J4ID0gbmV3IFJlZ0V4cChcIi8oW14vXSovPykkXCIpXG4gICAgbGlzdC5hcHBlbmQoaXRlbXMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZV9yeC5leGVjKGl0ZW0pWzFdXG4gICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgfSkpXG4gICAgbGlzdC5zY3JvbGxUb3AoMCkuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgfSlcbiAgXG4gIG1vZGVsLmN1cnNvcl9tb3ZlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIGxpc3QuZmluZChcImEuc2VsZWN0ZWRcIikucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKVxuICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdmFyIGEgPSBsaXN0LmZpbmQoXCJhXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAkKHRoaXMpLmRhdGEoXCJwYXRoXCIpID09IHBhdGhcbiAgICB9KVxuICAgIGlmIChhLmxlbmd0aCA9PSAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgYS5hZGRDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgXG4gICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgIHZhciBzY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdmFyIGhlaWdodCA9IHRhcmdldC5oZWlnaHQoKVxuICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICB2YXIgYm90dG9tID0gdG9wICsgaGVpZ2h0XG4gICAgICB2YXIgdmlld19oZWlnaHQgPSBsaXN0LmlubmVySGVpZ2h0KClcbiAgICAgIGlmICh0b3AgLSBsaXN0LnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgICBsaXN0LnNjcm9sbFRvcCh0b3ApXG4gICAgICB9XG4gICAgICBpZiAoYm90dG9tIC0gbGlzdC5zY3JvbGxUb3AoKSA+IHZpZXdfaGVpZ2h0KSB7XG4gICAgICAgIGxpc3Quc2Nyb2xsVG9wKGJvdHRvbSAtIHZpZXdfaGVpZ2h0KVxuICAgICAgfVxuICAgIH1cbiAgICBzY3JvbGxJbnRvVmlldyhhKVxuICB9KVxuICBcbiAgLy8gd2hlbiBpdGVtIHdhcyBzZWxlY3RlZFxuICBsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIC8vIHByZXZlbnQgZnJvbSBsb29zaW5nIGZvY3VzXG4gIGxpc3Qub24oXCJtb3VzZWRvd25cIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgfSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbnZhciBlZGl0b3JfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci5qc1wiKVxudmFyIEZpbmRlclN1Z2dlc3QgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdC5qc1wiKVxuXG52YXIgX3NldExhc3RQYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImZpbmRlci1wYXRoXCIsIHBhdGgpXG59XG5cbnZhciBfZ2V0TGFzdFBhdGggPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZmluZGVyLXBhdGhcIikgfHwgXCIvXCJcbn1cblxudmFyIEZpbmRlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBwYXRoX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICB2aXNpYmlsaXR5X2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBwYXRoOiBcIlwiLFxuICAgIHZpc2libGU6IGZhbHNlLFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChwYXRoKVxuICAgICAgaWYgKHBhdGguc3Vic3RyKC0xKSA9PSBcIi9cIikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmhpZGUoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IHRydWVcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gZmFsc2VcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwucGF0aFxuICAgIH0sXG4gICAgXG4gICAgc2V0UGF0aDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwucGF0aCA9IHBhdGhcbiAgICAgIG1vZGVsLnBhdGhfY2hhbmdlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgZ29Ub1BhcmVudERpcmVjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKFxuICAgICAgICBtb2RlbC5wYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKVxuICAgICAgKVxuICAgIH0sXG4gIH1cbiAgXG4gIHZhciBzdWdnZXN0ID0gRmluZGVyU3VnZ2VzdChtb2RlbClcbiAgc3VnZ2VzdC5zZWxlY3RlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIG1vZGVsLnNlbGVjdChwYXRoKVxuICB9KVxuICBcbiAgLy8gVmlld1xuICBcbiAgdmFyIHBhdGhfaW5wdXQgPSAkKFwiI2ZpbmRlci1wYXRoXCIpLnZhbChfZ2V0TGFzdFBhdGgoKSlcbiAgXG4gIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAkKFwiI2ZpbmRlclwiKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgfVxuICB9KVxuICBcbiAgLy8gc3RhcnQgc3VnZ2VzdFxuICB2YXIgcGF0aENoYW5nZWQgPSBfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLnNldFBhdGgocGF0aF9pbnB1dC52YWwoKSlcbiAgfSwgMzAwKVxuICB2YXIgcGF0aF93YXRjaGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBwYXRoX2lucHV0LnZhbCgpXG4gICAgaWYgKGN1cnJlbnQgIT0gX2dldExhc3RQYXRoKCkpIHtcbiAgICAgIF9zZXRMYXN0UGF0aChjdXJyZW50KVxuICAgICAgcGF0aENoYW5nZWQoKVxuICAgIH1cbiAgfSwgNTApXG4gIFxuICBtb2RlbC5wYXRoX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBwYXRoX2lucHV0LnZhbChwYXRoKVxuICB9KVxuICBcbiAgLy8gb3BlbiBmaWxlIHdpdGggZW50ZXIga2V5XG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZW50ZXJcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhdGggPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgbW9kZWwuc2VsZWN0KHBhdGggPyBwYXRoIDogcGF0aF9pbnB1dC52YWwoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbiAgXG4gIC8vIHBhdGggY29tcGxldGlvbiB3aXRoIHRhYiBrZXlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ0YWJcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN1cnNvciA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICBpZiAoY3Vyc29yKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKGN1cnNvcilcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICB2YXIgaXRlbXMgPSBzdWdnZXN0LmdldEl0ZW1zKClcbiAgICBpZiAoaXRlbXMubGVuZ3RoID09IDEpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgoaXRlbXNbMF0pXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgc3VnZ2VzdC51cGRhdGUocGF0aF9pbnB1dC52YWwoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbiAgXG4gIC8vIHF1aXQgZmluZGVyIHdpdGggZXNjIGtleVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImVzY1wiLCBmdW5jdGlvbigpIHtcbiAgICBtb2RlbC5oaWRlKClcbiAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShlZGl0b3JfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbiAgXG4gIC8vIHNlbGVjdCBpdGVtIHdpdGggdXAvZG93biBrZXlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJkb3duXCIsIGZ1bmN0aW9uKCkge1xuICAgIHN1Z2dlc3QubW92ZUN1cnNvcih0cnVlKVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcInVwXCIsIGZ1bmN0aW9uKCkge1xuICAgIHN1Z2dlc3QubW92ZUN1cnNvcihmYWxzZSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbiAgXG4gIC8vXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwibW9kK3VcIiwgZnVuY3Rpb24oKSB7XG4gICAgbW9kZWwuZ29Ub1BhcmVudERpcmVjdG9yeSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG4gIFxuICAvLyBmb2N1cyBvbiBzaG93blxuICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgcGF0aF9pbnB1dC5mb2N1cygpXG4gICAgfVxuICB9KVxuICBcbiAgLy8gaGlkZSBvbiBibHVyXG4gIHBhdGhfaW5wdXQuYmx1cihmdW5jdGlvbigpIHtcbiAgICBtb2RlbC5oaWRlKClcbiAgfSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIFJvdGF0ZSA9IHJlcXVpcmUoXCIuL3JvdGF0ZS5qc1wiKVxuXG52YXIgSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICByZXR1cm4gUm90YXRlKFtcIjRTUFwiLCBcIjJTUFwiLCBcIlRBQlwiXSwgdHlwZSlcbn1cblxuSW5kZW50LmRldGVjdEluZGVudFR5cGUgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKC9bXFxyXFxuXStcXHQvKSkge1xuICAgIHJldHVybiBcIlRBQlwiXG4gIH1cbiAgdmFyIGxpbmVzID0gY29udGVudC5zcGxpdCgvW1xcclxcbl0rLylcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpbmRlbnQgPSBsaW5lc1tpXS5yZXBsYWNlKC9eKCAqKS4qLywgXCIkMVwiKVxuICAgIGlmIChpbmRlbnQubGVuZ3RoID09IDIpIHtcbiAgICAgIHJldHVybiBcIjJTUFwiXG4gICAgfVxuICB9XG4gIHJldHVybiBcIjRTUFwiXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kZW50XG4iLCJcInVzZSBzdHJpY3RcIlxuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG5cbnZhciBSb3RhdGUgPSBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlKSB7XG4gIHZhciBpc1ZhbGlkVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdmFsdWVzLmluZGV4T2YodikgIT0gLTFcbiAgfVxuICBcbiAgdmFyIGNoZWNrVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKCFpc1ZhbGlkVmFsdWUodikpIHtcbiAgICAgIHRocm93IFwiaW52YWxpZCB2YWx1ZTogXCIgKyB2XG4gICAgfVxuICB9XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFsdWUgPSBudWxsXG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSB7XG4gICAgY2hhbmdlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgXG4gICAgZ2V0VmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZXNcbiAgICB9LFxuICAgIFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAobmV3X3ZhbHVlID09IHZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY2hlY2tWYWx1ZShuZXdfdmFsdWUpXG4gICAgICB2YWx1ZSA9IG5ld192YWx1ZVxuICAgICAgcm90YXRlLmNoYW5nZWQuZGlzcGF0Y2godmFsdWUpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IHZhbHVlcy5pbmRleE9mKHZhbHVlKVxuICAgICAgaWR4ID0gKGlkeCArIDEpICUgdmFsdWVzLmxlbmd0aFxuICAgICAgcm90YXRlLnNldCh2YWx1ZXNbaWR4XSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdGF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdGF0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzLnJ1biA9IGZ1bmN0aW9uKCkge1xuICB2YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxuICB2YXIgZmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyLmpzXCIpKClcbiAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIikoZmluZGVyKVxuICBcbiAgdmFyIHNhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaWxlcyA9IGZpbGVfbWFuYWdlci5nZXRGaWxlcygpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJvcGVuLWZpbGVzXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzKSlcbiAgfVxuICB2YXIgbG9hZEZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJvcGVuLWZpbGVzXCIpIHx8IFwiW11cIilcbiAgfVxuICBsb2FkRmlsZUxpc3QoKS5mb3JFYWNoKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBmaWxlX21hbmFnZXIub3BlbihwYXRoKVxuICB9KVxuICBcbiAgZmlsZV9tYW5hZ2VyLm9wZW5lZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBmaWxlX21hbmFnZXIuY2xvc2VkLmFkZChzYXZlRmlsZUxpc3QpXG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLm5leHRGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtzaGlmdCtcIiwgXCJtb2Qrc2hpZnQrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5jbG9zZShmaWxlX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrclwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnJlbG9hZCgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICAvLyBzaG93IGZpbmRlclxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrb1wiLCBcIm1vZCtwXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc2hvdygpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxufVxuIl19
