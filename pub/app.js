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
  
  var path_input = $("#finder-path")
  
  model.visibility_changed.add(function(visible) {
    if (visible) {
      $("#finder").addClass("active")
    }
    else {
      $("#finder").removeClass("active")
    }
  })
  
  var last_path = path_input.val()
  var pathChanged = _.debounce(function() {
    model.setPath(path_input.val())
  }, 300)
  var path_watcher = setInterval(function() {
    var current = path_input.val()
    if (current != last_path) {
      last_path = current
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9yb3RhdGUuanMiLCJqcy90ZXh0LW1vZGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpO1xudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIik7XG5yZXF1aXJlKFwiY29kZW1pcnJvci1hZGRvblwiKTtcbnJlcXVpcmUoXCIuL3RleHQtbW9kZS5qc1wiKTtcblxuLy8gRWRpdG9yTWFuYWdlclxudmFyIEVkaXRvck1hbmFnZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zdGF0dXNfY2hhbmdlZCA9IG5ldyBTaWduYWwoKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAkLmFqYXgoe1xuICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgIHVybDogXCIvcmVhZC5waHBcIixcbiAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KXtcbiAgICAgIGlmIChyZXBseS5lcnJvcikge1xuICAgICAgICBhbGVydChyZXBseS5lcnJvcik7XG4gICAgICAgIHJlamVjdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZW5jb2RpbmcgPSByZXBseS5lbmNvZGluZztcbiAgICAgIHZhciBlZGl0b3IgPSAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJlZGl0b3JcIikuYXBwZW5kVG8oXCIjZWRpdG9yc1wiKTtcbiAgICAgIHZhciBtb2RlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZXh0ZW5zaW9uID0gcGF0aC5yZXBsYWNlKC8uKlsuXSguKykkLywgXCIkMVwiKTtcbiAgICAgICAgdmFyIG1vZGUgPSB7XG4gICAgICAgICAgaHRtbDogXCJwaHBcIixcbiAgICAgICAgICB0YWc6IFwicGhwXCIsXG4gICAgICAgIH1bZXh0ZW5zaW9uXTtcbiAgICAgICAgaWYgKG1vZGUpIHtcbiAgICAgICAgICByZXR1cm4gbW9kZTtcbiAgICAgICAgfVxuICAgICAgICBtb2RlID0gQ29kZU1pcnJvci5maW5kTW9kZUJ5RXh0ZW5zaW9uKGV4dGVuc2lvbik7XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGUubW9kZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJ0ZXh0XCI7XG4gICAgICB9KSgpO1xuICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29kZV9taXJyb3IgPSBDb2RlTWlycm9yKGVkaXRvclswXSwge1xuICAgICAgICAgIHZhbHVlOiByZXBseS5jb250ZW50LFxuICAgICAgICAgIGxpbmVOdW1iZXJzOiB0cnVlLFxuICAgICAgICAgIHRhYlNpemU6IDQsXG4gICAgICAgICAgc2hvd0N1cnNvcldoZW5TZWxlY3Rpbmc6IHRydWUsXG4gICAgICAgICAgYXV0b0Nsb3NlQnJhY2tldHM6IHRydWUsXG4gICAgICAgICAgbWF0Y2hCcmFja2V0czogdHJ1ZSxcbiAgICAgICAgICBtYXRjaFRhZ3M6IHRydWUsXG4gICAgICAgICAgYXV0b0Nsb3NlVGFnczogdHJ1ZSxcbiAgICAgICAgICBzdHlsZUFjdGl2ZUxpbmU6IHRydWUsXG4gICAgICAgICAgc3R5bGVTZWxlY3RlZFRleHQ6IHRydWUsXG4gICAgICAgICAgbW9kZTogbW9kZSxcbiAgICAgICAgICBkcmFnRHJvcDogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBDb2RlTWlycm9yLnJlZ2lzdGVySGVscGVyKFwiaGludFdvcmRzXCIsIG1vZGUsIG51bGwpO1xuICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJleHRyYUtleXNcIiwge1xuICAgICAgICAgIFwiQ3RybC1TcGFjZVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgICAgICAgIFwiQ3RybC1VXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgICAgICAgXCJDdHJsLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgICAgICAgXCJDbWQtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICAgICAgICBUYWI6IFwiaW5kZW50QXV0b1wiLFxuICAgICAgICAgIFwiQ3RybC1EXCI6IGZhbHNlLFxuICAgICAgICAgIFwiQ21kLURcIjogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJzdHlsZUFjdGl2ZUxpbmVcIiwge25vbkVtcHR5OiB0cnVlfSk7XG4gICAgICAgIC8vIG1haW50YWluIGluZGVudGF0aW9uIG9uIHBhc3RlXG4gICAgICAgIGNvZGVfbWlycm9yLm9uKFwiYmVmb3JlQ2hhbmdlXCIsIGZ1bmN0aW9uKGNtLCBjaGFuZ2UpIHtcbiAgICAgICAgICBpZiAoY2hhbmdlLm9yaWdpbiAhPSBcInBhc3RlXCIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKENvZGVNaXJyb3IuY21wUG9zKGNoYW5nZS5mcm9tLCBjaGFuZ2UudG8pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBpbnNlcnRpb24gcG9pbnQgaXMgYXQgdGhlIGVuZCBvZiB0aGUgbGluZVxuICAgICAgICAgIHZhciBkZXN0ID0gY20uZ2V0TGluZShjaGFuZ2UuZnJvbS5saW5lKTtcbiAgICAgICAgICBpZiAoZGVzdC5sZW5ndGggIT0gY2hhbmdlLmZyb20uY2gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGxpbmUgY29uc2lzdHMgb2Ygb25seSB3aGl0ZSBzcGFjZXNcbiAgICAgICAgICBpZiAoZGVzdC5tYXRjaCgvW14gXFx0XS8pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCBlbXB0eSBsaW5lXG4gICAgICAgICAgaWYgKGNoYW5nZS50ZXh0W2NoYW5nZS50ZXh0Lmxlbmd0aCAtIDFdID09IFwiXCIpIHtcbiAgICAgICAgICAgIGNoYW5nZS50ZXh0LnBvcCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYmFzZV9pbmRlbnQgPSBjaGFuZ2UudGV4dFswXS5tYXRjaCgvXlsgXFx0XSovKVswXTtcbiAgICAgICAgICBjaGFuZ2UudGV4dCA9IGNoYW5nZS50ZXh0Lm1hcChmdW5jdGlvbihsaW5lLCBpKSB7XG4gICAgICAgICAgICBsaW5lID0gbGluZS5tYXRjaCgvXihbIFxcdF0qKSguKikvKTtcbiAgICAgICAgICAgIHZhciBpbmRlbnQgPSBsaW5lWzFdO1xuICAgICAgICAgICAgdmFyIHRleHQgPSBsaW5lWzJdO1xuICAgICAgICAgICAgaW5kZW50ID0gKGRlc3QgKyBpbmRlbnQpLnN1YnN0cigwLCBkZXN0Lmxlbmd0aCArIGluZGVudC5sZW5ndGggLSBiYXNlX2luZGVudC5sZW5ndGgpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGVudCArIHRleHQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY2hhbmdlLnRleHRbMF0gPSBjaGFuZ2UudGV4dFswXS5zdWJzdHIoZGVzdC5sZW5ndGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJjaGFuZ2VzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1dG9TYXZlKCk7XG4gICAgICAgICAgc2VsZi5zdGF0dXNfY2hhbmdlZC5kaXNwYXRjaChcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBjb2RlX21pcnJvci5pc0NsZWFuKGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSkgPyBcImNsZWFuXCI6IFwibW9kaWZpZWRcIlxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgY21faW5wdXQgPSBjb2RlX21pcnJvci5nZXRJbnB1dEZpZWxkKCk7XG4gICAgICAgICQoY21faW5wdXQpLmFkZENsYXNzKFwibW91c2V0cmFwXCIpOyAvLyBlbmFibGUgaG90a2V5XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtiXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZ29Xb3JkTGVmdFwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrZlwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvV29yZFJpZ2h0XCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtoXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZGVsV29yZEJlZm9yZVwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImRlbFdvcmRBZnRlclwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2QrZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKFxuICAgICAgICAgICAgY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICByZXR1cm4gY29kZV9taXJyb3IuZmluZFdvcmRBdChpLmFuY2hvcik7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK2xcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICAgICAgICAgIGxpbmU6IGkuaGVhZC5saW5lICsgMSxcbiAgICAgICAgICAgICAgICAgIGNoOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgICAgICAgICBsaW5lOiBpLmFuY2hvci5saW5lLFxuICAgICAgICAgICAgICAgICAgY2g6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtzaGlmdCtsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzZWxlY3Rpb25zID0gY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKTtcbiAgICAgICAgICBpZiAoc2VsZWN0aW9ucy5sZW5ndGggIT0gMSkge1xuICAgICAgICAgICAgLy8gRG8gbm90aGluZztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGFuY2hvciA9IHNlbGVjdGlvbnNbMF0uYW5jaG9yO1xuICAgICAgICAgIHZhciBoZWFkID0gc2VsZWN0aW9uc1swXS5oZWFkO1xuICAgICAgICAgIHZhciBuZXdfc2VsZWN0aW9ucyA9IFtdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSBhbmNob3IubGluZTsgaSA8PSBoZWFkLmxpbmU7ICsraSkge1xuICAgICAgICAgICAgbmV3X3NlbGVjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGksXG4gICAgICAgICAgICAgICAgY2g6IGkgPT0gYW5jaG9yLmxpbmUgPyBhbmNob3IuY2ggOiAwXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBpLFxuICAgICAgICAgICAgICAgIGNoOiBpID09IGhlYWQubGluZSA/IGhlYWQuY2ggOiBJbmZpbml0eVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhuZXdfc2VsZWN0aW9ucyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSA9IGNvZGVfbWlycm9yLmNoYW5nZUdlbmVyYXRpb24odHJ1ZSk7XG4gICAgICAgIC8vIHN0YXR1cyBiYXJcbiAgICAgICAgZWRpdG9yLmFwcGVuZChcbiAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWZvb3RcIj4nKS5hcHBlbmQoXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1lc3NhZ2VcIj4nKSxcbiAgICAgICAgICAgICQoJzxidXR0b24gY2xhc3M9XCJlZGl0b3ItaW5kZW50IGxpbmtcIiB0eXBlPVwiYnV0dG9uXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVvbFwiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1lbmNvZGluZ1wiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tb2RlXCI+JylcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICAgIHZhciB1cGRhdGVNb2RlSW5mbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBtb2RlID0gY29kZV9taXJyb3IuZ2V0TW9kZSgpO1xuICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tb2RlXCIpLnRleHQobW9kZS5uYW1lKTtcbiAgICAgICAgfTtcbiAgICAgICAgdXBkYXRlTW9kZUluZm8oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGluZGVudFxuICAgICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHVwZGF0ZUluZGVudEluZm8gPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLnRleHQodHlwZSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB2YXIgSW5kZW50ID0gcmVxdWlyZShcIi4vaW5kZW50LmpzXCIpO1xuICAgICAgICAgIHZhciBpbmRlbnQgPSBJbmRlbnQoKTtcbiAgICAgICAgICBpbmRlbnQuY2hhbmdlZC5hZGQoZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgaWYgKHR5cGUgPT0gXCJUQUJcIikge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCB0cnVlKTtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCA0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCBmYWxzZSk7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgTnVtYmVyKHR5cGUucmVwbGFjZShcIlNQXCIsIFwiXCIpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1cGRhdGVJbmRlbnRJbmZvKHR5cGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGluZGVudC5zZXQoSW5kZW50LmRldGVjdEluZGVudFR5cGUocmVwbHkuY29udGVudCkpXG4gICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGluZGVudC5yb3RhdGUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGxpbmUgc2VwcmF0b3JcbiAgICAgICAgdmFyIGVvbCA9IHNlbGYuZGV0ZWN0RW9sKHJlcGx5LmNvbnRlbnQpO1xuICAgICAgICB2YXIgZW9sX25hbWVzID0ge1xuICAgICAgICAgIFwiXFxyXCI6IFwiQ1JcIixcbiAgICAgICAgICBcIlxcblwiOiBcIkxGXCIsXG4gICAgICAgICAgXCJcXHJcXG5cIjogXCJDUkxGXCJcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWVvbFwiKS50ZXh0KGVvbF9uYW1lc1tlb2xdKTtcbiAgICAgICAgLy8gZW5jb2RpbmdcbiAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWVuY29kaW5nXCIpLnRleHQoZW5jb2RpbmcpO1xuICAgICAgICBcbiAgICAgICAgZWRpdG9yLmRhdGEoXCJwYXRoXCIsIHBhdGgpO1xuICAgICAgICBlZGl0b3IuZGF0YShcImNvZGVfbWlycm9yXCIsIGNvZGVfbWlycm9yKTtcbiAgICAgICAgLy8gc2F2ZVxuICAgICAgICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBnZW5lcmF0aW9uID0gY29kZV9taXJyb3IuY2hhbmdlR2VuZXJhdGlvbih0cnVlKTtcbiAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiBcIi93cml0ZS5waHBcIixcbiAgICAgICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgICBlbmNvZGluZzogZW5jb2RpbmcsXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IGNvZGVfbWlycm9yLmdldFZhbHVlKCkucmVwbGFjZSgvXFxuL2csIGVvbClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgICAgICBpZiAocmVwbHkgPT0gXCJva1wiKSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSA9IGdlbmVyYXRpb247XG4gICAgICAgICAgICAgIHNlbGYuc3RhdHVzX2NoYW5nZWQuZGlzcGF0Y2gocGF0aCwgXCJjbGVhblwiKTtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmVkLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuIFwiICsgcmVwbHkuZXJyb3IpO1xuICAgICAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIFwiZXJyb3JcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlIGZhaWxlZC5cIik7XG4gICAgICAgICAgICBzZWxmLnN0YXR1c19jaGFuZ2VkLmRpc3BhdGNoKHBhdGgsIFwiZXJyb3JcIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIGF1dG8gc2F2ZVxuICAgICAgICB2YXIgYXV0b1NhdmUgPSBfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICghY29kZV9taXJyb3IuaXNDbGVhbihjb2RlX21pcnJvci5sYXN0X3NhdmUpKSB7XG4gICAgICAgICAgICBzYXZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCA0MDAwKTtcbiAgICAgICAgLy8gc2F2ZSB3aXRoIGNvbW1hbmQtc1xuICAgICAgICBNb3VzZXRyYXAoZWRpdG9yWzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBtYXJrc1xuICAgICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG1hcmtzID0gW107XG4gICAgICAgICAgTW91c2V0cmFwKGVkaXRvclswXSkuYmluZChcIm1vZCttXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGN1cnNvciA9IGNvZGVfbWlycm9yLmdldEN1cnNvcigpO1xuICAgICAgICAgICAgaWYgKG1hcmtzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgbGFzdCA9IG1hcmtzW21hcmtzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICBpZiAobGFzdC5saW5lID09IGN1cnNvci5saW5lICYmIGxhc3QuY2ggPT0gY3Vyc29yLmNoKSB7XG4gICAgICAgICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhtYXJrcy5tYXAoZnVuY3Rpb24obSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtoZWFkOiBtLCBhbmNob3I6IG19O1xuICAgICAgICAgICAgICAgIH0pLCBtYXJrcy5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICBtYXJrcyA9IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWFya3MucHVzaChjdXJzb3IpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pKCk7XG4gICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgIHJlamVjdCgpO1xuICAgIH0pO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAkKFwiI2VkaXRvcnMgLmVkaXRvclwiKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICQodGhpcykuZGF0YShcInBhdGhcIikgPT0gcGF0aDtcbiAgfSk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuYWN0aXZhdGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKTtcbiAgdmFyIGZvdW5kID0gdGhpcy5nZXQocGF0aCk7XG4gIGlmIChmb3VuZC5sZW5ndGgpIHtcbiAgICBmb3VuZC5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcbiAgICBmb3VuZC5kYXRhKFwiY29kZV9taXJyb3JcIikuZm9jdXMoKTtcbiAgICBmb3VuZC5kYXRhKFwiY29kZV9taXJyb3JcIikucmVmcmVzaCgpO1xuICB9XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZ2V0QWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAkKFwiI2VkaXRvcnMgLmVkaXRvci5hY3RpdmVcIikuZGF0YShcInBhdGhcIik7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMuZ2V0KHBhdGgpLnJlbW92ZSgpO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmRldGVjdEVvbCA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgaWYgKGNvbnRlbnQubWF0Y2goXCJcXHJcXG5cIikpIHtcbiAgICByZXR1cm4gXCJcXHJcXG5cIjtcbiAgfVxuICBpZiAoY29udGVudC5tYXRjaChcIlxcclwiKSkge1xuICAgIHJldHVybiBcIlxcclwiO1xuICB9XG4gIHJldHVybiBcIlxcblwiO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgRWRpdG9yTWFuYWdlcigpO1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG52YXIgZWRpdG9yX21hbmFnZXIgPSByZXF1aXJlKFwiLi9lZGl0b3IuanNcIilcblxudmFyIEZpbGVNYW5hZ2VyID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBvcGVuZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGNsb3NlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgYWN0aXZhdGVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBcbiAgICBhY3RpdmU6IG51bGwsXG4gICAgZmlsZXM6IFtdLFxuICAgIFxuICAgIGdldEZpbGVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5maWxlc1xuICAgIH0sXG4gICAgXG4gICAgb3BlbjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgXCJUaGUgcGF0aCBpcyBudWxsXCJcbiAgICAgIH1cbiAgICAgIC8vIHRyeSB0byBhY3RpdmF0ZSBhbHJlYWR5IG9wZW5lZCBmaWxlc1xuICAgICAgaWYgKG1vZGVsLmFjdGl2YXRlKHBhdGgpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZWRpdG9yX21hbmFnZXIub3BlbihwYXRoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RlbC5maWxlcy5wdXNoKHBhdGgpXG4gICAgICAgIG1vZGVsLm9wZW5lZC5kaXNwYXRjaChwYXRoKVxuICAgICAgICBtb2RlbC5hY3RpdmF0ZShwYXRoKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGdldEFjdGl2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuYWN0aXZlXG4gICAgfSxcbiAgICBcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgICAgaWYgKHBhdGggIT09IG51bGwgJiYgbW9kZWwuZmlsZXMuaW5kZXhPZihwYXRoKSA9PSAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIGZpbmRlci5zZXRQYXRoKHBhdGgpXG4gICAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShwYXRoKVxuICAgICAgbW9kZWwuYWN0aXZlID0gcGF0aFxuICAgICAgbW9kZWwuYWN0aXZhdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0sXG4gICAgXG4gICAgbmV4dEZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZSh0cnVlKVxuICAgIH0sXG4gICAgXG4gICAgcHJldkZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwucm90YXRlRmlsZShmYWxzZSlcbiAgICB9LFxuICAgIFxuICAgIHJvdGF0ZUZpbGU6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5maWxlcy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHhcbiAgICAgIGlmIChtb2RlbC5hY3RpdmUgPT09IG51bGwpIHtcbiAgICAgICAgaWR4ID0gbmV4dCA/IDAgOiBtb2RlbC5maWxlcy5sZW5ndGggLSAxXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWR4ID0gbW9kZWwuZmlsZXMuaW5kZXhPZihtb2RlbC5hY3RpdmUpXG4gICAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgICBpZHggPSAoaWR4ICsgbW9kZWwuZmlsZXMubGVuZ3RoKSAlIG1vZGVsLmZpbGVzLmxlbmd0aFxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZhdGUobW9kZWwuZmlsZXNbaWR4XSlcbiAgICB9LFxuICAgIFxuICAgIGNsb3NlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuZmlsZXMuaW5kZXhPZihwYXRoKVxuICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgaWYgKG1vZGVsLmZpbGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgbW9kZWwuYWN0aXZhdGUobnVsbClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtb2RlbC5wcmV2RmlsZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVkaXRvcl9tYW5hZ2VyLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5maWxlcy5zcGxpY2UoaWR4LCAxKVxuICAgICAgbW9kZWwuY2xvc2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICByZWxvYWQ6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5vcGVuKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgLy8gdmlld1xuICB2YXIgZ2V0RmlsZUVsZW1lbnQgPSBmdW5jdGlvbihwYXRoKSB7XG4gICAgcmV0dXJuICQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKS5maWx0ZXIoZnVuY3Rpb24oaWR4LCBpdGVtKSB7XG4gICAgICByZXR1cm4gJChpdGVtKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gICAgfSlcbiAgfVxuICBcbiAgbW9kZWwub3BlbmVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIGRpciA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSskXCIpLCBcIlwiKVxuICAgIHZhciBuYW1lID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCIuKi9cIiksIFwiXCIpXG4gICAgJChcIjxkaXY+XCIpLmRhdGEoXCJwYXRoXCIsIHBhdGgpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpclwiKS50ZXh0KGRpciksXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICApLmFwcGVuZFRvKFwiI2ZpbGVzXCIpXG4gIH0pXG4gIFxuICBtb2RlbC5jbG9zZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBnZXRGaWxlRWxlbWVudChwYXRoKS5yZW1vdmUoKVxuICB9KVxuICBcbiAgbW9kZWwuYWN0aXZhdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgJChcIiNmaWxlcyAuZmlsZS1pdGVtLmFjdGl2ZVwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgZ2V0RmlsZUVsZW1lbnQocGF0aCkuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgfSlcbiAgXG4gIGVkaXRvcl9tYW5hZ2VyLnN0YXR1c19jaGFuZ2VkLmFkZChmdW5jdGlvbihwYXRoLCBzdGF0dXMpIHtcbiAgICB2YXIgZWwgPSBnZXRGaWxlRWxlbWVudChwYXRoKVxuICAgIGVsLmZpbmQoXCIuc3RhdHVzXCIpLnJlbW92ZUNsYXNzKFwiY2xlYW4gZXJyb3IgbW9kaWZpZWRcIikuYWRkQ2xhc3Moc3RhdHVzKVxuICB9KVxuICBcbiAgZmluZGVyLnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwub3BlbihwYXRoKVxuICB9KVxuICBcbiAgJChcIiNmaWxlc1wiKS5vbihcImNsaWNrXCIsIFwiLmZpbGUtaXRlbVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgbW9kZWwuYWN0aXZhdGUoJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJwYXRoXCIpKVxuICB9KVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZU1hbmFnZXJcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgRmluZGVyU3VnZ2VzdCA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgaXRlbXM6IFtdLFxuICAgIGN1cnNvcjogbnVsbCwgLy8gaGlnaGxpZ2h0ZWQgaXRlbVxuICAgIFxuICAgIGl0ZW1zX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBjdXJzb3JfbW92ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgdXJsOiBcIi9maW5kZXIucGhwXCIsXG4gICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICB9LFxuICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImZhaWxlZCB0byBmZXRjaCBzdWdnZXN0IGZvciB0aGUgcGF0aDogXCIgKyBwYXRoKVxuICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICBtb2RlbC5zZXRJdGVtcyhyZXBseS5pdGVtcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgIHJldHVybiByZXBseS5iYXNlICsgaVxuICAgICAgICB9KSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBzZXRJdGVtczogZnVuY3Rpb24oaXRlbXMpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihudWxsKVxuICAgICAgbW9kZWwuaXRlbXMgPSBpdGVtc1xuICAgICAgbW9kZWwuaXRlbXNfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC5pdGVtcylcbiAgICB9LFxuICAgIFxuICAgIGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5pdGVtc1xuICAgIH0sXG4gICAgXG4gICAgZ2V0Q3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5jdXJzb3JcbiAgICB9LFxuICAgIFxuICAgIHNldEN1cnNvcjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmN1cnNvcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmN1cnNvciA9IHBhdGhcbiAgICAgIG1vZGVsLmN1cnNvcl9tb3ZlZC5kaXNwYXRjaChtb2RlbC5jdXJzb3IpXG4gICAgfSxcbiAgICBcbiAgICBtb3ZlQ3Vyc29yOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuY3Vyc29yID09PSBudWxsKSB7XG4gICAgICAgIGlmIChtb2RlbC5pdGVtcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1swXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHggPSBtb2RlbC5pdGVtcy5pbmRleE9mKG1vZGVsLmN1cnNvcilcbiAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgaWR4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW9kZWwuaXRlbXMubGVuZ3RoIC0gMSwgaWR4KSlcbiAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1tpZHhdKVxuICAgIH0sXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IocGF0aClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnBhdGhfY2hhbmdlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIG1vZGVsLnVwZGF0ZShwYXRoKVxuICB9KVxuICBcbiAgLy8gdmlld1xuICB2YXIgbGlzdCA9ICQoXCIjZmluZGVyLWl0ZW1zXCIpXG4gIG1vZGVsLml0ZW1zX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgbGlzdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKS5lbXB0eSgpXG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxICYmIGl0ZW1zWzBdID09IG1vZGVsLmdldEN1cnNvcigpKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdmFyIG5hbWVfcnggPSBuZXcgUmVnRXhwKFwiLyhbXi9dKi8/KSRcIilcbiAgICBsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgdmFyIG5hbWUgPSBuYW1lX3J4LmV4ZWMoaXRlbSlbMV1cbiAgICAgIHJldHVybiAkKFwiPGE+XCIpLnRleHQobmFtZSkuZGF0YShcInBhdGhcIiwgaXRlbSlcbiAgICB9KSlcbiAgICBsaXN0LnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICB9KVxuICBcbiAgbW9kZWwuY3Vyc29yX21vdmVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbGlzdC5maW5kKFwiYS5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB2YXIgYSA9IGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICQodGhpcykuZGF0YShcInBhdGhcIikgPT0gcGF0aFxuICAgIH0pXG4gICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcbiAgICBcbiAgICAvLyBzY3JvbGwgdGhlIGxpc3QgdG8gbWFrZSB0aGUgc2VsZWN0ZWQgaXRlbSB2aXNpYmxlXG4gICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICB2YXIgaGVpZ2h0ID0gdGFyZ2V0LmhlaWdodCgpXG4gICAgICB2YXIgdG9wID0gdGFyZ2V0LnByZXZBbGwoKS5sZW5ndGggKiBoZWlnaHRcbiAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgIHZhciB2aWV3X2hlaWdodCA9IGxpc3QuaW5uZXJIZWlnaHQoKVxuICAgICAgaWYgKHRvcCAtIGxpc3Quc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICAgIGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgIH1cbiAgICAgIGlmIChib3R0b20gLSBsaXN0LnNjcm9sbFRvcCgpID4gdmlld19oZWlnaHQpIHtcbiAgICAgICAgbGlzdC5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpXG4gICAgICB9XG4gICAgfVxuICAgIHNjcm9sbEludG9WaWV3KGEpXG4gIH0pXG4gIFxuICAvLyB3aGVuIGl0ZW0gd2FzIHNlbGVjdGVkXG4gIGxpc3Qub24oXCJjbGlja1wiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIG1vZGVsLnNlbGVjdCgkKGUudGFyZ2V0KS5kYXRhKFwicGF0aFwiKSlcbiAgfSlcbiAgLy8gcHJldmVudCBmcm9tIGxvb3NpbmcgZm9jdXNcbiAgbGlzdC5vbihcIm1vdXNlZG93blwiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICB9KVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpXG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LmpzXCIpXG5cbnZhciBGaW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgcGF0aF9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgdmlzaWJpbGl0eV9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgcGF0aDogXCJcIixcbiAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgocGF0aClcbiAgICAgIGlmIChwYXRoLnN1YnN0cigtMSkgPT0gXCIvXCIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5oaWRlKClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSB0cnVlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IGZhbHNlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICB9LFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLnBhdGhcbiAgICB9LFxuICAgIFxuICAgIHNldFBhdGg6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnBhdGggPSBwYXRoXG4gICAgICBtb2RlbC5wYXRoX2NoYW5nZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGdvVG9QYXJlbnREaXJlY3Rvcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChcbiAgICAgICAgbW9kZWwucGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKi8/JFwiKSwgXCJcIilcbiAgICAgIClcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgc3VnZ2VzdCA9IEZpbmRlclN1Z2dlc3QobW9kZWwpXG4gIHN1Z2dlc3Quc2VsZWN0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBtb2RlbC5zZWxlY3QocGF0aClcbiAgfSlcbiAgXG4gIC8vIFZpZXdcbiAgXG4gIHZhciBwYXRoX2lucHV0ID0gJChcIiNmaW5kZXItcGF0aFwiKVxuICBcbiAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgICQoXCIjZmluZGVyXCIpLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJChcIiNmaW5kZXJcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICB9XG4gIH0pXG4gIFxuICB2YXIgbGFzdF9wYXRoID0gcGF0aF9pbnB1dC52YWwoKVxuICB2YXIgcGF0aENoYW5nZWQgPSBfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLnNldFBhdGgocGF0aF9pbnB1dC52YWwoKSlcbiAgfSwgMzAwKVxuICB2YXIgcGF0aF93YXRjaGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBwYXRoX2lucHV0LnZhbCgpXG4gICAgaWYgKGN1cnJlbnQgIT0gbGFzdF9wYXRoKSB7XG4gICAgICBsYXN0X3BhdGggPSBjdXJyZW50XG4gICAgICBwYXRoQ2hhbmdlZCgpXG4gICAgfVxuICB9LCA1MClcbiAgXG4gIG1vZGVsLnBhdGhfY2hhbmdlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIHBhdGhfaW5wdXQudmFsKHBhdGgpXG4gIH0pXG4gIFxuICAvLyBvcGVuIGZpbGUgd2l0aCBlbnRlciBrZXlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJlbnRlclwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGF0aCA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICBtb2RlbC5zZWxlY3QocGF0aCA/IHBhdGggOiBwYXRoX2lucHV0LnZhbCgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxuICBcbiAgLy8gcGF0aCBjb21wbGV0aW9uIHdpdGggdGFiIGtleVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcInRhYlwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgY3Vyc29yID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgIGlmIChjdXJzb3IpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgoY3Vyc29yKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHZhciBpdGVtcyA9IHN1Z2dlc3QuZ2V0SXRlbXMoKVxuICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSkge1xuICAgICAgbW9kZWwuc2V0UGF0aChpdGVtc1swXSlcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICBzdWdnZXN0LnVwZGF0ZShwYXRoX2lucHV0LnZhbCgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxuICBcbiAgLy8gcXVpdCBmaW5kZXIgd2l0aCBlc2Mga2V5XG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZXNjXCIsIGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLmhpZGUoKVxuICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKGVkaXRvcl9tYW5hZ2VyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxuICBcbiAgLy8gc2VsZWN0IGl0ZW0gd2l0aCB1cC9kb3duIGtleVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImRvd25cIiwgZnVuY3Rpb24oKSB7XG4gICAgc3VnZ2VzdC5tb3ZlQ3Vyc29yKHRydWUpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwidXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgc3VnZ2VzdC5tb3ZlQ3Vyc29yKGZhbHNlKVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxuICBcbiAgLy9cbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJtb2QrdVwiLCBmdW5jdGlvbigpIHtcbiAgICBtb2RlbC5nb1RvUGFyZW50RGlyZWN0b3J5KClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbiAgXG4gIC8vIGZvY3VzIG9uIHNob3duXG4gIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICBwYXRoX2lucHV0LmZvY3VzKClcbiAgICB9XG4gIH0pXG4gIFxuICAvLyBoaWRlIG9uIGJsdXJcbiAgcGF0aF9pbnB1dC5ibHVyKGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLmhpZGUoKVxuICB9KVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyXG4iLCJcInVzZSBzdHJpY3RcIlxuXG52YXIgUm90YXRlID0gcmVxdWlyZShcIi4vcm90YXRlLmpzXCIpXG5cbnZhciBJbmRlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHJldHVybiBSb3RhdGUoW1wiNFNQXCIsIFwiMlNQXCIsIFwiVEFCXCJdLCB0eXBlKVxufVxuXG5JbmRlbnQuZGV0ZWN0SW5kZW50VHlwZSA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgaWYgKGNvbnRlbnQubWF0Y2goL1tcXHJcXG5dK1xcdC8pKSB7XG4gICAgcmV0dXJuIFwiVEFCXCJcbiAgfVxuICB2YXIgbGluZXMgPSBjb250ZW50LnNwbGl0KC9bXFxyXFxuXSsvKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGluZGVudCA9IGxpbmVzW2ldLnJlcGxhY2UoL14oICopLiovLCBcIiQxXCIpXG4gICAgaWYgKGluZGVudC5sZW5ndGggPT0gMikge1xuICAgICAgcmV0dXJuIFwiMlNQXCJcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFwiNFNQXCJcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbmRlbnRcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBzaWduYWxzID0gcmVxdWlyZShcInNpZ25hbHNcIilcblxudmFyIFJvdGF0ZSA9IGZ1bmN0aW9uKHZhbHVlcywgdmFsdWUpIHtcbiAgdmFyIGlzVmFsaWRWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2YWx1ZXMuaW5kZXhPZih2KSAhPSAtMVxuICB9XG4gIFxuICB2YXIgY2hlY2tWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoIWlzVmFsaWRWYWx1ZSh2KSkge1xuICAgICAgdGhyb3cgXCJpbnZhbGlkIHZhbHVlOiBcIiArIHZcbiAgICB9XG4gIH1cbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IG51bGxcbiAgfVxuICBjaGVja1ZhbHVlKHZhbHVlKVxuICBcbiAgdmFyIHJvdGF0ZSA9IHtcbiAgICBjaGFuZ2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBcbiAgICBnZXRWYWx1ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlc1xuICAgIH0sXG4gICAgXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH0sXG4gICAgXG4gICAgc2V0OiBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICAgIGlmIChuZXdfdmFsdWUgPT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBjaGVja1ZhbHVlKG5ld192YWx1ZSlcbiAgICAgIHZhbHVlID0gbmV3X3ZhbHVlXG4gICAgICByb3RhdGUuY2hhbmdlZC5kaXNwYXRjaCh2YWx1ZSlcbiAgICB9LFxuICAgIFxuICAgIHJvdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gdmFsdWVzLmluZGV4T2YodmFsdWUpXG4gICAgICBpZHggPSAoaWR4ICsgMSkgJSB2YWx1ZXMubGVuZ3RoXG4gICAgICByb3RhdGUuc2V0KHZhbHVlc1tpZHhdKVxuICAgIH1cbiAgfVxuICByZXR1cm4gcm90YXRlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUm90YXRlXG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpO1xuXG5Db2RlTWlycm9yLmRlZmluZVNpbXBsZU1vZGUoXCJ0ZXh0XCIsIHtcbiAgc3RhcnQ6IFtdLFxuICBjb21tZW50OiBbXSxcbiAgbWV0YToge31cbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMucnVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG4gIHZhciBmaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXIuanNcIikoKVxuICB2YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKShmaW5kZXIpXG4gIFxuICB2YXIgc2F2ZUZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpbGVzID0gZmlsZV9tYW5hZ2VyLmdldEZpbGVzKClcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm9wZW4tZmlsZXNcIiwgSlNPTi5zdHJpbmdpZnkoZmlsZXMpKVxuICB9XG4gIHZhciBsb2FkRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm9wZW4tZmlsZXNcIikgfHwgXCJbXVwiKVxuICB9XG4gIGxvYWRGaWxlTGlzdCgpLmZvckVhY2goZnVuY3Rpb24ocGF0aCkge1xuICAgIGZpbGVfbWFuYWdlci5vcGVuKHBhdGgpXG4gIH0pXG4gIFxuICBmaWxlX21hbmFnZXIub3BlbmVkLmFkZChzYXZlRmlsZUxpc3QpXG4gIGZpbGVfbWFuYWdlci5jbG9zZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgXG4gIC8vIHNob3J0Y3V0IGtleXNcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK1wiLCBcIm1vZCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIubmV4dEZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3NoaWZ0K1wiLCBcIm1vZCtzaGlmdCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIucHJldkZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3dcIiwgXCJtb2Qra1wiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLmNsb3NlKGZpbGVfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIucmVsb2FkKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zaG93KClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG59XG4iXX0=
