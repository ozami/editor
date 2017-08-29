var $ = require("jquery")
var _ = require("underscore")
var Signal = require("signals").Signal
var Mousetrap = require("mousetrap")
var editor_manager = require("./editor.js")
var FinderSuggest = require("./finder-suggest.js")

var Finder = function() {
  var model = {
    selected: new Signal(),
    path_changed: new Signal(),
    visibility_changed: new Signal(),
    
    path: "",
    visible: false,
    
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
    },
    
    getPath: function() {
      return model.path
    },
    
    setPath: function(path) {
      model.path = path
      model.path_changed.dispatch(path)
    },
    
    goToParentDirectory: function() {
      model.setPath(
        model.path.replace(new RegExp("[^/]*/?$"), "")
      )
    },
  }
  
  var suggest = FinderSuggest(model)
  suggest.selected.add(function(path) {
    model.select(path)
  })
  
  // View
  
  var path_input = $("#finder-path")
  
  model.visibility_changed.add(function(visible) {
    if (visible) {
      $("#finder").addClass("active")
    }
    else {
      $("#finder").removeClass("active")
    }
  })
  
  var last_path = path_input.val()
  var pathChanged = _.debounce(function() {
    model.setPath(path_input.val())
  }, 300)
  var path_watcher = setInterval(function() {
    var current = path_input.val()
    if (current != last_path) {
      last_path = current
      pathChanged()
    }
  }, 50)
  
  model.path_changed.add(function(path) {
    path_input.val(path)
  })
  
  // open file with enter key
  Mousetrap(path_input[0]).bind("enter", function() {
    var path = suggest.getCursor()
    model.select(path ? path : path_input.val())
    return false
  })
  
  // path completion with tab key
  Mousetrap(path_input[0]).bind("tab", function() {
    var cursor = suggest.getCursor()
    if (cursor) {
      model.setPath(cursor)
      return false
    }
    var items = suggest.getItems()
    if (items.length == 1) {
      model.setPath(items[0])
      return false
    }
    suggest.update(path_input.val())
    return false
  })
  
  // quit finder with esc key
  Mousetrap(path_input[0]).bind("esc", function() {
    model.hide()
    editor_manager.activate(editor_manager.getActive())
    return false
  })
  
  // select item with up/down key
  Mousetrap(path_input[0]).bind("down", function() {
    suggest.moveCursor(true)
    return false
  })
  Mousetrap(path_input[0]).bind("up", function() {
    suggest.moveCursor(false)
    return false
  })
  
  //
  Mousetrap(path_input[0]).bind("mod+u", function() {
    model.goToParentDirectory()
    return false
  })
  
  // focus on shown
  model.visibility_changed.add(function(visible) {
    if (visible) {
      path_input.focus()
    }
  })
  
  // hide on blur
  path_input.blur(function() {
    model.hide()
  })
  
  return model
}

module.exports = Finder
