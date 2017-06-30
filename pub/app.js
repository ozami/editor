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
  setTimeout(function() {
    $.each(JSON.parse(localStorage.getItem("open-files") || "[]"), function(i, path) {
      self.open(path);
    });
  }, 100);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3QuanMiLCJqcy9maW5kZXIuanMiLCJqcy90ZXh0LW1vZGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpO1xucmVxdWlyZShcImNvZGVtaXJyb3ItYWRkb25cIik7XG5yZXF1aXJlKFwiLi90ZXh0LW1vZGUuanNcIik7XG5cbi8vIEVkaXRvck1hbmFnZXJcbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oKSB7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgZGF0YToge1xuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSl7XG4gICAgICBpZiAocmVwbHkuZXJyb3IpIHtcbiAgICAgICAgYWxlcnQocmVwbHkuZXJyb3IpO1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGVuY29kaW5nID0gcmVwbHkuZW5jb2Rpbmc7XG4gICAgICB2YXIgZWRpdG9yID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZWRpdG9yXCIpLmFwcGVuZFRvKFwiI2VkaXRvcnNcIik7XG4gICAgICB2YXIgbW9kZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIik7XG4gICAgICAgIHZhciBtb2RlID0ge1xuICAgICAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICAgICAgdGFnOiBcInBocFwiLFxuICAgICAgICB9W2V4dGVuc2lvbl07XG4gICAgICAgIGlmIChtb2RlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pO1xuICAgICAgICBpZiAobW9kZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlLm1vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwidGV4dFwiO1xuICAgICAgfSkoKTtcbiAgICAgIC8vIGNhbGMgaW5kZW50IHNpemVcbiAgICAgIHZhciBpbmRlbnRXaXRoVGFicyA9IGZhbHNlO1xuICAgICAgdmFyIGluZGVudFVuaXQgPSA0O1xuICAgICAgaWYgKHJlcGx5LmNvbnRlbnQubWF0Y2goL1tcXHJcXG5dK1xcdC8pKSB7XG4gICAgICAgIGluZGVudFdpdGhUYWJzID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluZGVudFVuaXQgPSBzZWxmLmNhbGNJbmRlbnRVbml0KHJlcGx5LmNvbnRlbnQpO1xuICAgICAgfVxuICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29kZV9taXJyb3IgPSBDb2RlTWlycm9yKGVkaXRvclswXSwge1xuICAgICAgICAgIHZhbHVlOiByZXBseS5jb250ZW50LFxuICAgICAgICAgIGxpbmVOdW1iZXJzOiB0cnVlLFxuICAgICAgICAgIGluZGVudFdpdGhUYWJzOiBpbmRlbnRXaXRoVGFicyxcbiAgICAgICAgICB0YWJTaXplOiBpbmRlbnRVbml0LFxuICAgICAgICAgIGluZGVudFVuaXQ6IGluZGVudFVuaXQsXG4gICAgICAgICAgc2hvd0N1cnNvcldoZW5TZWxlY3Rpbmc6IHRydWUsXG4gICAgICAgICAgYXV0b0Nsb3NlQnJhY2tldHM6IHRydWUsXG4gICAgICAgICAgbWF0Y2hCcmFja2V0czogdHJ1ZSxcbiAgICAgICAgICBtYXRjaFRhZ3M6IHRydWUsXG4gICAgICAgICAgYXV0b0Nsb3NlVGFnczogdHJ1ZSxcbiAgICAgICAgICBtb2RlOiBtb2RlLFxuICAgICAgICAgIGRyYWdEcm9wOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIENvZGVNaXJyb3IucmVnaXN0ZXJIZWxwZXIoXCJoaW50V29yZHNcIiwgbW9kZSwgbnVsbCk7XG4gICAgICAgIGNvZGVfbWlycm9yLnNldE9wdGlvbihcImV4dHJhS2V5c1wiLCB7XG4gICAgICAgICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgICAgICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICAgICAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICAgICAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgICAgICAgIFRhYjogXCJpbmRlbnRBdXRvXCIsXG4gICAgICAgICAgXCJDdHJsLURcIjogZmFsc2UsXG4gICAgICAgICAgXCJDbWQtRFwiOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIG1haW50YWluIGluZGVudGF0aW9uIG9uIHBhc3RlXG4gICAgICAgIGNvZGVfbWlycm9yLm9uKFwiYmVmb3JlQ2hhbmdlXCIsIGZ1bmN0aW9uKGNtLCBjaGFuZ2UpIHtcbiAgICAgICAgICBpZiAoY2hhbmdlLm9yaWdpbiAhPSBcInBhc3RlXCIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKENvZGVNaXJyb3IuY21wUG9zKGNoYW5nZS5mcm9tLCBjaGFuZ2UudG8pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSBpbnNlcnRpb24gcG9pbnQgaXMgYXQgdGhlIGVuZCBvZiB0aGUgbGluZVxuICAgICAgICAgIHZhciBkZXN0ID0gY20uZ2V0TGluZShjaGFuZ2UuZnJvbS5saW5lKTtcbiAgICAgICAgICBpZiAoZGVzdC5sZW5ndGggIT0gY2hhbmdlLmZyb20uY2gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGxpbmUgY29uc2lzdHMgb2Ygb25seSB3aGl0ZSBzcGFjZXNcbiAgICAgICAgICBpZiAoZGVzdC5tYXRjaCgvW14gXFx0XS8pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCBlbXB0eSBsaW5lXG4gICAgICAgICAgaWYgKGNoYW5nZS50ZXh0W2NoYW5nZS50ZXh0Lmxlbmd0aCAtIDFdID09IFwiXCIpIHtcbiAgICAgICAgICAgIGNoYW5nZS50ZXh0LnBvcCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYmFzZV9pbmRlbnQgPSBjaGFuZ2UudGV4dFswXS5tYXRjaCgvXlsgXFx0XSovKVswXTtcbiAgICAgICAgICBjaGFuZ2UudGV4dCA9IGNoYW5nZS50ZXh0Lm1hcChmdW5jdGlvbihsaW5lLCBpKSB7XG4gICAgICAgICAgICBsaW5lID0gbGluZS5tYXRjaCgvXihbIFxcdF0qKSguKikvKTtcbiAgICAgICAgICAgIHZhciBpbmRlbnQgPSBsaW5lWzFdO1xuICAgICAgICAgICAgdmFyIHRleHQgPSBsaW5lWzJdO1xuICAgICAgICAgICAgaW5kZW50ID0gKGRlc3QgKyBpbmRlbnQpLnN1YnN0cigwLCBkZXN0Lmxlbmd0aCArIGluZGVudC5sZW5ndGggLSBiYXNlX2luZGVudC5sZW5ndGgpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGVudCArIHRleHQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY2hhbmdlLnRleHRbMF0gPSBjaGFuZ2UudGV4dFswXS5zdWJzdHIoZGVzdC5sZW5ndGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29kZV9taXJyb3Iub24oXCJjaGFuZ2VzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1dG9TYXZlKCk7XG4gICAgICAgICAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gICAgICAgICAgZmlsZV9tYW5hZ2VyLnNldFN0YXR1cyhcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBjb2RlX21pcnJvci5pc0NsZWFuKGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSkgPyBcImNsZWFuXCI6IFwibW9kaWZpZWRcIlxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgY21faW5wdXQgPSBjb2RlX21pcnJvci5nZXRJbnB1dEZpZWxkKCk7XG4gICAgICAgICQoY21faW5wdXQpLmFkZENsYXNzKFwibW91c2V0cmFwXCIpOyAvLyBlbmFibGUgaG90a2V5XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtiXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZ29Xb3JkTGVmdFwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrZlwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImdvV29yZFJpZ2h0XCIpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcImFsdCtoXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvZGVfbWlycm9yLmV4ZWNDb21tYW5kKFwiZGVsV29yZEJlZm9yZVwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJhbHQrZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5leGVjQ29tbWFuZChcImRlbFdvcmRBZnRlclwiKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBNb3VzZXRyYXAoY21faW5wdXQpLmJpbmQoXCJtb2QrZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb2RlX21pcnJvci5zZXRTZWxlY3Rpb25zKFxuICAgICAgICAgICAgY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICByZXR1cm4gY29kZV9taXJyb3IuZmluZFdvcmRBdChpLmFuY2hvcik7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgTW91c2V0cmFwKGNtX2lucHV0KS5iaW5kKFwibW9kK2xcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhcbiAgICAgICAgICAgIGNvZGVfbWlycm9yLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICAgICAgICAgIGxpbmU6IGkuaGVhZC5saW5lICsgMSxcbiAgICAgICAgICAgICAgICAgIGNoOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgICAgICAgICBsaW5lOiBpLmFuY2hvci5saW5lLFxuICAgICAgICAgICAgICAgICAgY2g6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIE1vdXNldHJhcChjbV9pbnB1dCkuYmluZChcIm1vZCtzaGlmdCtsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzZWxlY3Rpb25zID0gY29kZV9taXJyb3IubGlzdFNlbGVjdGlvbnMoKTtcbiAgICAgICAgICBpZiAoc2VsZWN0aW9ucy5sZW5ndGggIT0gMSkge1xuICAgICAgICAgICAgLy8gRG8gbm90aGluZztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGFuY2hvciA9IHNlbGVjdGlvbnNbMF0uYW5jaG9yO1xuICAgICAgICAgIHZhciBoZWFkID0gc2VsZWN0aW9uc1swXS5oZWFkO1xuICAgICAgICAgIHZhciBuZXdfc2VsZWN0aW9ucyA9IFtdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSBhbmNob3IubGluZTsgaSA8PSBoZWFkLmxpbmU7ICsraSkge1xuICAgICAgICAgICAgbmV3X3NlbGVjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgIGFuY2hvcjoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGksXG4gICAgICAgICAgICAgICAgY2g6IGkgPT0gYW5jaG9yLmxpbmUgPyBhbmNob3IuY2ggOiAwXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBpLFxuICAgICAgICAgICAgICAgIGNoOiBpID09IGhlYWQubGluZSA/IGhlYWQuY2ggOiBJbmZpbml0eVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29kZV9taXJyb3Iuc2V0U2VsZWN0aW9ucyhuZXdfc2VsZWN0aW9ucyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSA9IGNvZGVfbWlycm9yLmNoYW5nZUdlbmVyYXRpb24odHJ1ZSk7XG4gICAgICAgIC8vIHN0YXR1cyBiYXJcbiAgICAgICAgZWRpdG9yLmFwcGVuZChcbiAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWZvb3RcIj4nKS5hcHBlbmQoXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1lc3NhZ2VcIj4nKSxcbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItaW5kZW50XCI+JyksXG4gICAgICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVvbFwiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1lbmNvZGluZ1wiPicpLFxuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tb2RlXCI+JylcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICAgIHZhciB1cGRhdGVNb2RlSW5mbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBtb2RlID0gY29kZV9taXJyb3IuZ2V0TW9kZSgpO1xuICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tb2RlXCIpLnRleHQobW9kZS5uYW1lKTtcbiAgICAgICAgfTtcbiAgICAgICAgdXBkYXRlTW9kZUluZm8oKTtcbiAgICAgICAgdmFyIHVwZGF0ZUluZGVudEluZm8gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgc3R5bGU7XG4gICAgICAgICAgaWYgKGNvZGVfbWlycm9yLmdldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIpKSB7XG4gICAgICAgICAgICBzdHlsZSA9IFwiVEFCXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3R5bGUgPSBjb2RlX21pcnJvci5nZXRPcHRpb24oXCJpbmRlbnRVbml0XCIpICsgXCJTUFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlZGl0b3IuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLnRleHQoc3R5bGUpO1xuICAgICAgICB9O1xuICAgICAgICB1cGRhdGVJbmRlbnRJbmZvKCk7XG4gICAgICAgIC8vIGxpbmUgc2VwcmF0b3JcbiAgICAgICAgdmFyIGVvbCA9IHNlbGYuZGV0ZWN0RW9sKHJlcGx5LmNvbnRlbnQpO1xuICAgICAgICB2YXIgZW9sX25hbWVzID0ge1xuICAgICAgICAgIFwiXFxyXCI6IFwiQ1JcIixcbiAgICAgICAgICBcIlxcblwiOiBcIkxGXCIsXG4gICAgICAgICAgXCJcXHJcXG5cIjogXCJDUkxGXCJcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWVvbFwiKS50ZXh0KGVvbF9uYW1lc1tlb2xdKTtcbiAgICAgICAgLy8gZW5jb2RpbmdcbiAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLWVuY29kaW5nXCIpLnRleHQoZW5jb2RpbmcpO1xuICAgICAgICBcbiAgICAgICAgZWRpdG9yLmRhdGEoXCJwYXRoXCIsIHBhdGgpO1xuICAgICAgICBlZGl0b3IuZGF0YShcImNvZGVfbWlycm9yXCIsIGNvZGVfbWlycm9yKTtcbiAgICAgICAgLy8gc2F2ZVxuICAgICAgICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBnZW5lcmF0aW9uID0gY29kZV9taXJyb3IuY2hhbmdlR2VuZXJhdGlvbih0cnVlKTtcbiAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiBcIi93cml0ZS5waHBcIixcbiAgICAgICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgICBlbmNvZGluZzogZW5jb2RpbmcsXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IGNvZGVfbWlycm9yLmdldFZhbHVlKCkucmVwbGFjZSgvXFxuL2csIGVvbClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgICAgICBpZiAocmVwbHkgPT0gXCJva1wiKSB7XG4gICAgICAgICAgICAgIGNvZGVfbWlycm9yLmxhc3Rfc2F2ZSA9IGdlbmVyYXRpb247XG4gICAgICAgICAgICAgIHZhciBmaWxlX21hbmFnZXIgPSByZXF1aXJlKFwiLi9maWxlLmpzXCIpO1xuICAgICAgICAgICAgICBmaWxlX21hbmFnZXIuc2V0U3RhdHVzKHBhdGgsIFwiY2xlYW5cIik7XG4gICAgICAgICAgICAgIGVkaXRvci5maW5kKFwiLmVkaXRvci1tZXNzYWdlXCIpLnRleHQoXCJTYXZlZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLiBcIiArIHJlcGx5LmVycm9yKTtcbiAgICAgICAgICAgICAgdmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG4gICAgICAgICAgICAgIGZpbGVfbWFuYWdlci5zZXRTdGF0dXMocGF0aCwgXCJlcnJvclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZWRpdG9yLmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChcIlNhdmUgZmFpbGVkLlwiKTtcbiAgICAgICAgICAgIHZhciBmaWxlX21hbmFnZXIgPSByZXF1aXJlKFwiLi9maWxlLmpzXCIpO1xuICAgICAgICAgICAgZmlsZV9tYW5hZ2VyLnNldFN0YXR1cyhwYXRoLCBcImVycm9yXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvLyBhdXRvIHNhdmVcbiAgICAgICAgdmFyIGF1dG9TYXZlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIWNvZGVfbWlycm9yLmlzQ2xlYW4oY29kZV9taXJyb3IubGFzdF9zYXZlKSkge1xuICAgICAgICAgICAgc2F2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgNDAwMCk7XG4gICAgICAgIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgICAgICAgTW91c2V0cmFwKGVkaXRvclswXSkuYmluZChcIm1vZCtzXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pKCk7XG4gICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgIHJlamVjdCgpO1xuICAgIH0pO1xuICB9KTtcbn07XG5FZGl0b3JNYW5hZ2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAkKFwiI2VkaXRvcnMgLmVkaXRvclwiKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICQodGhpcykuZGF0YShcInBhdGhcIikgPT0gcGF0aDtcbiAgfSk7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuYWN0aXZhdGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gICQoXCIjZWRpdG9ycyAuZWRpdG9yLmFjdGl2ZVwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKTtcbiAgdmFyIGZvdW5kID0gdGhpcy5nZXQocGF0aCk7XG4gIGlmIChmb3VuZC5sZW5ndGgpIHtcbiAgICBmb3VuZC5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcbiAgICBmb3VuZC5kYXRhKFwiY29kZV9taXJyb3JcIikuZm9jdXMoKTtcbiAgICBmb3VuZC5kYXRhKFwiY29kZV9taXJyb3JcIikucmVmcmVzaCgpO1xuICB9XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZ2V0QWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAkKFwiI2VkaXRvcnMgLmVkaXRvci5hY3RpdmVcIikuZGF0YShcInBhdGhcIik7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMuZ2V0KHBhdGgpLnJlbW92ZSgpO1xufTtcbkVkaXRvck1hbmFnZXIucHJvdG90eXBlLmNhbGNJbmRlbnRVbml0ID0gZnVuY3Rpb24oY29udGVudCkge1xuICB2YXIgbGluZXMgPSBjb250ZW50LnNwbGl0KC9bXFxyXFxuXSsvKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpbmRlbnQgPSBsaW5lc1tpXS5yZXBsYWNlKC9eKCAqKS4qLywgXCIkMVwiKTtcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gMjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIDQ7XG59O1xuRWRpdG9yTWFuYWdlci5wcm90b3R5cGUuZGV0ZWN0RW9sID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiO1xuICB9XG4gIGlmIChjb250ZW50Lm1hdGNoKFwiXFxyXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXCI7XG4gIH1cbiAgcmV0dXJuIFwiXFxuXCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBFZGl0b3JNYW5hZ2VyKCk7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgZWRpdG9yX21hbmFnZXIgPSByZXF1aXJlKFwiLi9lZGl0b3IuanNcIik7XG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKTtcblxuLy8gRmlsZU1hbmFnZXJcbnZhciBGaWxlTWFuYWdlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gICQoXCIjZmlsZXNcIikub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBzZWxmLm9wZW4oJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJwYXRoXCIpKTtcbiAgfSk7XG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuY2xvc2Uoc2VsZi5nZXRBY3RpdmUoKSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LCAna2V5ZG93bicpO1xuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrclwiXSwgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5yZWxvYWQoc2VsZi5nZXRBY3RpdmUoKSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LCAna2V5ZG93bicpO1xuICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICQuZWFjaChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwib3Blbi1maWxlc1wiKSB8fCBcIltdXCIpLCBmdW5jdGlvbihpLCBwYXRoKSB7XG4gICAgICBzZWxmLm9wZW4ocGF0aCk7XG4gICAgfSk7XG4gIH0sIDEwMCk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gdHJ5IHRvIGFjdGl2YXRlIG9wZW5pbmcgZmlsZXNcbiAgaWYgKHRoaXMuYWN0aXZhdGUocGF0aCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZWRpdG9yX21hbmFnZXIub3BlbihwYXRoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIik7XG4gICAgdmFyIG5hbWUgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIi4qL1wiKSwgXCJcIik7XG4gICAgJChcIjxkaXY+XCIpLmRhdGEoXCJwYXRoXCIsIHBhdGgpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpclwiKS50ZXh0KGRpciksXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICApLmFwcGVuZFRvKFwiI2ZpbGVzXCIpO1xuICAgIHNlbGYuYWN0aXZhdGUocGF0aCk7XG4gICAgc2VsZi5fc2F2ZUZpbGVMaXN0KCk7XG4gIH0pO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAkKFwiI2ZpbGVzIC5maWxlLWl0ZW1cIikuZmlsdGVyKGZ1bmN0aW9uKGlkeCwgaXRlbSkge1xuICAgIHJldHVybiAkKGl0ZW0pLmRhdGEoXCJwYXRoXCIpID09IHBhdGg7XG4gIH0pO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5nZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIikuZGF0YShcInBhdGhcIik7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgZmlsZSA9IHRoaXMuZ2V0KHBhdGgpO1xuICBpZiAoZmlsZS5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAkKFwiI2ZpbGVzIC5maWxlLWl0ZW0uYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICBmaWxlLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xuICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShwYXRoKTtcbiAgdmFyIGZpbmRlciA9IHJlcXVpcmUoXCIuL2ZpbmRlci5qc1wiKTtcbiAgZmluZGVyLnNldFBhdGgocGF0aCk7XG4gIHJldHVybiB0cnVlO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5uZXh0RmlsZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJvdGF0ZUZpbGUodHJ1ZSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLnByZXZGaWxlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucm90YXRlRmlsZShmYWxzZSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLnJvdGF0ZUZpbGUgPSBmdW5jdGlvbihuZXh0KSB7XG4gIHZhciBkaXIgPSBuZXh0ID8gXCJuZXh0XCIgOiBcInByZXZcIjtcbiAgdmFyIHRhcmdldCA9ICQoXCIjZmlsZXMgLmZpbGUtaXRlbS5hY3RpdmVcIilbZGlyXSgpO1xuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PSAwKSB7XG4gICAgZGlyID0gbmV4dCA/IFwiZmlyc3RcIiA6IFwibGFzdFwiO1xuICAgIHRhcmdldCA9ICQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKVtkaXJdKCk7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICB0aGlzLmFjdGl2YXRlKHRhcmdldC5kYXRhKFwicGF0aFwiKSk7XG59O1xuRmlsZU1hbmFnZXIucHJvdG90eXBlLnNldFN0YXR1cyA9IGZ1bmN0aW9uKHBhdGgsIHN0YXR1cykge1xuICB2YXIgZmlsZSA9ICQoXCIjZmlsZXMgLmZpbGUtaXRlbVwiKS5maWx0ZXIoZnVuY3Rpb24oaWR4LCBpdGVtKSB7XG4gICAgcmV0dXJuICQoaXRlbSkuZGF0YShcInBhdGhcIikgPT0gcGF0aDtcbiAgfSk7XG4gIGZpbGUuZmluZChcIi5zdGF0dXNcIikucmVtb3ZlQ2xhc3MoXCJjbGVhbiBlcnJvciBtb2RpZmllZFwiKS5hZGRDbGFzcyhzdGF0dXMpO1xufTtcbkZpbGVNYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHRhcmdldCA9IHRoaXMuZ2V0KHBhdGgpO1xuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0YXJnZXQuaGFzQ2xhc3MoXCJhY3RpdmVcIikpIHtcbiAgICB0aGlzLnByZXZGaWxlKCk7XG4gIH1cbiAgdGFyZ2V0LnJlbW92ZSgpO1xuICBlZGl0b3JfbWFuYWdlci5jbG9zZShwYXRoKTtcbiAgdGhpcy5fc2F2ZUZpbGVMaXN0KCk7XG59O1xuXG5GaWxlTWFuYWdlci5wcm90b3R5cGUucmVsb2FkID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLmNsb3NlKHBhdGgpO1xuICB0aGlzLm9wZW4ocGF0aCk7XG59O1xuXG5GaWxlTWFuYWdlci5wcm90b3R5cGUuX3NhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZmlsZXMgPSAkLm1hcCgkKFwiI2ZpbGVzIC5maWxlLWl0ZW1cIiksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gJChpdGVtKS5kYXRhKFwicGF0aFwiKTtcbiAgfSk7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwib3Blbi1maWxlc1wiLCBKU09OLnN0cmluZ2lmeShmaWxlcykpO1xufTtcbm1vZHVsZS5leHBvcnRzID0gbmV3IEZpbGVNYW5hZ2VyKCk7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xuXG52YXIgRmluZGVyU3VnZ2VzdCA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuZmluZGVyID0gZmluZGVyO1xuICB0aGlzLml0ZW1zID0gJChcIiNmaW5kZXItaXRlbXNcIik7XG4gIFxuICAvLyB3aGVuIGZpbmRlciBpdGVtIHdhcyBzZWxlY3RlZFxuICB0aGlzLml0ZW1zLm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgc2VsZi5maW5kZXIuc3VnZ2VzdFNlbGVjdGVkKCQoZS50YXJnZXQpLmRhdGEoXCJwYXRoXCIpKTtcbiAgfSk7XG4gIC8vIHByZXZlbnQgbG9zdCBmb2N1c1xuICB0aGlzLml0ZW1zLm9uKFwibW91c2Vkb3duXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICB9KTtcbn07XG5cbkZpbmRlclN1Z2dlc3QucHJvdG90eXBlLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuaXRlbXMuaGFzQ2xhc3MoXCJhY3RpdmVcIikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICB2YXIgc2VsZWN0ZWQgPSB0aGlzLml0ZW1zLmZpbmQoXCJhLnNlbGVjdGVkXCIpO1xuICBpZiAoc2VsZWN0ZWQubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gc2VsZWN0ZWQuZGF0YShcInBhdGhcIik7XG59O1xuXG5GaW5kZXJTdWdnZXN0LnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICB1cmw6IFwiL2ZpbmRlci5waHBcIixcbiAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHBhdGg6IHBhdGhcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coXCJmYWlsZWQgdG8gZmV0Y2ggc3VnZ2VzdDogXCIgKyBwYXRoKTtcbiAgICAgIHJlamVjdCgpO1xuICAgIH0pLmRvbmUocmVzb2x2ZSk7XG4gIH0pO1xufTtcblxuRmluZGVyU3VnZ2VzdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBlbXB0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuaXRlbXMucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG4gICAgc2VsZi5pdGVtcy5lbXB0eSgpO1xuICB9O1xuICBzZWxmLmZldGNoKHBhdGgpLnRoZW4oZnVuY3Rpb24oc3VnZ2VzdCkge1xuICAgIGlmIChzdWdnZXN0Lml0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICBlbXB0eSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc3VnZ2VzdC5pdGVtcy5sZW5ndGggPT0gMSAmJiBzdWdnZXN0LmJhc2UgKyBzdWdnZXN0Lml0ZW1zWzBdID09IHBhdGgpIHtcbiAgICAgIGVtcHR5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIGdvdCBzb21lIHN1Z2dlc3Rpb25cbiAgICBzZWxmLml0ZW1zLmVtcHR5KCk7XG4gICAgXy5lYWNoKHN1Z2dlc3QuaXRlbXMsIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICQoXCIjZmluZGVyLWl0ZW1zXCIpLmFwcGVuZChcbiAgICAgICAgJChcIjxhPlwiKS50ZXh0KGl0ZW0pLmRhdGEoe1xuICAgICAgICAgIHBhdGg6IHN1Z2dlc3QuYmFzZSArIGl0ZW0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pO1xuICAgICQoXCIjZmluZGVyLWl0ZW1zXCIpLnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcbiAgfSkuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgZW1wdHkoKTtcbiAgfSk7XG59O1xuXG5GaW5kZXJTdWdnZXN0LnByb3RvdHlwZS5tb3ZlU2VsZWN0ID0gZnVuY3Rpb24oZG93bikge1xuICB2YXIgdGFyZ2V0ID0gdGhpcy5pdGVtcy5maW5kKFwiYS5zZWxlY3RlZFwiKTtcbiAgaWYgKHRhcmdldC5sZW5ndGgpIHtcbiAgICB0YXJnZXQucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKTtcbiAgICB2YXIgdCA9IHRhcmdldFtkb3duID8gXCJuZXh0XCIgOiBcInByZXZcIl0oKTtcbiAgICBpZiAodC5sZW5ndGgpIHtcbiAgICAgIHRhcmdldCA9IHQ7XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIHRhcmdldCA9IHRoaXMuaXRlbXMuZmluZChcImFcIikuZmlyc3QoKTtcbiAgfVxuICBpZiAodGFyZ2V0Lmxlbmd0aCkge1xuICAgIHRhcmdldC5hZGRDbGFzcyhcInNlbGVjdGVkXCIpO1xuICAgIC8vIHNjcm9sbCBpdGVtcyBwYW5lIHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KCk7XG4gICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0O1xuICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHQ7XG4gICAgdmFyIHZpZXdfaGVpZ2h0ID0gdGhpcy5pdGVtcy5pbm5lckhlaWdodCgpO1xuICAgIGlmICh0b3AgLSB0aGlzLml0ZW1zLnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgdGhpcy5pdGVtcy5zY3JvbGxUb3AodG9wKTtcbiAgICB9XG4gICAgaWYgKGJvdHRvbSAtIHRoaXMuaXRlbXMuc2Nyb2xsVG9wKCkgPiB2aWV3X2hlaWdodCkge1xuICAgICAgdGhpcy5pdGVtcy5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0O1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpO1xudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcbnZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpO1xudmFyIGVkaXRvcl9tYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLmpzXCIpO1xudmFyIGZpbGVfbWFuYWdlciA9IHJlcXVpcmUoXCIuL2ZpbGUuanNcIik7XG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LmpzXCIpO1xuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5wYXRoID0gJChcIiNmaW5kZXItcGF0aFwiKS52YWwodGhpcy5fZ2V0TGFzdFBhdGgoKSk7XG4gIHRoaXMucGF0aF93YXRjaGVyID0gbnVsbDtcbiAgdGhpcy5zdWdnZXN0ID0gbmV3IEZpbmRlclN1Z2dlc3QodGhpcyk7XG4gIFxuICAvLyBvcGVuIGZpbGUgd2l0aCBlbnRlciBrZXlcbiAgTW91c2V0cmFwKHRoaXMucGF0aFswXSkuYmluZChcImVudGVyXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gc2VsZi5zdWdnZXN0LmdldFNlbGVjdGlvbigpO1xuICAgIGlmIChwYXRoKSB7XG4gICAgICBzZWxmLnN1Z2dlc3RTZWxlY3RlZChwYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZV9tYW5hZ2VyLm9wZW4oc2VsZi5wYXRoLnZhbCgpKTtcbiAgICAgIHNlbGYuaGlkZSgpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBcbiAgLy8gcGF0aCBjb21wbGV0aW9uIHdpdGggdGFiIGtleVxuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwidGFiXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gc2VsZi5wYXRoLnZhbCgpO1xuICAgIHNlbGYuc3VnZ2VzdC5mZXRjaChwYXRoKS50aGVuKGZ1bmN0aW9uKHN1Z2dlc3QpIHtcbiAgICAgIGlmIChzdWdnZXN0Lml0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChzdWdnZXN0Lml0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIHNlbGYuc2V0UGF0aChzdWdnZXN0LmJhc2UgKyBzdWdnZXN0Lml0ZW1zWzBdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coXCJjb21wbGV0aW9uIGZhaWxlZC5cIik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgLy9cbiAgTW91c2V0cmFwKHRoaXMucGF0aFswXSkuYmluZChcIm1vZCt1XCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXRoID0gc2VsZi5wYXRoLnZhbCgpO1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKTtcbiAgICBzZWxmLnBhdGgudmFsKHBhdGgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuc2hvdygpO1xuICAgIHNlbGYucGF0aC5mb2N1cygpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIFxuICAvLyBoaWRlIG9uIGJsdXJcbiAgc2VsZi5wYXRoLmJsdXIoZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5oaWRlKCk7XG4gIH0pO1xuICBcbiAgLy8gc2VsZWN0IGl0ZW0gd2l0aCB1cC9kb3duIGtleVxuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwiZG93blwiLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLnN1Z2dlc3QubW92ZVNlbGVjdCh0cnVlKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBNb3VzZXRyYXAodGhpcy5wYXRoWzBdKS5iaW5kKFwidXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5zdWdnZXN0Lm1vdmVTZWxlY3QoZmFsc2UpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIFxuICAvLyBxdWl0IGZpbmRlciB3aXRoIGVzYyBrZXlcbiAgTW91c2V0cmFwKHRoaXMucGF0aFswXSkuYmluZChcImVzY1wiLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLmhpZGUoKTtcbiAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShlZGl0b3JfbWFuYWdlci5nZXRBY3RpdmUoKSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn07XG5cbkZpbmRlci5wcm90b3R5cGUuc3VnZ2VzdFNlbGVjdGVkID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLnNldFBhdGgocGF0aCk7XG4gIGlmIChwYXRoLnN1YnN0cigtMSkgIT0gXCIvXCIpIHtcbiAgICBmaWxlX21hbmFnZXIub3BlbihwYXRoKTtcbiAgfVxufTtcblxuRmluZGVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgJChcIiNmaW5kZXJcIikuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gIFxuICAvLyBzdGFydCBzdWdnZXN0XG4gIHZhciBwYXRoQ2hhbmdlZCA9IF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5zdWdnZXN0LnVwZGF0ZShzZWxmLnBhdGgudmFsKCkpO1xuICB9LCAzMDApO1xuICBjbGVhckludGVydmFsKHNlbGYucGF0aF93YXRjaGVyKTtcbiAgc2VsZi5wYXRoX3dhdGNoZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICB2YXIgY3VycmVudCA9IHNlbGYucGF0aC52YWwoKTtcbiAgICBpZiAoY3VycmVudCAhPSBzZWxmLl9nZXRMYXN0UGF0aCgpKSB7XG4gICAgICBzZWxmLl9zZXRMYXN0UGF0aChjdXJyZW50KTtcbiAgICAgIHBhdGhDaGFuZ2VkKCk7XG4gICAgfVxuICB9LCA1MCk7XG59O1xuXG5GaW5kZXIucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbihpdGVtKSB7XG4gICQoXCIjZmluZGVyXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xufTtcblxuRmluZGVyLnByb3RvdHlwZS5zZXRQYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLnBhdGgudmFsKHBhdGgpO1xuICB0aGlzLl9zZXRMYXN0UGF0aChwYXRoKTtcbiAgdGhpcy5zdWdnZXN0LnVwZGF0ZShwYXRoKTtcbn07XG5cbkZpbmRlci5wcm90b3R5cGUuX2dldExhc3RQYXRoID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImZpbmRlci1wYXRoXCIpIHx8IFwiL1wiO1xufTtcblxuRmluZGVyLnByb3RvdHlwZS5fc2V0TGFzdFBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiZmluZGVyLXBhdGhcIiwgcGF0aCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBGaW5kZXIoKTtcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIik7XG5cbkNvZGVNaXJyb3IuZGVmaW5lU2ltcGxlTW9kZShcInRleHRcIiwge1xuICBzdGFydDogW10sXG4gIGNvbW1lbnQ6IFtdLFxuICBtZXRhOiB7fVxufSk7XG4iLCJtb2R1bGUuZXhwb3J0cy5ydW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIik7XG4gIHZhciBmaWxlX21hbmFnZXIgPSByZXF1aXJlKFwiLi9maWxlLmpzXCIpO1xuICB2YXIgZmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyLmpzXCIpO1xuICBcbiAgLy8gc2hvcnRjdXQga2V5c1xuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrO1wiLCBcIm1vZCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaWxlX21hbmFnZXIubmV4dEZpbGUoKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sICdrZXlkb3duJyk7XG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtzaGlmdCs7XCIsIFwibW9kK3NoaWZ0Kz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbGVfbWFuYWdlci5wcmV2RmlsZSgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSwgJ2tleWRvd24nKTtcbn07XG4iXX0=
