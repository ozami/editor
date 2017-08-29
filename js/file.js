var signals = require("signals")
var _ = require("underscore")
var FileManagerView = require("./file-view.js")
var editor_manager = require("./editor.js")

var FileManager = function(finder) {
  var model = {
    opened: new signals.Signal(),
    closed: new signals.Signal(),
    activated: new signals.Signal(),
    status_changed: new signals.Signal(),
    
    active: null, // path of active file
    files: [],
    
    getFiles: function() {
      return _.pluck(model.files, "path")
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
        model.files.push({
          path: path,
          status: "clean",
        })
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
      if (path !== null && model.indexOf(path) == -1) {
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
        idx = model.indexOf(model.active)
        idx += next ? +1 : -1
        idx = (idx + model.files.length) % model.files.length
      }
      model.activate(model.files[idx].path)
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
      editor_manager.close(path)
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
    
    updateStatus: function(path, status) {
      model.indexOf(path).status = status
      model.status_changed.dispatch(path, status)
    },
  }
  
  finder.selected.add(model.open)
  editor_manager.status_changed.add(model.updateStatus)
  
  var view = FileManagerView(model)
  
  return model
}

module.exports = FileManager
