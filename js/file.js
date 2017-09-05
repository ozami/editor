var signals = require("signals")
var _ = require("underscore")
var File = require("./file2")
var Editor = require("./editor")

var FileManager = function(finder) {
  var model = {
    opened: new signals.Signal(),
    closed: new signals.Signal(),
    activated: new signals.Signal(),
    
    active: null, // path of active file
    files: [],
    
    getFiles: function() {
      return model.files.map(function(editor) {
        return editor.getPath()
      })
    },
    
    open: function(path) {
      if (path === null) {
        throw "The path is null"
      }
      // try to activate already opened files
      if (model.activate(path)) {
        return
      }
      var editor = Editor(File(path))
      editor.load().then(function() {
        model.files.push(editor)
        model.opened.dispatch(editor)
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
      if (path !== null && model.indexOf(path) == -1) {
        return false
      }
      model.active = path
      model.activated.dispatch(path)
      finder.setPath(path)
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
        idx = model.indexOf(model.active)
        idx += next ? +1 : -1
        idx = (idx + model.files.length) % model.files.length
      }
      model.activate(model.files[idx].getPath())
    },
    
    close: function(path) {
      var idx = model.indexOf(path)
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
      model.files.splice(idx, 1)
      model.closed.dispatch(path)
    },
    
    reload: function(path) {
      model.close(path)
      model.open(path)
    },
    
    indexOf: function(path) {
      return model.getFiles().indexOf(path)
    },
  }
  
  finder.selected.add(model.open)
  
  return model
}

module.exports = FileManager
