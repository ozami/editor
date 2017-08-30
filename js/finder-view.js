var $ = require("jquery")
var Mousetrap = require("mousetrap")
var False = require("./return-false.js")
var InputWatcher = require("./input-watcher.js")

var FinderView = function(model, suggest) {
  var path_input = $("#finder-path").val("/")
  
  var path_watcher = InputWatcher(path_input, 50)
  path_watcher.changed.add(model.setPath)
  
  var view = {
    show: function() {
      $("#finder").addClass("active")
      path_input.focus()
      path_watcher.start()
    },
    
    hide: function() {
      $("#finder").removeClass("active")
      path_watcher.stop()
    },
  }
  
  // hide on blur
  path_input.blur(model.hide())
  
  model.visibility_changed.add(function(visible) {
    if (visible) {
      view.show()
    }
    else {
      view.hide()
    }
  })
  
  model.path_changed.add(function(path) {
    path_input.val(path)
  })
  
  Mousetrap(path_input[0]).bind("enter", False(model.enter))
  Mousetrap(path_input[0]).bind("tab", False(model.tab))
  Mousetrap(path_input[0]).bind("esc", False(model.hide))
  Mousetrap(path_input[0]).bind("down", False(function() {
    suggest.moveCursor(true)
  }))
  Mousetrap(path_input[0]).bind("up", False(function() {
    suggest.moveCursor(false)
  }))
  Mousetrap(path_input[0]).bind("mod+u", False(
    model.goToParentDirectory
  ))
  
  return view
}

module.exports = FinderView
