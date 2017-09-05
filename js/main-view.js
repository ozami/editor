var $ = require("jquery")
var EditorManagerView = require("./editor-manager-view")

var MainView = function(editor_mgr) {
  var $main = $("main")
  var editor_mgr_view = EditorManagerView($main, editor_mgr)
  
  // shortcut keys
  Mousetrap.bind(["mod+", "mod+="], function() {
    editor_mgr.nextFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+shift+", "mod+shift+="], function() {
    editor_mgr.prevFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+w", "mod+k"], function() {
    editor_mgr.close(editor_mgr.getActive())
    return false
  }, "keydown")
  Mousetrap.bind(["mod+r"], function() {
    editor_mgr.reload(editor_mgr.getActive())
    return false
  }, "keydown")
}

module.exports = MainView
