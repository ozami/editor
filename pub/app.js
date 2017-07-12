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
      // calc indent size
      var indentWithTabs = false;
      var indentUnit = 4;
      if (reply.content.match(/[\r\n]+\t/)) {
        indentWithTabs = true;
      } else {
        indentUnit = self.calcIndentUnit(reply.content);
      }
      (function() {
        var code_mirror = CodeMirror(editor[0], {
          value: reply.content,
          lineNumbers: true,
          indentWithTabs: indentWithTabs,
          tabSize: indentUnit,
          indentUnit: indentUnit,
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
            $('<div class="editor-indent">'),
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
        var updateIndentInfo = function() {
          var style;
          if (code_mirror.getOption("indentWithTabs")) {
            style = "TAB";
          }
          else {
            style = code_mirror.getOption("indentUnit") + "SP";
          }
          editor.find(".editor-indent").text(style);
        };
        updateIndentInfo();
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
EditorManager.prototype.calcIndentUnit = function(content) {
  var lines = content.split(/[\r\n]+/);
  for (var i = 0; i < lines.length; ++i) {
    var indent = lines[i].replace(/^( *).*/, "$1");
    if (indent.length == 2) {
      return 2;
    }
  }
  return 4;
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

},{"./file.js":2,"./text-mode.js":5,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","jquery":"jquery","underscore":"underscore"}],2:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXIuanMiLCJqcy90ZXh0LW1vZGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpO1xudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIik7XG5yZXF1aXJlKFwiY29kZW1pcnJvci1hZGRvblwiKTtcbnJlcXVpcmUoXCIuL3RleHQtbW9kZS5qc1wiKTtcblxuLy8gRWRpdG9yTWFuYWdlclxudmFyIEVkaXRvck1hbmFnZXIgPSBmdW5jdGlvbigpIHtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAkLmFqYXgoe1xuICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgIHVybDogXCIvcmVhZC5waHBcIixcbiAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KXtcbiAgICAgIGlmIChyZXBseS5lcnJvcikge1xuICAgICAgICBhbGVydChyZXBseS5lcnJvcik7XG4gICAgICAgIHJlamVjdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZW5jb2RpbmcgPSByZXBseS5lbmNvZGluZztcbiAgICAgIHZhciBlZGl0b3IgPSAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJlZGl0b3JcIikuYXBwZW5kVG8oXCIjZWRpdG9yc1wiKTtcbiAgICAgIHZhciBtb2RlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZXh0ZW5zaW9uID0gcGF0aC5yZXBsYWNlKC8uKlsuXSguKykkLywgXCIkMVwiKTtcbiAgICAgICAgdmFyIG1vZGUgPSB7XG4gICAgICAgICAgaHRtbDogXCJwaHBcIixcbiAgICAgICAgICB0YWc6IFwicGhwXCIsXG4gICAgICAgIH1bZXh0ZW5zaW9uXTtcbiAgICAgICAgaWYgKG1vZGUpIHtcbiAgICAgICAgICByZXR1cm4gbW9kZTtcbiAgICAgICAgfVxuICAgICAgICBtb2RlID0gQ29kZU1pcnJvci5maW5kTW9kZUJ5RXh0ZW5zaW9uKGV4dGVuc2lvbik7XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGUubW9kZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJ0ZXh0XCI7XG4gICAgICB9KSgpO1xuICAgICAgLy8gY2FsYyBpbmRlbnQgc2l6ZVxuICAgICAgdmFyIGluZGVudFdpdGhUYWJzID0gZmFsc2U7XG4gICAgICB2YXIgaW5kZW50VW5pdCA9IDQ7XG4gICAgICBpZiAocmVwbHkuY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICAgICAgaW5kZW50V2l0aFRhYnMgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5kZW50VW5pdCA9IHNlbGYuY2FsY0luZGVudFVuaXQocmVwbHkuY29udGVudCk7XG4gICAgICB9XG4gICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb2RlX21pcnJvciA9IENvZGVNaXJyb3IoZWRpdG9yWzBdLCB7XG4gICAgICAgICAgdmFsdWU6IHJlcGx5LmNvbnRlbnQsXG4gICAgICAgICAgbGluZU51bWJlcnM6IHRydWUsXG4gICAgICAgICAgaW5kZW50V2l0aFRhYnM6IGluZGVudFdpdGhUYWJzLFxuICAgICAgICAgIHRhYlNpemU6IGluZGVudFVuaXQsXG4gICAgICAgICAgaW5kZW50VW5pdDogaW5kZW50VW5pdCxcbiAgICAgICAgICBzaG93Q3Vyc29yV2hlblNlbGVjdGluZzogdHJ1ZSxcbiAgICAgICAgICBhdXRvQ2xvc2VCcmFja2V0czogdHJ1ZSxcbiAgICAgICAgICBtYXRjaEJyYWNrZXRzOiB0cnVlLFxuICAgICAgICAgIG1hdGNoVGFnczogdHJ1ZSxcbiAgICAgICAgICBhdXRvQ2xvc2VUYWdzOiB0cnVlLFxuICAgICAgICAgIHN0eWxlQWN0aXZlTGluZTogdHJ1ZSxcbiAgICAgICAgICBzdHlsZVNlbGVjdGVkVGV4dDogdHJ1ZSxcbiAgICAgICAgICBtb2RlOiBtb2RlLFxuICAgICAgICAgIGRyYWdEcm9wOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIENvZGVNaXJyb3IucmVnaXN0ZXJIZWxwZXIoXCJoaW50V29yZHNcIiwgbW9kZSwgbnVsbCk7XG4gICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImV4dHJhS2V5c1wiLCB7XG4gICAgICAgICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgICAgICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICAgICAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICAgICAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgICAgICAgIFRhYjogXCJpbmRlbnRBdXRvXCIsXG4gICAgICAgICAgXCJDdHJsLURcIjogZmFsc2UsXG4gICAgICAgICAgXCJDbWQtRFwiOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcInN0eWxlQWN0aXZlTGluZVwiLCB7bm9uRW1wdHk6IHRydWV9KTtcbiAgICAgICAgLy8gbWFpbnRhaW4gaW5kZW50YXRpb24gb24gcGFzdGVcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJiZWZvcmVDaGFuZ2VcIiwgZnVuY3Rpb24oY20sIGNoYW5nZSkge1xuICAgICAgICAgIGlmIChjaGFuZ2Uub3JpZ2luICE9IFwicGFzdGVcIikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoQ29kZU1pcnJvci5jbXBQb3MoY2hhbmdlLmZyb20sIGNoYW5nZS50bykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gICAgICAgICAgdmFyIGRlc3QgPSBjbS5nZXRMaW5lKGNoYW5nZS5mcm9tLmxpbmUpO1xuICAgICAgICAgIGlmIChkZXN0Lmxlbmd0aCAhPSBjaGFuZ2UuZnJvbS5jaCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICAgICAgICAgIGlmIChkZXN0Lm1hdGNoKC9bXiBcXHRdLykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgICAgICAgICBpZiAoY2hhbmdlLnRleHRbY2hhbmdlLnRleHQubGVuZ3RoIC0gMV0gPT0gXCJcIikge1xuICAgICAgICAgICAgY2hhbmdlLnRleHQucG9wKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdO1xuICAgICAgICAgIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLm1hdGNoKC9eKFsgXFx0XSopKC4qKS8pO1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IGxpbmVbMV07XG4gICAgICAgICAgICB2YXIgdGV4dCA9IGxpbmVbMl07XG4gICAgICAgICAgICBpbmRlbnQgPSAoZGVzdCArIGluZGVudCkuc3Vic3RyKDAsIGRlc3QubGVuZ3RoICsgaW5kZW50Lmxlbmd0aCAtIGJhc2VfaW5kZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZW50ICsgdGV4dDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjaGFuZ2UudGV4dFswXSA9IGNoYW5nZS50ZXh0WzBdLnN1YnN0cihkZXN0Lmxlbmd0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2RlX21pcnJvci5vbihcImNoYW5nZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYXV0b1NhdmUoKTtcbiAgICAgICAgICB2YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKTtcbiAgICAgICAgICBmaWxlX21hbmFnZXIuc2V0U3RhdHVzKFxuICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSA/IFwiY2xlYW5cIjogXCJtb2RpZmllZFwiXG4gICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBjbV9pbnB1dCA9IGNvZGVfbWlycm9yLmdldElucHV0RmllbGQoKTtcbiAgICAgICAgJChjbV9pbnB1dCkuYWRkQ2xhc3MoXCJtb3VzZXRyYXBcIik7IC8vIGVuYWJsZSBob3RrZXlcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2JcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJnb1dvcmRMZWZ0XCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtmXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZ29Xb3JkUmlnaHRcIik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwiYWx0K2hcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3IuZXhlY0NvbW1hbmQoXCJkZWxXb3JkQmVmb3JlXCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtkXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZGVsV29yZEFmdGVyXCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtkXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLnNldFNlbGVjdGlvbnMoXG4gICAgICAgICAgICBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjb2RlX21pcnJvci5maW5kV29yZEF0KGkuYW5jaG9yKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2QrbFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKFxuICAgICAgICAgICAgY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgICAgICAgICAgY2g6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICAgICAgICAgIGxpbmU6IGkuYW5jaG9yLmxpbmUsXG4gICAgICAgICAgICAgICAgICBjaDogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK3NoaWZ0K2xcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGlvbnMgPSBjb2RlX21pcnJvci5saXN0U2VsZWN0aW9ucygpO1xuICAgICAgICAgIGlmIChzZWxlY3Rpb25zLmxlbmd0aCAhPSAxKSB7XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYW5jaG9yID0gc2VsZWN0aW9uc1swXS5hbmNob3I7XG4gICAgICAgICAgdmFyIGhlYWQgPSBzZWxlY3Rpb25zWzBdLmhlYWQ7XG4gICAgICAgICAgdmFyIG5ld19zZWxlY3Rpb25zID0gW107XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGFuY2hvci5saW5lOyBpIDw9IGhlYWQubGluZTsgKytpKSB7XG4gICAgICAgICAgICBuZXdfc2VsZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgICAgICAgbGluZTogaSxcbiAgICAgICAgICAgICAgICBjaDogaSA9PSBhbmNob3IubGluZSA/IGFuY2hvci5jaCA6IDBcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaGVhZDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGksXG4gICAgICAgICAgICAgICAgY2g6IGkgPT0gaGVhZC5saW5lID8gaGVhZC5jaCA6IEluZmluaXR5XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKG5ld19zZWxlY3Rpb25zKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gY29kZV9taXJyb3IuY2hhbmdlR2VuZXJhdGlvbih0cnVlKTtcbiAgICAgICAgLy8gc3RhdHVzIGJhclxuICAgICAgICBlZGl0b3IuYXBwZW5kKFxuICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZm9vdFwiPicpLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbWVzc2FnZVwiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1pbmRlbnRcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW9sXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVuY29kaW5nXCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1vZGVcIj4nKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgICAgdmFyIHVwZGF0ZU1vZGVJbmZvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG1vZGUgPSBjb2RlX21pcnJvci5nZXRNb2RlKCk7XG4gICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlLm5hbWUpO1xuICAgICAgICB9O1xuICAgICAgICB1cGRhdGVNb2RlSW5mbygpO1xuICAgICAgICB2YXIgdXBkYXRlSW5kZW50SW5mbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzdHlsZTtcbiAgICAgICAgICBpZiAoY29kZV9taXJyb3IuZ2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIikpIHtcbiAgICAgICAgICAgIHN0eWxlID0gXCJUQUJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdHlsZSA9IGNvZGVfbWlycm9yLmdldE9wdGlvbihcImluZGVudFVuaXRcIikgKyBcIlNQXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1pbmRlbnRcIikudGV4dChzdHlsZSk7XG4gICAgICAgIH07XG4gICAgICAgIHVwZGF0ZUluZGVudEluZm8oKTtcbiAgICAgICAgLy8gbGluZSBzZXByYXRvclxuICAgICAgICB2YXIgZW9sID0gc2VsZi5kZXRlY3RFb2wocmVwbHkuY29udGVudCk7XG4gICAgICAgIHZhciBlb2xfbmFtZXMgPSB7XG4gICAgICAgICAgXCJcXHJcIjogXCJDUlwiLFxuICAgICAgICAgIFwiXFxuXCI6IFwiTEZcIixcbiAgICAgICAgICBcIlxcclxcblwiOiBcIkNSTEZcIlxuICAgICAgICB9O1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQoZW9sX25hbWVzW2VvbF0pO1xuICAgICAgICAvLyBlbmNvZGluZ1xuICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZyk7XG4gICAgICAgIFxuICAgICAgICBlZGl0b3IuZGF0YShcInBhdGhcIiwgcGF0aCk7XG4gICAgICAgIGVkaXRvci5kYXRhKFwiY29kZV9taXJyb3JcIiwgY29kZV9taXJyb3IpO1xuICAgICAgICAvLyBzYXZlXG4gICAgICAgIHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGdlbmVyYXRpb24gPSBjb2RlX21pcnJvci5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpO1xuICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IFwiL3dyaXRlLnBocFwiLFxuICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgIGVuY29kaW5nOiBlbmNvZGluZyxcbiAgICAgICAgICAgICAgY29udGVudDogY29kZV9taXJyb3IuZ2V0VmFsdWUoKS5yZXBsYWNlKC9cXG4vZywgZW9sKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICAgIGlmIChyZXBseSA9PSBcIm9rXCIpIHtcbiAgICAgICAgICAgICAgY29kZV9taXJyb3IubGFzdF9zYXZlID0gZ2VuZXJhdGlvbjtcbiAgICAgICAgICAgICAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gICAgICAgICAgICAgIGZpbGVfbWFuYWdlci5zZXRTdGF0dXMocGF0aCwgXCJjbGVhblwiKTtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmVkLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuIFwiICsgcmVwbHkuZXJyb3IpO1xuICAgICAgICAgICAgICB2YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKTtcbiAgICAgICAgICAgICAgZmlsZV9tYW5hZ2VyLnNldFN0YXR1cyhwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KFwiU2F2ZSBmYWlsZWQuXCIpO1xuICAgICAgICAgICAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gICAgICAgICAgICBmaWxlX21hbmFnZXIuc2V0U3RhdHVzKHBhdGgsIFwiZXJyb3JcIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIGF1dG8gc2F2ZVxuICAgICAgICB2YXIgYXV0b1NhdmUgPSBfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICghY29kZV9taXJyb3IuaXNDbGVhbihjb2RlX21pcnJvci5sYXN0X3NhdmUpKSB7XG4gICAgICAgICAgICBzYXZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCA0MDAwKTtcbiAgICAgICAgLy8gc2F2ZSB3aXRoIGNvbW1hbmQtc1xuICAgICAgICBNb3VzZXRyYXAoZWRpdG9yWzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSkoKTtcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfSk7XG4gIH0pO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgJChcIiNlZGl0b3JzIC5lZGl0b3IuYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICB2YXIgZm91bmQgPSB0aGlzLmdldChwYXRoKTtcbiAgaWYgKGZvdW5kLmxlbmd0aCkge1xuICAgIGZvdW5kLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5mb2N1cygpO1xuICAgIGZvdW5kLmRhdGEoXCJjb2RlX21pcnJvclwiKS5yZWZyZXNoKCk7XG4gIH1cbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5kYXRhKFwicGF0aFwiKTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdGhpcy5nZXQocGF0aCkucmVtb3ZlKCk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuY2FsY0luZGVudFVuaXQgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGluZGVudCA9IGxpbmVzW2ldLnJlcGxhY2UoL14oICopLiovLCBcIiQxXCIpO1xuICAgIGlmIChpbmRlbnQubGVuZ3RoID09IDIpIHtcbiAgICAgIHJldHVybiAyO1xuICAgIH1cbiAgfVxuICByZXR1cm4gNDtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5kZXRlY3RFb2wgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXFxuXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXFxuXCI7XG4gIH1cbiAgaWYgKGNvbnRlbnQubWF0Y2goXCJcXHJcIikpIHtcbiAgICByZXR1cm4gXCJcXHJcIjtcbiAgfVxuICByZXR1cm4gXCJcXG5cIjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEVkaXRvck1hbmFnZXIoKTtcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcbnZhciBlZGl0b3JfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci5qc1wiKTtcbnZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpO1xuXG4vLyBGaWxlTWFuYWdlclxudmFyIEZpbGVNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgJChcIiNmaWxlc1wiKS5vbihcImNsaWNrXCIsIFwiLmZpbGUtaXRlbVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHNlbGYub3BlbigkKGUuY3VycmVudFRhcmdldCkuZGF0YShcInBhdGhcIikpO1xuICB9KTtcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3dcIiwgXCJtb2Qra1wiXSwgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5jbG9zZShzZWxmLmdldEFjdGl2ZSgpKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sICdrZXlkb3duJyk7XG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLnJlbG9hZChzZWxmLmdldEFjdGl2ZSgpKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sICdrZXlkb3duJyk7XG4gICQuZWFjaChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwib3Blbi1maWxlc1wiKSB8fCBcIltdXCIpLCBmdW5jdGlvbihpLCBwYXRoKSB7XG4gICAgc2VsZi5vcGVuKHBhdGgpO1xuICB9KTtcbn07XG5GaWxlTWFuYWdlci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyB0cnkgdG8gYWN0aXZhdGUgb3BlbmluZyBmaWxlc1xuICBpZiAodGhpcy5hY3RpdmF0ZShwYXRoKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBlZGl0b3JfbWFuYWdlci5vcGVuKHBhdGgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRpciA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSskXCIpLCBcIlwiKTtcbiAgICB2YXIgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKTtcbiAgICAkKFwiPGRpdj5cIikuZGF0YShcInBhdGhcIiwgcGF0aCkuYWRkQ2xhc3MoXCJmaWxlLWl0ZW1cIikuYXBwZW5kKFxuICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZGlyXCIpLnRleHQoZGlyKSxcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcIm5hbWVcIikudGV4dChuYW1lKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJzdGF0dXMgY2xlYW5cIj4nKVxuICAgICkuYXBwZW5kVG8oXCIjZmlsZXNcIik7XG4gICAgc2VsZi5hY3RpdmF0ZShwYXRoKTtcbiAgICBzZWxmLl9zYXZlRmlsZUxpc3QoKTtcbiAgfSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuICQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKS5maWx0ZXIoZnVuY3Rpb24oaWR4LCBpdGVtKSB7XG4gICAgcmV0dXJuICQoaXRlbSkuZGF0YShcInBhdGhcIikgPT0gcGF0aDtcbiAgfSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLmdldEFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJChcIiNmaWxlcyAuZmlsZS1pdGVtLmFjdGl2ZVwiKS5kYXRhKFwicGF0aFwiKTtcbn07XG5GaWxlTWFuYWdlci5wcm90b3R5cGUuYWN0aXZhdGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBmaWxlID0gdGhpcy5nZXQocGF0aCk7XG4gIGlmIChmaWxlLmxlbmd0aCA9PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG4gIGZpbGUuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKHBhdGgpO1xuICB2YXIgZmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyLmpzXCIpO1xuICBmaW5kZXIuc2V0UGF0aChwYXRoKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLm5leHRGaWxlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucm90YXRlRmlsZSh0cnVlKTtcbn07XG5GaWxlTWFuYWdlci5wcm90b3R5cGUucHJldkZpbGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yb3RhdGVGaWxlKGZhbHNlKTtcbn07XG5GaWxlTWFuYWdlci5wcm90b3R5cGUucm90YXRlRmlsZSA9IGZ1bmN0aW9uKG5leHQpIHtcbiAgdmFyIGRpciA9IG5leHQgPyBcIm5leHRcIiA6IFwicHJldlwiO1xuICB2YXIgdGFyZ2V0ID0gJChcIiNmaWxlcyAuZmlsZS1pdGVtLmFjdGl2ZVwiKVtkaXJdKCk7XG4gIGlmICh0YXJnZXQubGVuZ3RoID09IDApIHtcbiAgICBkaXIgPSBuZXh0ID8gXCJmaXJzdFwiIDogXCJsYXN0XCI7XG4gICAgdGFyZ2V0ID0gJChcIiNmaWxlcyAuZmlsZS1pdGVtXCIpW2Rpcl0oKTtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHRoaXMuYWN0aXZhdGUodGFyZ2V0LmRhdGEoXCJwYXRoXCIpKTtcbn07XG5GaWxlTWFuYWdlci5wcm90b3R5cGUuc2V0U3RhdHVzID0gZnVuY3Rpb24ocGF0aCwgc3RhdHVzKSB7XG4gIHZhciBmaWxlID0gJChcIiNmaWxlcyAuZmlsZS1pdGVtXCIpLmZpbHRlcihmdW5jdGlvbihpZHgsIGl0ZW0pIHtcbiAgICByZXR1cm4gJChpdGVtKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoO1xuICB9KTtcbiAgZmlsZS5maW5kKFwiLnN0YXR1c1wiKS5yZW1vdmVDbGFzcyhcImNsZWFuIGVycm9yIG1vZGlmaWVkXCIpLmFkZENsYXNzKHN0YXR1cyk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgdGFyZ2V0ID0gdGhpcy5nZXQocGF0aCk7XG4gIGlmICh0YXJnZXQubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHRhcmdldC5oYXNDbGFzcyhcImFjdGl2ZVwiKSkge1xuICAgIHRoaXMucHJldkZpbGUoKTtcbiAgfVxuICB0YXJnZXQucmVtb3ZlKCk7XG4gIGVkaXRvcl9tYW5hZ2VyLmNsb3NlKHBhdGgpO1xuICB0aGlzLl9zYXZlRmlsZUxpc3QoKTtcbn07XG5cbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5yZWxvYWQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMuY2xvc2UocGF0aCk7XG4gIHRoaXMub3BlbihwYXRoKTtcbn07XG5cbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5fc2F2ZUZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmaWxlcyA9ICQubWFwKCQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKSwgZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAkKGl0ZW0pLmRhdGEoXCJwYXRoXCIpO1xuICB9KTtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJvcGVuLWZpbGVzXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzKSk7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgRmlsZU1hbmFnZXIoKTtcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG5cbnZhciBGaW5kZXJTdWdnZXN0ID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5maW5kZXIgPSBmaW5kZXI7XG4gIHRoaXMuaXRlbXMgPSAkKFwiI2ZpbmRlci1pdGVtc1wiKTtcbiAgXG4gIC8vIHdoZW4gZmluZGVyIGl0ZW0gd2FzIHNlbGVjdGVkXG4gIHRoaXMuaXRlbXMub24oXCJjbGlja1wiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBzZWxmLmZpbmRlci5zdWdnZXN0U2VsZWN0ZWQoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpO1xuICB9KTtcbiAgLy8gcHJldmVudCBsb3N0IGZvY3VzXG4gIHRoaXMuaXRlbXMub24oXCJtb3VzZWRvd25cIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIH0pO1xufTtcblxuRmluZGVyU3VnZ2VzdC5wcm90b3R5cGUuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5pdGVtcy5oYXNDbGFzcyhcImFjdGl2ZVwiKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZhciBzZWxlY3RlZCA9IHRoaXMuaXRlbXMuZmluZChcImEuc2VsZWN0ZWRcIik7XG4gIGlmIChzZWxlY3RlZC5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBzZWxlY3RlZC5kYXRhKFwicGF0aFwiKTtcbn07XG5cbkZpbmRlclN1Z2dlc3QucHJvdG90eXBlLmZldGNoID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAkLmFqYXgoe1xuICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgIHVybDogXCIvZmluZGVyLnBocFwiLFxuICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZyhcImZhaWxlZCB0byBmZXRjaCBzdWdnZXN0OiBcIiArIHBhdGgpO1xuICAgICAgcmVqZWN0KCk7XG4gICAgfSkuZG9uZShyZXNvbHZlKTtcbiAgfSk7XG59O1xuXG5GaW5kZXJTdWdnZXN0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGVtcHR5ID0gZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5pdGVtcy5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKTtcbiAgICBzZWxmLml0ZW1zLmVtcHR5KCk7XG4gIH07XG4gIHNlbGYuZmV0Y2gocGF0aCkudGhlbihmdW5jdGlvbihzdWdnZXN0KSB7XG4gICAgaWYgKHN1Z2dlc3QuaXRlbXMubGVuZ3RoID09IDApIHtcbiAgICAgIGVtcHR5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzdWdnZXN0Lml0ZW1zLmxlbmd0aCA9PSAxICYmIHN1Z2dlc3QuYmFzZSArIHN1Z2dlc3QuaXRlbXNbMF0gPT0gcGF0aCkge1xuICAgICAgZW1wdHkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gZ290IHNvbWUgc3VnZ2VzdGlvblxuICAgIHNlbGYuaXRlbXMuZW1wdHkoKTtcbiAgICBfLmVhY2goc3VnZ2VzdC5pdGVtcywgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgJChcIiNmaW5kZXItaXRlbXNcIikuYXBwZW5kKFxuICAgICAgICAkKFwiPGE+XCIpLnRleHQoaXRlbSkuZGF0YSh7XG4gICAgICAgICAgcGF0aDogc3VnZ2VzdC5iYXNlICsgaXRlbSxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgJChcIiNmaW5kZXItaXRlbXNcIikuc2Nyb2xsVG9wKDApLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICB9KS5jYXRjaChmdW5jdGlvbigpIHtcbiAgICBlbXB0eSgpO1xuICB9KTtcbn07XG5cbkZpbmRlclN1Z2dlc3QucHJvdG90eXBlLm1vdmVTZWxlY3QgPSBmdW5jdGlvbihkb3duKSB7XG4gIHZhciB0YXJnZXQgPSB0aGlzLml0ZW1zLmZpbmQoXCJhLnNlbGVjdGVkXCIpO1xuICBpZiAodGFyZ2V0Lmxlbmd0aCkge1xuICAgIHRhcmdldC5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpO1xuICAgIHZhciB0ID0gdGFyZ2V0W2Rvd24gPyBcIm5leHRcIiA6IFwicHJldlwiXSgpO1xuICAgIGlmICh0Lmxlbmd0aCkge1xuICAgICAgdGFyZ2V0ID0gdDtcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgdGFyZ2V0ID0gdGhpcy5pdGVtcy5maW5kKFwiYVwiKS5maXJzdCgpO1xuICB9XG4gIGlmICh0YXJnZXQubGVuZ3RoKSB7XG4gICAgdGFyZ2V0LmFkZENsYXNzKFwic2VsZWN0ZWRcIik7XG4gICAgLy8gc2Nyb2xsIGl0ZW1zIHBhbmUgdG8gbWFrZSB0aGUgc2VsZWN0ZWQgaXRlbSB2aXNpYmxlXG4gICAgdmFyIGhlaWdodCA9IHRhcmdldC5oZWlnaHQoKTtcbiAgICB2YXIgdG9wID0gdGFyZ2V0LnByZXZBbGwoKS5sZW5ndGggKiBoZWlnaHQ7XG4gICAgdmFyIGJvdHRvbSA9IHRvcCArIGhlaWdodDtcbiAgICB2YXIgdmlld19oZWlnaHQgPSB0aGlzLml0ZW1zLmlubmVySGVpZ2h0KCk7XG4gICAgaWYgKHRvcCAtIHRoaXMuaXRlbXMuc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICB0aGlzLml0ZW1zLnNjcm9sbFRvcCh0b3ApO1xuICAgIH1cbiAgICBpZiAoYm90dG9tIC0gdGhpcy5pdGVtcy5zY3JvbGxUb3AoKSA+IHZpZXdfaGVpZ2h0KSB7XG4gICAgICB0aGlzLml0ZW1zLnNjcm9sbFRvcChib3R0b20gLSB2aWV3X2hlaWdodCk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3Q7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIik7XG52YXIgZWRpdG9yX21hbmFnZXIgPSByZXF1aXJlKFwiLi9lZGl0b3IuanNcIik7XG52YXIgZmlsZV9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZmlsZS5qc1wiKTtcbnZhciBGaW5kZXJTdWdnZXN0ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3QuanNcIik7XG5cbnZhciBGaW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnBhdGggPSAkKFwiI2ZpbmRlci1wYXRoXCIpLnZhbCh0aGlzLl9nZXRMYXN0UGF0aCgpKTtcbiAgdGhpcy5wYXRoX3dhdGNoZXIgPSBudWxsO1xuICB0aGlzLnN1Z2dlc3QgPSBuZXcgRmluZGVyU3VnZ2VzdCh0aGlzKTtcbiAgXG4gIC8vIG9wZW4gZmlsZSB3aXRoIGVudGVyIGtleVxuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwiZW50ZXJcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhdGggPSBzZWxmLnN1Z2dlc3QuZ2V0U2VsZWN0aW9uKCk7XG4gICAgaWYgKHBhdGgpIHtcbiAgICAgIHNlbGYuc3VnZ2VzdFNlbGVjdGVkKHBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlX21hbmFnZXIub3BlbihzZWxmLnBhdGgudmFsKCkpO1xuICAgICAgc2VsZi5oaWRlKCk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIFxuICAvLyBwYXRoIGNvbXBsZXRpb24gd2l0aCB0YWIga2V5XG4gIE1vdXNldHJhcCh0aGlzLnBhdGhbMF0pLmJpbmQoXCJ0YWJcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhdGggPSBzZWxmLnBhdGgudmFsKCk7XG4gICAgc2VsZi5zdWdnZXN0LmZldGNoKHBhdGgpLnRoZW4oZnVuY3Rpb24oc3VnZ2VzdCkge1xuICAgICAgaWYgKHN1Z2dlc3QuaXRlbXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHN1Z2dlc3QuaXRlbXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgc2VsZi5zZXRQYXRoKHN1Z2dlc3QuYmFzZSArIHN1Z2dlc3QuaXRlbXNbMF0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZyhcImNvbXBsZXRpb24gZmFpbGVkLlwiKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICAvL1xuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwibW9kK3VcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhdGggPSBzZWxmLnBhdGgudmFsKCk7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSovPyRcIiksIFwiXCIpO1xuICAgIHNlbGYucGF0aC52YWwocGF0aCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgLy8gc2hvdyBmaW5kZXJcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK29cIiwgXCJtb2QrcFwiXSwgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5zaG93KCk7XG4gICAgc2VsZi5wYXRoLmZvY3VzKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgXG4gIC8vIGhpZGUgb24gYmx1clxuICBzZWxmLnBhdGguYmx1cihmdW5jdGlvbigpIHtcbiAgICBzZWxmLmhpZGUoKTtcbiAgfSk7XG4gIFxuICAvLyBzZWxlY3QgaXRlbSB3aXRoIHVwL2Rvd24ga2V5XG4gIE1vdXNldHJhcCh0aGlzLnBhdGhbMF0pLmJpbmQoXCJkb3duXCIsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuc3VnZ2VzdC5tb3ZlU2VsZWN0KHRydWUpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIE1vdXNldHJhcCh0aGlzLnBhdGhbMF0pLmJpbmQoXCJ1cFwiLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLnN1Z2dlc3QubW92ZVNlbGVjdChmYWxzZSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgXG4gIC8vIHF1aXQgZmluZGVyIHdpdGggZXNjIGtleVxuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwiZXNjXCIsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuaGlkZSgpO1xuICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKGVkaXRvcl9tYW5hZ2VyLmdldEFjdGl2ZSgpKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufTtcblxuRmluZGVyLnByb3RvdHlwZS5zdWdnZXN0U2VsZWN0ZWQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMuc2V0UGF0aChwYXRoKTtcbiAgaWYgKHBhdGguc3Vic3RyKC0xKSAhPSBcIi9cIikge1xuICAgIGZpbGVfbWFuYWdlci5vcGVuKHBhdGgpO1xuICB9XG59O1xuXG5GaW5kZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAkKFwiI2ZpbmRlclwiKS5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcbiAgXG4gIC8vIHN0YXJ0IHN1Z2dlc3RcbiAgdmFyIHBhdGhDaGFuZ2VkID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICBzZWxmLnN1Z2dlc3QudXBkYXRlKHNlbGYucGF0aC52YWwoKSk7XG4gIH0sIDMwMCk7XG4gIGNsZWFySW50ZXJ2YWwoc2VsZi5wYXRoX3dhdGNoZXIpO1xuICBzZWxmLnBhdGhfd2F0Y2hlciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXJyZW50ID0gc2VsZi5wYXRoLnZhbCgpO1xuICAgIGlmIChjdXJyZW50ICE9IHNlbGYuX2dldExhc3RQYXRoKCkpIHtcbiAgICAgIHNlbGYuX3NldExhc3RQYXRoKGN1cnJlbnQpO1xuICAgICAgcGF0aENoYW5nZWQoKTtcbiAgICB9XG4gIH0sIDUwKTtcbn07XG5cbkZpbmRlci5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgJChcIiNmaW5kZXJcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG59O1xuXG5GaW5kZXIucHJvdG90eXBlLnNldFBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMucGF0aC52YWwocGF0aCk7XG4gIHRoaXMuX3NldExhc3RQYXRoKHBhdGgpO1xuICB0aGlzLnN1Z2dlc3QudXBkYXRlKHBhdGgpO1xufTtcblxuRmluZGVyLnByb3RvdHlwZS5fZ2V0TGFzdFBhdGggPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZmluZGVyLXBhdGhcIikgfHwgXCIvXCI7XG59O1xuXG5GaW5kZXIucHJvdG90eXBlLl9zZXRMYXN0UGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJmaW5kZXItcGF0aFwiLCBwYXRoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEZpbmRlcigpO1xuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKTtcblxuQ29kZU1pcnJvci5kZWZpbmVTaW1wbGVNb2RlKFwidGV4dFwiLCB7XG4gIHN0YXJ0OiBbXSxcbiAgY29tbWVudDogW10sXG4gIG1ldGE6IHt9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzLnJ1biA9IGZ1bmN0aW9uKCkge1xuICB2YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKTtcbiAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gIHZhciBmaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXIuanNcIik7XG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCs7XCIsIFwibW9kKz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5uZXh0RmlsZSgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSwgJ2tleWRvd24nKTtcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3NoaWZ0KztcIiwgXCJtb2Qrc2hpZnQrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmlsZV9tYW5hZ2VyLnByZXZGaWxlKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LCAna2V5ZG93bicpO1xufTtcbiJdfQ==
