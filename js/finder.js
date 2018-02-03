var Signal = require("signals").Signal
var FinderSuggest = require("./finder-suggest")

var Finder = function() {
  var model = {
    selected: new Signal(),
    path_changed: new Signal(),
    visibility_changed: new Signal(),
    
    path: "/",
    visible: false,
    tab_pending: false,
    
    select: function(path) {
      model.setPath(path)
      if (path.substr(-1) == "/") {
        return
      }
      model.hide()
      model.selected.dispatch(path)
    },
    
    show: function() {
      model.visible = true
      model.visibility_changed.dispatch(model.visible)
    },
    
    hide: function() {
      model.visible = false
      model.visibility_changed.dispatch(model.visible)
//       editor_manager.activate(editor_manager.getActive())
    },
    
    getPath: function() {
      return model.path
    },
    
    setPath: function(path) {
      model.tab_pending = false
      model.path = path
      model.path_changed.dispatch(path)
    },
    
    goToParentDirectory: function() {
      model.setPath(
        model.path.replace(new RegExp("[^/]*/?$"), "")
      )
    },
    
    goToProjectDirectory: function() {
      const path = model.path.replace(new RegExp("[^/]*$"), "") + "^/"
      const body = new URLSearchParams()
      body.set("path", path)
      fetch("/finder.php", {
        method: "POST",
        body,
      })
      .then(response => response.json())
      .then(response => {
        model.setPath(response.base)
      })
      .catch(() => {
        console.log("failed to fetch project directory: " + path)
      })
    },
    
    enter: function() {
      var path = suggest.getCursor()
      model.select(path ? path : model.path)
    },
    
    tab: function() {
      var cursor = suggest.getCursor()
      if (cursor) {
        model.setPath(cursor)
        return
      }
      var items = suggest.getItems()
      if (items.length == 1) {
        model.setPath(items[0])
        return
      }
      suggest.update(model.path)
      model.tab_pending = true
    },
  }
  
  var suggest = model.suggest = FinderSuggest(model)
  suggest.selected.add(function(path) {
    model.select(path)
  })
  
  suggest.items_changed.add(function() {
    if (model.tab_pending) {
      model.tab_pending = false
      model.tab()
    }
  })
  
  return model
}

module.exports = Finder
