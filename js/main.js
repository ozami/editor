var EditorManager = require("./editor-manager")
var MainView = require("./main-view")

module.exports.run = function() {
  var Mousetrap = require("mousetrap")
  var finder = require("./finder.js")()
  var editor_mgr = EditorManager(finder)
  var view = MainView(editor_mgr)
  
  var saveFileList = function() {
    var files = editor_mgr.getFiles()
    localStorage.setItem("open-files", JSON.stringify(files))
  }
  var loadFileList = function() {
    return JSON.parse(localStorage.getItem("open-files") || "[]")
  }
  loadFileList().forEach(function(path) {
    editor_mgr.open(path)
  })
  
  editor_mgr.opened.add(saveFileList)
  editor_mgr.closed.add(saveFileList)
  
  // show finder
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    finder.show()
    return false
  }, "keydown")
}
