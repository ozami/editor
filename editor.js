// EditorManager
var EditorManager = function() {
};
EditorManager.prototype.open = function(path) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      method: "post",
      url: "/read.php",
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
      var mode = CodeMirror.findModeByExtension(path.replace(/.*[.](.+)$/, "$1"));
      CodeMirror.requireMode(mode.mode, function() {
        var code_mirror = CodeMirror(editor[0], {
          value: reply.content,
          lineNumbers: true,
          tabSize: 2,
          indentUnit: 2,
          showCursorWhenSelecting: true,
          autoCloseBrackets: true,
          matchBrackets: true,
          matchTags: true,
          autoCloseTags: true,
          mode: mode.mime,
        });
        $(code_mirror.getInputField()).addClass("mousetrap"); // enable hotkey
        editor.data("path", path);
        editor.data("code_mirror", code_mirror);
        
        // save
        Mousetrap(editor[0]).bind("ctrl+s", function() {
          $.ajax({
            url: "/write.php",
            method: "post",
            data: {
              path: path,
              content: code_mirror.getValue()
            },
            dataType: "json"
          }).done(function() {
          }).fail(function() {
          });
          return false;
        });

        resolve();
      });
    }).fail(function() {
      reject();
    });
  });
};
EditorManager.prototype.activate = function(path) {
  $("#editors .editor.active").removeClass("active");
  var found = $("#editors .editor").filter(function() {
    return $(this).data("path") == path;
  });
  found.addClass("active");
  found.data("code_mirror").focus();
  found.data("code_mirror").refresh();
};
var editor_manager = new EditorManager();
