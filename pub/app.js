require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var $ = require("jquery");
var _ = require("underscore");
var CodeMirror = require("codemirror");
require("codemirror-addon");
require("./text-mode.js");

// EditorManager
var EditorManager = function() {
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
          var file_manager = require("./file.js");
          file_manager.setStatus(
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
          var indent = new Indent(Indent.detectIndentType(reply.content));
          updateIndentInfo(indent.get());
          indent.changed.add(function(type) {
            if (type == "TAB") {
              code_mirror.setOption("indentWithTabs", true);
            }
            else {
              code_mirror.setOption("indentWithTabs", false);
              code_mirror.setOption("indentUnit", type.replace("SP", ""));
            }
            updateIndentInfo(type);
          });
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
              var file_manager = require("./file.js");
              file_manager.setStatus(path, "clean");
              editor.find(".editor-message").text("Saved.");
            }
            else {
              editor.find(".editor-message").text("Save failed. " + reply.error);
              var file_manager = require("./file.js");
              file_manager.setStatus(path, "error");
            }
          }).fail(function() {
            editor.find(".editor-message").text("Save failed.");
            var file_manager = require("./file.js");
            file_manager.setStatus(path, "error");
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
        
        // join lines
        Mousetrap(editor[0]).bind("mod+j", function() {
          code_mirror.execCommand("goLineEnd");
          var selections = code_mirror.listSelections();
          selections.reverse();
          selections.forEach(function(selection) {
            var next_line = code_mirror.getLine(selection.head.line + 1);
            if (next_line === undefined) {
              return;
            }
            var leading_spaces = next_line.match(/^\s*/)[0];
            var to = {
              line: selection.head.line + 1,
              ch: leading_spaces.length,
            };
            var this_line = code_mirror.getLine(selection.head.line);
            var insert_space = next_line != "" && this_line != "";
            code_mirror.replaceRange(insert_space ? " " : "", selection.head, to, "*");
          });
          code_mirror.execCommand("goCharLeft");
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

},{"./file.js":2,"./indent.js":5,"./text-mode.js":7,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","jquery":"jquery","underscore":"underscore"}],2:[function(require,module,exports){
var $ = require("jquery");
var editor_manager = require("./editor.js");
var Mousetrap = require("mousetrap");

// FileManager
var FileManager = function() {
  var self = this;
  $("#files").on("click", ".file-item", function(e) {
    e.preventDefault();
    self.open($(e.currentTarget).data("path"));
  });
  Mousetrap.bind(["mod+w", "mod+k"], function() {
    self.close(self.getActive());
    return false;
  }, 'keydown');
  Mousetrap.bind(["mod+r"], function() {
    self.reload(self.getActive());
    return false;
  }, 'keydown');
  $.each(JSON.parse(localStorage.getItem("open-files") || "[]"), function(i, path) {
    self.open(path);
  });
};
FileManager.prototype.open = function(path) {
  var self = this;
  // try to activate opening files
  if (this.activate(path)) {
    return;
  }
  editor_manager.open(path).then(function() {
    var dir = path.replace(new RegExp("[^/]+$"), "");
    var name = path.replace(new RegExp(".*/"), "");
    $("<div>").data("path", path).addClass("file-item").append(
      $("<div>").addClass("dir").text(dir),
      $("<div>").addClass("name").text(name),
      $('<div class="status clean">')
    ).appendTo("#files");
    self.activate(path);
    self._saveFileList();
  });
};
FileManager.prototype.get = function(path) {
  return $("#files .file-item").filter(function(idx, item) {
    return $(item).data("path") == path;
  });
};
FileManager.prototype.getActive = function() {
  return $("#files .file-item.active").data("path");
};
FileManager.prototype.activate = function(path) {
  var file = this.get(path);
  if (file.length == 0) {
    return false;
  }
  $("#files .file-item.active").removeClass("active");
  file.addClass("active");
  editor_manager.activate(path);
  var finder = require("./finder.js");
  finder.setPath(path);
  return true;
};
FileManager.prototype.nextFile = function() {
  this.rotateFile(true);
};
FileManager.prototype.prevFile = function() {
  this.rotateFile(false);
};
FileManager.prototype.rotateFile = function(next) {
  var dir = next ? "next" : "prev";
  var target = $("#files .file-item.active")[dir]();
  if (target.length == 0) {
    dir = next ? "first" : "last";
    target = $("#files .file-item")[dir]();
    if (target.length == 0) {
      return;
    }
  }
  this.activate(target.data("path"));
};
FileManager.prototype.setStatus = function(path, status) {
  var file = $("#files .file-item").filter(function(idx, item) {
    return $(item).data("path") == path;
  });
  file.find(".status").removeClass("clean error modified").addClass(status);
};
FileManager.prototype.close = function(path) {
  var target = this.get(path);
  if (target.length == 0) {
    return;
  }
  if (target.hasClass("active")) {
    this.prevFile();
  }
  target.remove();
  editor_manager.close(path);
  this._saveFileList();
};

FileManager.prototype.reload = function(path) {
  this.close(path);
  this.open(path);
};

FileManager.prototype._saveFileList = function() {
  var files = $.map($("#files .file-item"), function(item) {
    return $(item).data("path");
  });
  localStorage.setItem("open-files", JSON.stringify(files));
};
module.exports = new FileManager();

},{"./editor.js":1,"./finder.js":4,"jquery":"jquery","mousetrap":"mousetrap"}],3:[function(require,module,exports){
var $ = require("jquery");
var _ = require("underscore");

var FinderSuggest = function(finder) {
  var self = this;
  this.finder = finder;
  this.items = $("#finder-items");
  
  // when finder item was selected
  this.items.on("click", "a", function(e) {
    e.preventDefault();
    self.finder.suggestSelected($(e.target).data("path"));
  });
  // prevent lost focus
  this.items.on("mousedown", "a", function(e) {
    e.preventDefault();
  });
};

FinderSuggest.prototype.getSelection = function() {
  if (!this.items.hasClass("active")) {
    return null;
  }
  var selected = this.items.find("a.selected");
  if (selected.length == 0) {
    return null;
  }
  return selected.data("path");
};

FinderSuggest.prototype.fetch = function(path) {
  var self = this;
  return new Promise(function(resolve, reject) {
    $.ajax({
      method: "post",
      url: "/finder.php",
      timeout: 3000,
      data: {
        path: path
      },
      dataType: "json"
    }).fail(function() {
      console.log("failed to fetch suggest: " + path);
      reject();
    }).done(resolve);
  });
};

FinderSuggest.prototype.update = function(path) {
  var self = this;
  var empty = function() {
    self.items.removeClass("active");
    self.items.empty();
  };
  self.fetch(path).then(function(suggest) {
    if (suggest.items.length == 0) {
      empty();
      return;
    }
    if (suggest.items.length == 1 && suggest.base + suggest.items[0] == path) {
      empty();
      return;
    }
    // got some suggestion
    self.items.empty();
    _.each(suggest.items, function(item) {
      $("#finder-items").append(
        $("<a>").text(item).data({
          path: suggest.base + item,
        })
      );
    });
    $("#finder-items").scrollTop(0).addClass("active");
  }).catch(function() {
    empty();
  });
};

FinderSuggest.prototype.moveSelect = function(down) {
  var target = this.items.find("a.selected");
  if (target.length) {
    target.removeClass("selected");
    var t = target[down ? "next" : "prev"]();
    if (t.length) {
      target = t;
    }
  }
  else {
    target = this.items.find("a").first();
  }
  if (target.length) {
    target.addClass("selected");
    // scroll items pane to make the selected item visible
    var height = target.height();
    var top = target.prevAll().length * height;
    var bottom = top + height;
    var view_height = this.items.innerHeight();
    if (top - this.items.scrollTop() < 0) {
      this.items.scrollTop(top);
    }
    if (bottom - this.items.scrollTop() > view_height) {
      this.items.scrollTop(bottom - view_height);
    }
  }
};

module.exports = FinderSuggest;

},{"jquery":"jquery","underscore":"underscore"}],4:[function(require,module,exports){
var $ = require("jquery");
var _ = require("underscore");
var Mousetrap = require("mousetrap");
var editor_manager = require("./editor.js");
var file_manager = require("./file.js");
var FinderSuggest = require("./finder-suggest.js");

var Finder = function() {
  var self = this;
  this.path = $("#finder-path").val(this._getLastPath());
  this.path_watcher = null;
  this.suggest = new FinderSuggest(this);
  
  // open file with enter key
  Mousetrap(this.path[0]).bind("enter", function() {
    var path = self.suggest.getSelection();
    if (path) {
      self.suggestSelected(path);
    } else {
      file_manager.open(self.path.val());
      self.hide();
    }
    return false;
  });
  
  // path completion with tab key
  Mousetrap(this.path[0]).bind("tab", function() {
    var path = self.path.val();
    self.suggest.fetch(path).then(function(suggest) {
      if (suggest.items.length == 0) {
        return;
      }
      if (suggest.items.length == 1) {
        self.setPath(suggest.base + suggest.items[0]);
        return;
      }
    }).catch(function() {
      console.log("completion failed.");
    });
    return false;
  });
  //
  Mousetrap(this.path[0]).bind("mod+u", function() {
    var path = self.path.val();
    path = path.replace(new RegExp("[^/]*/?$"), "");
    self.path.val(path);
    return false;
  });
  // show finder
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    self.show();
    self.path.focus();
    return false;
  });
  
  // hide on blur
  self.path.blur(function() {
    self.hide();
  });
  
  // select item with up/down key
  Mousetrap(this.path[0]).bind("down", function() {
    self.suggest.moveSelect(true);
    return false;
  });
  Mousetrap(this.path[0]).bind("up", function() {
    self.suggest.moveSelect(false);
    return false;
  });
  
  // quit finder with esc key
  Mousetrap(this.path[0]).bind("esc", function() {
    self.hide();
    editor_manager.activate(editor_manager.getActive());
    return false;
  });
};

Finder.prototype.suggestSelected = function(path) {
  this.setPath(path);
  if (path.substr(-1) != "/") {
    file_manager.open(path);
  }
};

Finder.prototype.show = function() {
  var self = this;
  $("#finder").addClass("active");
  
  // start suggest
  var pathChanged = _.debounce(function() {
    self.suggest.update(self.path.val());
  }, 300);
  clearInterval(self.path_watcher);
  self.path_watcher = setInterval(function() {
    var current = self.path.val();
    if (current != self._getLastPath()) {
      self._setLastPath(current);
      pathChanged();
    }
  }, 50);
};

Finder.prototype.hide = function(item) {
  $("#finder").removeClass("active");
};

Finder.prototype.setPath = function(path) {
  this.path.val(path);
  this._setLastPath(path);
  this.suggest.update(path);
};

Finder.prototype._getLastPath = function() {
  return localStorage.getItem("finder-path") || "/";
};

Finder.prototype._setLastPath = function(path) {
  localStorage.setItem("finder-path", path);
};

module.exports = new Finder();

},{"./editor.js":1,"./file.js":2,"./finder-suggest.js":3,"jquery":"jquery","mousetrap":"mousetrap","underscore":"underscore"}],5:[function(require,module,exports){
"use strict"

var Rotate = require("./rotate.js")

var Indent = function(type) {
  Rotate.call(
    this, ["4SP", "2SP", "TAB"], type
  )
}
Indent.prototype = Object.create(Rotate.prototype)
Indent.prototype.constructor = Rotate

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
  this.values = values
  this.changed = new signals.Signal()
  this.checkValue(value)
  this.value = value
}

Rotate.prototype.getValues = function() {
  return this.values
}

Rotate.prototype.isValidValue = function(value) {
  return this.values.indexOf(value) != -1
}

Rotate.prototype.checkValue = function(value) {
  if (!this.isValidValue(value)) {
    throw "invalid value: " + value
  }
}

Rotate.prototype.get = function() {
  return this.value
}

Rotate.prototype.set = function(value) {
  if (value == this.value) {
    return
  }
  this.checkValue(value)
  this.value = value
  this.changed.dispatch(this.value)
}

Rotate.prototype.rotate = function() {
  var idx = this.values.indexOf(this.value)
  idx = (idx + 1) % this.values.length
  this.set(this.values[idx])
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
  var Mousetrap = require("mousetrap");
  var file_manager = require("./file.js");
  var finder = require("./finder.js");
  
  // shortcut keys
  Mousetrap.bind(["mod+;", "mod+="], function() {
    file_manager.nextFile();
    return false;
  }, 'keydown');
  Mousetrap.bind(["mod+shift+;", "mod+shift+="], function() {
    file_manager.prevFile();
    return false;
  }, 'keydown');
};

},{"./file.js":2,"./finder.js":4,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9yb3RhdGUuanMiLCJqcy90ZXh0LW1vZGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xudmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcbnJlcXVpcmUoXCJjb2RlbWlycm9yLWFkZG9uXCIpO1xucmVxdWlyZShcIi4vdGV4dC1tb2RlLmpzXCIpO1xuXG4vLyBFZGl0b3JNYW5hZ2VyXG52YXIgRWRpdG9yTWFuYWdlciA9IGZ1bmN0aW9uKCkge1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICQuYWpheCh7XG4gICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgdXJsOiBcIi9yZWFkLnBocFwiLFxuICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpe1xuICAgICAgaWYgKHJlcGx5LmVycm9yKSB7XG4gICAgICAgIGFsZXJ0KHJlcGx5LmVycm9yKTtcbiAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBlbmNvZGluZyA9IHJlcGx5LmVuY29kaW5nO1xuICAgICAgdmFyIGVkaXRvciA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImVkaXRvclwiKS5hcHBlbmRUbyhcIiNlZGl0b3JzXCIpO1xuICAgICAgdmFyIG1vZGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBleHRlbnNpb24gPSBwYXRoLnJlcGxhY2UoLy4qWy5dKC4rKSQvLCBcIiQxXCIpO1xuICAgICAgICB2YXIgbW9kZSA9IHtcbiAgICAgICAgICBodG1sOiBcInBocFwiLFxuICAgICAgICAgIHRhZzogXCJwaHBcIixcbiAgICAgICAgfVtleHRlbnNpb25dO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlO1xuICAgICAgICB9XG4gICAgICAgIG1vZGUgPSBDb2RlTWlycm9yLmZpbmRNb2RlQnlFeHRlbnNpb24oZXh0ZW5zaW9uKTtcbiAgICAgICAgaWYgKG1vZGUpIHtcbiAgICAgICAgICByZXR1cm4gbW9kZS5tb2RlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcInRleHRcIjtcbiAgICAgIH0pKCk7XG4gICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb2RlX21pcnJvciA9IENvZGVNaXJyb3IoZWRpdG9yWzBdLCB7XG4gICAgICAgICAgdmFsdWU6IHJlcGx5LmNvbnRlbnQsXG4gICAgICAgICAgbGluZU51bWJlcnM6IHRydWUsXG4gICAgICAgICAgdGFiU2l6ZTogNCxcbiAgICAgICAgICBzaG93Q3Vyc29yV2hlblNlbGVjdGluZzogdHJ1ZSxcbiAgICAgICAgICBhdXRvQ2xvc2VCcmFja2V0czogdHJ1ZSxcbiAgICAgICAgICBtYXRjaEJyYWNrZXRzOiB0cnVlLFxuICAgICAgICAgIG1hdGNoVGFnczogdHJ1ZSxcbiAgICAgICAgICBhdXRvQ2xvc2VUYWdzOiB0cnVlLFxuICAgICAgICAgIHN0eWxlQWN0aXZlTGluZTogdHJ1ZSxcbiAgICAgICAgICBzdHlsZVNlbGVjdGVkVGV4dDogdHJ1ZSxcbiAgICAgICAgICBtb2RlOiBtb2RlLFxuICAgICAgICAgIGRyYWdEcm9wOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIENvZGVNaXJyb3IucmVnaXN0ZXJIZWxwZXIoXCJoaW50V29yZHNcIiwgbW9kZSwgbnVsbCk7XG4gICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImV4dHJhS2V5c1wiLCB7XG4gICAgICAgICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgICAgICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICAgICAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICAgICAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgICAgICAgIFRhYjogXCJpbmRlbnRBdXRvXCIsXG4gICAgICAgICAgXCJDdHJsLURcIjogZmFsc2UsXG4gICAgICAgICAgXCJDbWQtRFwiOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcInN0eWxlQWN0aXZlTGluZVwiLCB7bm9uRW1wdHk6IHRydWV9KTtcbiAgICAgICAgLy8gbWFpbnRhaW4gaW5kZW50YXRpb24gb24gcGFzdGVcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJiZWZvcmVDaGFuZ2VcIiwgZnVuY3Rpb24oY20sIGNoYW5nZSkge1xuICAgICAgICAgIGlmIChjaGFuZ2Uub3JpZ2luICE9IFwicGFzdGVcIikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoQ29kZU1pcnJvci5jbXBQb3MoY2hhbmdlLmZyb20sIGNoYW5nZS50bykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gICAgICAgICAgdmFyIGRlc3QgPSBjbS5nZXRMaW5lKGNoYW5nZS5mcm9tLmxpbmUpO1xuICAgICAgICAgIGlmIChkZXN0Lmxlbmd0aCAhPSBjaGFuZ2UuZnJvbS5jaCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICAgICAgICAgIGlmIChkZXN0Lm1hdGNoKC9bXiBcXHRdLykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgICAgICAgICBpZiAoY2hhbmdlLnRleHRbY2hhbmdlLnRleHQubGVuZ3RoIC0gMV0gPT0gXCJcIikge1xuICAgICAgICAgICAgY2hhbmdlLnRleHQucG9wKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdO1xuICAgICAgICAgIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLm1hdGNoKC9eKFsgXFx0XSopKC4qKS8pO1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IGxpbmVbMV07XG4gICAgICAgICAgICB2YXIgdGV4dCA9IGxpbmVbMl07XG4gICAgICAgICAgICBpbmRlbnQgPSAoZGVzdCArIGluZGVudCkuc3Vic3RyKDAsIGRlc3QubGVuZ3RoICsgaW5kZW50Lmxlbmd0aCAtIGJhc2VfaW5kZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZW50ICsgdGV4dDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjaGFuZ2UudGV4dFswXSA9IGNoYW5nZS50ZXh0WzBdLnN1YnN0cihkZXN0Lmxlbmd0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2RlX21pcnJvci5vbihcImNoYW5nZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYXV0b1NhdmUoKTtcbiAgICAgICAgICB2YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKTtcbiAgICAgICAgICBmaWxlX21hbmFnZXIuc2V0U3RhdHVzKFxuICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSA/IFwiY2xlYW5cIjogXCJtb2RpZmllZFwiXG4gICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBjbV9pbnB1dCA9IGNvZGVfbWlycm9yLmdldElucHV0RmllbGQoKTtcbiAgICAgICAgJChjbV9pbnB1dCkuYWRkQ2xhc3MoXCJtb3VzZXRyYXBcIik7IC8vIGVuYWJsZSBob3RrZXlcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2JcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJnb1dvcmRMZWZ0XCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtmXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZ29Xb3JkUmlnaHRcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2hcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJkZWxXb3JkQmVmb3JlXCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtkXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZGVsV29yZEFmdGVyXCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtkXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMoXG4gICAgICAgICAgICBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjb2RlX21pcnJvci5maW5kV29yZEF0KGkuYW5jaG9yKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2QrbFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKFxuICAgICAgICAgICAgY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgICAgICAgICAgY2g6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICAgICAgICAgIGxpbmU6IGkuYW5jaG9yLmxpbmUsXG4gICAgICAgICAgICAgICAgICBjaDogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK3NoaWZ0K2xcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGlvbnMgPSBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpO1xuICAgICAgICAgIGlmIChzZWxlY3Rpb25zLmxlbmd0aCAhPSAxKSB7XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYW5jaG9yID0gc2VsZWN0aW9uc1swXS5hbmNob3I7XG4gICAgICAgICAgdmFyIGhlYWQgPSBzZWxlY3Rpb25zWzBdLmhlYWQ7XG4gICAgICAgICAgdmFyIG5ld19zZWxlY3Rpb25zID0gW107XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGFuY2hvci5saW5lOyBpIDw9IGhlYWQubGluZTsgKytpKSB7XG4gICAgICAgICAgICBuZXdfc2VsZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgICAgICAgbGluZTogaSxcbiAgICAgICAgICAgICAgICBjaDogaSA9PSBhbmNob3IubGluZSA/IGFuY2hvci5jaCA6IDBcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaGVhZDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGksXG4gICAgICAgICAgICAgICAgY2g6IGkgPT0gaGVhZC5saW5lID8gaGVhZC5jaCA6IEluZmluaXR5XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKG5ld19zZWxlY3Rpb25zKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gY29kZV9taXJyb3IuY2hhbmdlR2VuZXJhdGlvbih0cnVlKTtcbiAgICAgICAgLy8gc3RhdHVzIGJhclxuICAgICAgICBlZGl0b3IuYXBwZW5kKFxuICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZm9vdFwiPicpLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbWVzc2FnZVwiPicpLFxuICAgICAgICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1pbmRlbnQgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW9sXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVuY29kaW5nXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1vZGVcIj4nKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgICAgdmFyIHVwZGF0ZU1vZGVJbmZvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG1vZGUgPSBjb2RlX21pcnJvci5nZXRNb2RlKCk7XG4gICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlLm5hbWUpO1xuICAgICAgICB9O1xuICAgICAgICB1cGRhdGVNb2RlSW5mbygpO1xuICAgICAgICBcbiAgICAgICAgLy8gaW5kZW50XG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgdXBkYXRlSW5kZW50SW5mbyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikudGV4dCh0eXBlKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHZhciBJbmRlbnQgPSByZXF1aXJlKFwiLi9pbmRlbnQuanNcIik7XG4gICAgICAgICAgdmFyIGluZGVudCA9IG5ldyBJbmRlbnQoSW5kZW50LmRldGVjdEluZGVudFR5cGUocmVwbHkuY29udGVudCkpO1xuICAgICAgICAgIHVwZGF0ZUluZGVudEluZm8oaW5kZW50LmdldCgpKTtcbiAgICAgICAgICBpbmRlbnQuY2hhbmdlZC5hZGQoZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgaWYgKHR5cGUgPT0gXCJUQUJcIikge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCBmYWxzZSk7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgdHlwZS5yZXBsYWNlKFwiU1BcIiwgXCJcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXBkYXRlSW5kZW50SW5mbyh0eXBlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaW5kZW50LnJvdGF0ZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gbGluZSBzZXByYXRvclxuICAgICAgICB2YXIgZW9sID0gc2VsZi5kZXRlY3RFb2wocmVwbHkuY29udGVudCk7XG4gICAgICAgIHZhciBlb2xfbmFtZXMgPSB7XG4gICAgICAgICAgXCJcXHJcIjogXCJDUlwiLFxuICAgICAgICAgIFwiXFxuXCI6IFwiTEZcIixcbiAgICAgICAgICBcIlxcclxcblwiOiBcIkNSTEZcIlxuICAgICAgICB9O1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQoZW9sX25hbWVzW2VvbF0pO1xuICAgICAgICAvLyBlbmNvZGluZ1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZyk7XG4gICAgICAgIFxuICAgICAgICBlZGl0b3IuZGF0YShcInBhdGhcIiwgcGF0aCk7XG4gICAgICAgIGVkaXRvci5kYXRhKFwiY29kZV9taXJyb3JcIiwgY29kZV9taXJyb3IpO1xuICAgICAgICAvLyBzYXZlXG4gICAgICAgIHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGdlbmVyYXRpb24gPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IFwiL3dyaXRlLnBocFwiLFxuICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgIGVuY29kaW5nOiBlbmNvZGluZyxcbiAgICAgICAgICAgICAgY29udGVudDogY29kZV9taXJyb3IuZ2V0VmFsdWUoKS5yZXBsYWNlKC9cXG4vZywgZW9sKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICAgIGlmIChyZXBseSA9PSBcIm9rXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gZ2VuZXJhdGlvbjtcbiAgICAgICAgICAgICAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gICAgICAgICAgICAgIGZpbGVfbWFuYWdlci5zZXRTdGF0dXMocGF0aCwgXCJjbGVhblwiKTtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmVkLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuIFwiICsgcmVwbHkuZXJyb3IpO1xuICAgICAgICAgICAgICB2YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKTtcbiAgICAgICAgICAgICAgZmlsZV9tYW5hZ2VyLnNldFN0YXR1cyhwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuXCIpO1xuICAgICAgICAgICAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gICAgICAgICAgICBmaWxlX21hbmFnZXIuc2V0U3RhdHVzKHBhdGgsIFwiZXJyb3JcIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIGF1dG8gc2F2ZVxuICAgICAgICB2YXIgYXV0b1NhdmUgPSBfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICghY29kZV9taXJyb3IuaXNDbGVhbihjb2RlX21pcnJvci5sYXN0X3NhdmUpKSB7XG4gICAgICAgICAgICBzYXZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCA0MDAwKTtcbiAgICAgICAgLy8gc2F2ZSB3aXRoIGNvbW1hbmQtc1xuICAgICAgICBNb3VzZXRyYXAoZWRpdG9yWzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBqb2luIGxpbmVzXG4gICAgICAgIE1vdXNldHJhcChlZGl0b3JbMF0pLmJpbmQoXCJtb2QralwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvTGluZUVuZFwiKTtcbiAgICAgICAgICB2YXIgc2VsZWN0aW9ucyA9IGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCk7XG4gICAgICAgICAgc2VsZWN0aW9ucy5yZXZlcnNlKCk7XG4gICAgICAgICAgc2VsZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKHNlbGVjdGlvbikge1xuICAgICAgICAgICAgdmFyIG5leHRfbGluZSA9IGNvZGVfbWlycm9yLmdldExpbmUoc2VsZWN0aW9uLmhlYWQubGluZSArIDEpO1xuICAgICAgICAgICAgaWYgKG5leHRfbGluZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsZWFkaW5nX3NwYWNlcyA9IG5leHRfbGluZS5tYXRjaCgvXlxccyovKVswXTtcbiAgICAgICAgICAgIHZhciB0byA9IHtcbiAgICAgICAgICAgICAgbGluZTogc2VsZWN0aW9uLmhlYWQubGluZSArIDEsXG4gICAgICAgICAgICAgIGNoOiBsZWFkaW5nX3NwYWNlcy5sZW5ndGgsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIHRoaXNfbGluZSA9IGNvZGVfbWlycm9yLmdldExpbmUoc2VsZWN0aW9uLmhlYWQubGluZSk7XG4gICAgICAgICAgICB2YXIgaW5zZXJ0X3NwYWNlID0gbmV4dF9saW5lICE9IFwiXCIgJiYgdGhpc19saW5lICE9IFwiXCI7XG4gICAgICAgICAgICBjb2RlX21pcnJvci5yZXBsYWNlUmFuZ2UoaW5zZXJ0X3NwYWNlID8gXCIgXCIgOiBcIlwiLCBzZWxlY3Rpb24uaGVhZCwgdG8sIFwiKlwiKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvQ2hhckxlZnRcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIG1hcmtzXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgbWFya3MgPSBbXTtcbiAgICAgICAgICBNb3VzZXRyYXAoZWRpdG9yWzBdKS5iaW5kKFwibW9kK21cIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gY29kZV9taXJyb3IuZ2V0Q3Vyc29yKCk7XG4gICAgICAgICAgICBpZiAobWFya3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciBsYXN0ID0gbWFya3NbbWFya3MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgIGlmIChsYXN0LmxpbmUgPT0gY3Vyc29yLmxpbmUgJiYgbGFzdC5jaCA9PSBjdXJzb3IuY2gpIHtcbiAgICAgICAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKG1hcmtzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge2hlYWQ6IG0sIGFuY2hvcjogbX07XG4gICAgICAgICAgICAgICAgfSksIG1hcmtzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgIG1hcmtzID0gW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXJrcy5wdXNoKGN1cnNvcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSkoKTtcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfSk7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICB2YXIgZm91bmQgPSB0aGlzLmdldChwYXRoKTtcbiAgaWYgKGZvdW5kLmxlbmd0aCkge1xuICAgIGZvdW5kLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5mb2N1cygpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5yZWZyZXNoKCk7XG4gIH1cbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5kYXRhKFwicGF0aFwiKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdGhpcy5nZXQocGF0aCkucmVtb3ZlKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZGV0ZWN0RW9sID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiO1xuICB9XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXCI7XG4gIH1cbiAgcmV0dXJuIFwiXFxuXCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBFZGl0b3JNYW5hZ2VyKCk7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgZWRpdG9yX21hbmFnZXIgPSByZXF1aXJlKFwiLi9lZGl0b3IuanNcIik7XG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKTtcblxuLy8gRmlsZU1hbmFnZXJcbnZhciBGaWxlTWFuYWdlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gICQoXCIjZmlsZXNcIikub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBzZWxmLm9wZW4oJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJwYXRoXCIpKTtcbiAgfSk7XG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuY2xvc2Uoc2VsZi5nZXRBY3RpdmUoKSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LCAna2V5ZG93bicpO1xuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrclwiXSwgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5yZWxvYWQoc2VsZi5nZXRBY3RpdmUoKSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LCAna2V5ZG93bicpO1xuICAkLmVhY2goSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm9wZW4tZmlsZXNcIikgfHwgXCJbXVwiKSwgZnVuY3Rpb24oaSwgcGF0aCkge1xuICAgIHNlbGYub3BlbihwYXRoKTtcbiAgfSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gdHJ5IHRvIGFjdGl2YXRlIG9wZW5pbmcgZmlsZXNcbiAgaWYgKHRoaXMuYWN0aXZhdGUocGF0aCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZWRpdG9yX21hbmFnZXIub3BlbihwYXRoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIik7XG4gICAgdmFyIG5hbWUgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIi4qL1wiKSwgXCJcIik7XG4gICAgJChcIjxkaXY+XCIpLmRhdGEoXCJwYXRoXCIsIHBhdGgpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpclwiKS50ZXh0KGRpciksXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICApLmFwcGVuZFRvKFwiI2ZpbGVzXCIpO1xuICAgIHNlbGYuYWN0aXZhdGUocGF0aCk7XG4gICAgc2VsZi5fc2F2ZUZpbGVMaXN0KCk7XG4gIH0pO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAkKFwiI2ZpbGVzIC5maWxlLWl0ZW1cIikuZmlsdGVyKGZ1bmN0aW9uKGlkeCwgaXRlbSkge1xuICAgIHJldHVybiAkKGl0ZW0pLmRhdGEoXCJwYXRoXCIpID09IHBhdGg7XG4gIH0pO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5nZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIikuZGF0YShcInBhdGhcIik7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgZmlsZSA9IHRoaXMuZ2V0KHBhdGgpO1xuICBpZiAoZmlsZS5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAkKFwiI2ZpbGVzIC5maWxlLWl0ZW0uYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICBmaWxlLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShwYXRoKTtcbiAgdmFyIGZpbmRlciA9IHJlcXVpcmUoXCIuL2ZpbmRlci5qc1wiKTtcbiAgZmluZGVyLnNldFBhdGgocGF0aCk7XG4gIHJldHVybiB0cnVlO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5uZXh0RmlsZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJvdGF0ZUZpbGUodHJ1ZSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLnByZXZGaWxlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucm90YXRlRmlsZShmYWxzZSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLnJvdGF0ZUZpbGUgPSBmdW5jdGlvbihuZXh0KSB7XG4gIHZhciBkaXIgPSBuZXh0ID8gXCJuZXh0XCIgOiBcInByZXZcIjtcbiAgdmFyIHRhcmdldCA9ICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIilbZGlyXSgpO1xuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PSAwKSB7XG4gICAgZGlyID0gbmV4dCA/IFwiZmlyc3RcIiA6IFwibGFzdFwiO1xuICAgIHRhcmdldCA9ICQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKVtkaXJdKCk7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICB0aGlzLmFjdGl2YXRlKHRhcmdldC5kYXRhKFwicGF0aFwiKSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLnNldFN0YXR1cyA9IGZ1bmN0aW9uKHBhdGgsIHN0YXR1cykge1xuICB2YXIgZmlsZSA9ICQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKS5maWx0ZXIoZnVuY3Rpb24oaWR4LCBpdGVtKSB7XG4gICAgcmV0dXJuICQoaXRlbSkuZGF0YShcInBhdGhcIikgPT0gcGF0aDtcbiAgfSk7XG4gIGZpbGUuZmluZChcIi5zdGF0dXNcIikucmVtb3ZlQ2xhc3MoXCJjbGVhbiBlcnJvciBtb2RpZmllZFwiKS5hZGRDbGFzcyhzdGF0dXMpO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHRhcmdldCA9IHRoaXMuZ2V0KHBhdGgpO1xuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0YXJnZXQuaGFzQ2xhc3MoXCJhY3RpdmVcIikpIHtcbiAgICB0aGlzLnByZXZGaWxlKCk7XG4gIH1cbiAgdGFyZ2V0LnJlbW92ZSgpO1xuICBlZGl0b3JfbWFuYWdlci5jbG9zZShwYXRoKTtcbiAgdGhpcy5fc2F2ZUZpbGVMaXN0KCk7XG59O1xuXG5GaWxlTWFuYWdlci5wcm90b3R5cGUucmVsb2FkID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLmNsb3NlKHBhdGgpO1xuICB0aGlzLm9wZW4ocGF0aCk7XG59O1xuXG5GaWxlTWFuYWdlci5wcm90b3R5cGUuX3NhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZmlsZXMgPSAkLm1hcCgkKFwiI2ZpbGVzIC5maWxlLWl0ZW1cIiksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gJChpdGVtKS5kYXRhKFwicGF0aFwiKTtcbiAgfSk7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwib3Blbi1maWxlc1wiLCBKU09OLnN0cmluZ2lmeShmaWxlcykpO1xufTtcbm1vZHVsZS5leHBvcnRzID0gbmV3IEZpbGVNYW5hZ2VyKCk7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xuXG52YXIgRmluZGVyU3VnZ2VzdCA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuZmluZGVyID0gZmluZGVyO1xuICB0aGlzLml0ZW1zID0gJChcIiNmaW5kZXItaXRlbXNcIik7XG4gIFxuICAvLyB3aGVuIGZpbmRlciBpdGVtIHdhcyBzZWxlY3RlZFxuICB0aGlzLml0ZW1zLm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgc2VsZi5maW5kZXIuc3VnZ2VzdFNlbGVjdGVkKCQoZS50YXJnZXQpLmRhdGEoXCJwYXRoXCIpKTtcbiAgfSk7XG4gIC8vIHByZXZlbnQgbG9zdCBmb2N1c1xuICB0aGlzLml0ZW1zLm9uKFwibW91c2Vkb3duXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICB9KTtcbn07XG5cbkZpbmRlclN1Z2dlc3QucHJvdG90eXBlLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuaXRlbXMuaGFzQ2xhc3MoXCJhY3RpdmVcIikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICB2YXIgc2VsZWN0ZWQgPSB0aGlzLml0ZW1zLmZpbmQoXCJhLnNlbGVjdGVkXCIpO1xuICBpZiAoc2VsZWN0ZWQubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gc2VsZWN0ZWQuZGF0YShcInBhdGhcIik7XG59O1xuXG5GaW5kZXJTdWdnZXN0LnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL2ZpbmRlci5waHBcIixcbiAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coXCJmYWlsZWQgdG8gZmV0Y2ggc3VnZ2VzdDogXCIgKyBwYXRoKTtcbiAgICAgIHJlamVjdCgpO1xuICAgIH0pLmRvbmUocmVzb2x2ZSk7XG4gIH0pO1xufTtcblxuRmluZGVyU3VnZ2VzdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBlbXB0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuaXRlbXMucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG4gICAgc2VsZi5pdGVtcy5lbXB0eSgpO1xuICB9O1xuICBzZWxmLmZldGNoKHBhdGgpLnRoZW4oZnVuY3Rpb24oc3VnZ2VzdCkge1xuICAgIGlmIChzdWdnZXN0Lml0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICBlbXB0eSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc3VnZ2VzdC5pdGVtcy5sZW5ndGggPT0gMSAmJiBzdWdnZXN0LmJhc2UgKyBzdWdnZXN0Lml0ZW1zWzBdID09IHBhdGgpIHtcbiAgICAgIGVtcHR5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIGdvdCBzb21lIHN1Z2dlc3Rpb25cbiAgICBzZWxmLml0ZW1zLmVtcHR5KCk7XG4gICAgXy5lYWNoKHN1Z2dlc3QuaXRlbXMsIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICQoXCIjZmluZGVyLWl0ZW1zXCIpLmFwcGVuZChcbiAgICAgICAgJChcIjxhPlwiKS50ZXh0KGl0ZW0pLmRhdGEoe1xuICAgICAgICAgIHBhdGg6IHN1Z2dlc3QuYmFzZSArIGl0ZW0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pO1xuICAgICQoXCIjZmluZGVyLWl0ZW1zXCIpLnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcbiAgfSkuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgZW1wdHkoKTtcbiAgfSk7XG59O1xuXG5GaW5kZXJTdWdnZXN0LnByb3RvdHlwZS5tb3ZlU2VsZWN0ID0gZnVuY3Rpb24oZG93bikge1xuICB2YXIgdGFyZ2V0ID0gdGhpcy5pdGVtcy5maW5kKFwiYS5zZWxlY3RlZFwiKTtcbiAgaWYgKHRhcmdldC5sZW5ndGgpIHtcbiAgICB0YXJnZXQucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKTtcbiAgICB2YXIgdCA9IHRhcmdldFtkb3duID8gXCJuZXh0XCIgOiBcInByZXZcIl0oKTtcbiAgICBpZiAodC5sZW5ndGgpIHtcbiAgICAgIHRhcmdldCA9IHQ7XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIHRhcmdldCA9IHRoaXMuaXRlbXMuZmluZChcImFcIikuZmlyc3QoKTtcbiAgfVxuICBpZiAodGFyZ2V0Lmxlbmd0aCkge1xuICAgIHRhcmdldC5hZGRDbGFzcyhcInNlbGVjdGVkXCIpO1xuICAgIC8vIHNjcm9sbCBpdGVtcyBwYW5lIHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KCk7XG4gICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0O1xuICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHQ7XG4gICAgdmFyIHZpZXdfaGVpZ2h0ID0gdGhpcy5pdGVtcy5pbm5lckhlaWdodCgpO1xuICAgIGlmICh0b3AgLSB0aGlzLml0ZW1zLnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgdGhpcy5pdGVtcy5zY3JvbGxUb3AodG9wKTtcbiAgICB9XG4gICAgaWYgKGJvdHRvbSAtIHRoaXMuaXRlbXMuc2Nyb2xsVG9wKCkgPiB2aWV3X2hlaWdodCkge1xuICAgICAgdGhpcy5pdGVtcy5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0O1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpO1xudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcbnZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpO1xudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpO1xudmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LmpzXCIpO1xuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5wYXRoID0gJChcIiNmaW5kZXItcGF0aFwiKS52YWwodGhpcy5fZ2V0TGFzdFBhdGgoKSk7XG4gIHRoaXMucGF0aF93YXRjaGVyID0gbnVsbDtcbiAgdGhpcy5zdWdnZXN0ID0gbmV3IEZpbmRlclN1Z2dlc3QodGhpcyk7XG4gIFxuICAvLyBvcGVuIGZpbGUgd2l0aCBlbnRlciBrZXlcbiAgTW91c2V0cmFwKHRoaXMucGF0aFswXSkuYmluZChcImVudGVyXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gc2VsZi5zdWdnZXN0LmdldFNlbGVjdGlvbigpO1xuICAgIGlmIChwYXRoKSB7XG4gICAgICBzZWxmLnN1Z2dlc3RTZWxlY3RlZChwYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZV9tYW5hZ2VyLm9wZW4oc2VsZi5wYXRoLnZhbCgpKTtcbiAgICAgIHNlbGYuaGlkZSgpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBcbiAgLy8gcGF0aCBjb21wbGV0aW9uIHdpdGggdGFiIGtleVxuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwidGFiXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gc2VsZi5wYXRoLnZhbCgpO1xuICAgIHNlbGYuc3VnZ2VzdC5mZXRjaChwYXRoKS50aGVuKGZ1bmN0aW9uKHN1Z2dlc3QpIHtcbiAgICAgIGlmIChzdWdnZXN0Lml0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChzdWdnZXN0Lml0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIHNlbGYuc2V0UGF0aChzdWdnZXN0LmJhc2UgKyBzdWdnZXN0Lml0ZW1zWzBdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coXCJjb21wbGV0aW9uIGZhaWxlZC5cIik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgLy9cbiAgTW91c2V0cmFwKHRoaXMucGF0aFswXSkuYmluZChcIm1vZCt1XCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gc2VsZi5wYXRoLnZhbCgpO1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKTtcbiAgICBzZWxmLnBhdGgudmFsKHBhdGgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuc2hvdygpO1xuICAgIHNlbGYucGF0aC5mb2N1cygpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIFxuICAvLyBoaWRlIG9uIGJsdXJcbiAgc2VsZi5wYXRoLmJsdXIoZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5oaWRlKCk7XG4gIH0pO1xuICBcbiAgLy8gc2VsZWN0IGl0ZW0gd2l0aCB1cC9kb3duIGtleVxuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwiZG93blwiLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLnN1Z2dlc3QubW92ZVNlbGVjdCh0cnVlKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwidXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5zdWdnZXN0Lm1vdmVTZWxlY3QoZmFsc2UpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIFxuICAvLyBxdWl0IGZpbmRlciB3aXRoIGVzYyBrZXlcbiAgTW91c2V0cmFwKHRoaXMucGF0aFswXSkuYmluZChcImVzY1wiLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLmhpZGUoKTtcbiAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShlZGl0b3JfbWFuYWdlci5nZXRBY3RpdmUoKSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn07XG5cbkZpbmRlci5wcm90b3R5cGUuc3VnZ2VzdFNlbGVjdGVkID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLnNldFBhdGgocGF0aCk7XG4gIGlmIChwYXRoLnN1YnN0cigtMSkgIT0gXCIvXCIpIHtcbiAgICBmaWxlX21hbmFnZXIub3BlbihwYXRoKTtcbiAgfVxufTtcblxuRmluZGVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgJChcIiNmaW5kZXJcIikuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gIFxuICAvLyBzdGFydCBzdWdnZXN0XG4gIHZhciBwYXRoQ2hhbmdlZCA9IF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5zdWdnZXN0LnVwZGF0ZShzZWxmLnBhdGgudmFsKCkpO1xuICB9LCAzMDApO1xuICBjbGVhckludGVydmFsKHNlbGYucGF0aF93YXRjaGVyKTtcbiAgc2VsZi5wYXRoX3dhdGNoZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICB2YXIgY3VycmVudCA9IHNlbGYucGF0aC52YWwoKTtcbiAgICBpZiAoY3VycmVudCAhPSBzZWxmLl9nZXRMYXN0UGF0aCgpKSB7XG4gICAgICBzZWxmLl9zZXRMYXN0UGF0aChjdXJyZW50KTtcbiAgICAgIHBhdGhDaGFuZ2VkKCk7XG4gICAgfVxuICB9LCA1MCk7XG59O1xuXG5GaW5kZXIucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbihpdGVtKSB7XG4gICQoXCIjZmluZGVyXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xufTtcblxuRmluZGVyLnByb3RvdHlwZS5zZXRQYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLnBhdGgudmFsKHBhdGgpO1xuICB0aGlzLl9zZXRMYXN0UGF0aChwYXRoKTtcbiAgdGhpcy5zdWdnZXN0LnVwZGF0ZShwYXRoKTtcbn07XG5cbkZpbmRlci5wcm90b3R5cGUuX2dldExhc3RQYXRoID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImZpbmRlci1wYXRoXCIpIHx8IFwiL1wiO1xufTtcblxuRmluZGVyLnByb3RvdHlwZS5fc2V0TGFzdFBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiZmluZGVyLXBhdGhcIiwgcGF0aCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBGaW5kZXIoKTtcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGUuanNcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgUm90YXRlLmNhbGwoXG4gICAgdGhpcywgW1wiNFNQXCIsIFwiMlNQXCIsIFwiVEFCXCJdLCB0eXBlXG4gIClcbn1cbkluZGVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJvdGF0ZS5wcm90b3R5cGUpXG5JbmRlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUm90YXRlXG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxuXG52YXIgUm90YXRlID0gZnVuY3Rpb24odmFsdWVzLCB2YWx1ZSkge1xuICB0aGlzLnZhbHVlcyA9IHZhbHVlc1xuICB0aGlzLmNoYW5nZWQgPSBuZXcgc2lnbmFscy5TaWduYWwoKVxuICB0aGlzLmNoZWNrVmFsdWUodmFsdWUpXG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxufVxuXG5Sb3RhdGUucHJvdG90eXBlLmdldFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy52YWx1ZXNcbn1cblxuUm90YXRlLnByb3RvdHlwZS5pc1ZhbGlkVmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdGhpcy52YWx1ZXMuaW5kZXhPZih2YWx1ZSkgIT0gLTFcbn1cblxuUm90YXRlLnByb3RvdHlwZS5jaGVja1ZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKCF0aGlzLmlzVmFsaWRWYWx1ZSh2YWx1ZSkpIHtcbiAgICB0aHJvdyBcImludmFsaWQgdmFsdWU6IFwiICsgdmFsdWVcbiAgfVxufVxuXG5Sb3RhdGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy52YWx1ZVxufVxuXG5Sb3RhdGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PSB0aGlzLnZhbHVlKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgdGhpcy5jaGVja1ZhbHVlKHZhbHVlKVxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5jaGFuZ2VkLmRpc3BhdGNoKHRoaXMudmFsdWUpXG59XG5cblJvdGF0ZS5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpZHggPSB0aGlzLnZhbHVlcy5pbmRleE9mKHRoaXMudmFsdWUpXG4gIGlkeCA9IChpZHggKyAxKSAlIHRoaXMudmFsdWVzLmxlbmd0aFxuICB0aGlzLnNldCh0aGlzLnZhbHVlc1tpZHhdKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdGF0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzLnJ1biA9IGZ1bmN0aW9uKCkge1xuICB2YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKTtcbiAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gIHZhciBmaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXIuanNcIik7XG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCs7XCIsIFwibW9kKz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5uZXh0RmlsZSgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSwgJ2tleWRvd24nKTtcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3NoaWZ0KztcIiwgXCJtb2Qrc2hpZnQrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnByZXZGaWxlKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LCAna2V5ZG93bicpO1xufTtcbiJdfQ==
