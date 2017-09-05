var $ = require("jquery")
var Mousetrap = require("mousetrap")
var False = require("./return-false")
var InputWatcher = require("./input-watcher")
var FinderSuggestView = require("./finder-suggest-view")

var FinderView = function($root, finder) {
  var $path_input = $(
    '<input type="text" id="finder-path" class="mousetrap" autocomplete="off" value="/">'
  ).appendTo($root)
  
  var path_watcher = InputWatcher($path_input, 50)
  path_watcher.changed.add(finder.setPath)
  
  var view = {
    show: function() {
      $root.addClass("active")
      $path_input.focus()
      path_watcher.start()
    },
    
    hide: function() {
      $root.removeClass("active")
      path_watcher.stop()
    },
  }
  
  // hide on blur
  $path_input.blur(finder.hide())
  
  finder.visibility_changed.add(function(visible) {
    if (visible) {
      view.show()
    }
    else {
      view.hide()
    }
  })
  
  finder.path_changed.add(function(path) {
    $path_input.val(path)
  })
  
  Mousetrap($path_input[0]).bind("enter", False(finder.enter))
  Mousetrap($path_input[0]).bind("tab", False(finder.tab))
  Mousetrap($path_input[0]).bind("esc", False(finder.hide))
  Mousetrap($path_input[0]).bind("down", False(function() {
    finder.suggest.moveCursor(true)
  }))
  Mousetrap($path_input[0]).bind("up", False(function() {
    finder.suggest.moveCursor(false)
  }))
  Mousetrap($path_input[0]).bind("mod+u", False(
    finder.goToParentDirectory
  ))
  
  // suggest view
  var $items = $('<div id="finder-items">').appendTo($root)
  FinderSuggestView($items, finder.suggest)
  
  return view
}

module.exports = FinderView
