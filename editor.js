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
      var editor = $("<div>").addClass("editor").appendTo("#editors");
      var mode = CodeMirror.findModeByExtension(path.replace(/.*[.](.+)$/, "$1")) || {
        mode: "text",
        mime: "text/plain"
      };
      // calc indent size
      var indentWithTabs = false;
      var indentUnit = 4;
      if (reply.content.match(/[\r\n]+\t/)) {
        indentWithTabs = true;
      } else {
        indentUnit = self.calcIndentUnit(reply.content);
      }
      CodeMirror.requireMode(mode.mode, function() {
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
          mode: mode.mime,
        });
        code_mirror.setOption("extraKeys", {
          "Ctrl-Space": "autocomplete",
          "Ctrl-/": "toggleComment",
          Tab: function(cm) {
            var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
            cm.replaceSelection(spaces);
          }
        });
        code_mirror.on("changes", function() {
          file_manager.setStatus(
            path,
            code_mirror.isClean(code_mirror.last_save) ? "clean": "modified"
          );
        });
        $(code_mirror.getInputField()).addClass("mousetrap"); // enable hotkey
        code_mirror.last_save = code_mirror.changeGeneration(true);
        // status bar
        editor.append(
          $('<div class="editor-foot">').append(
            $('<div class="editor-message">'),
            $('<div class="editor-indent">')
          )
        );
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
              content: code_mirror.getValue()
            },
            dataType: "json"
          }).done(function() {
            code_mirror.last_save = generation;
            file_manager.setStatus(path, "clean");
            editor.find(".editor-message").text("Saved.");
          }).fail(function() {
            editor.find(".editor-message").text("Save failed.");
            file_manager.setStatus(path, "error");
          });
        };
        // auto save
        setInterval(function() {
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
      });
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
}
var editor_manager = new EditorManager();
