var MainView = require("./main-view")

module.exports.run = function() {
  var Mousetrap = require("mousetrap")
  var finder = require("./finder.js")()
  var file_manager = require("./file.js")(finder)
  var view = MainView(file_manager)
  
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
    file_manager.reload(file_manager.getActive())
    return false
  }, "keydown")
  // show finder
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    finder.show()
    return false
  }, "keydown")
}
