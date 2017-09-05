var $ = require("jquery")

var FinderSuggestView = function($root, model) {
  var $list = $root
  
  var view = {
    updateItems: function(items) {
      $list.removeClass("active").empty()
      if (items.length == 0) {
        return
      }
      if (items.length == 1 && items[0] == model.getCursor()) {
        return
      }
      var name_rx = new RegExp("/([^/]*/?)$")
      $list.append(items.map(function(item) {
        var name = name_rx.exec(item)[1]
        return $("<a>").text(name).data("path", item)
      }))
      $list.scrollTop(0).addClass("active")
    },
    
    updateCursor: function(path) {
      $list.find("a.selected").removeClass("selected")
      if (path === null) {
        return
      }
      var a = $list.find("a").filter(function() {
        return $(this).data("path") == path
      })
      if (a.length == 0) {
        return
      }
      a.addClass("selected")

      // scroll the list to make the selected item visible
      var scrollIntoView = function(target) {
        var height = target.height()
        var top = target.prevAll().length * height
        var bottom = top + height
        var view_height = $list.innerHeight()
        if (top - $list.scrollTop() < 0) {
          $list.scrollTop(top)
        }
        if (bottom - $list.scrollTop() > view_height) {
          $list.scrollTop(bottom - view_height)
        }
      }
      scrollIntoView(a)
    }
  }
  
  model.items_changed.add(view.updateItems)
  model.cursor_moved.add(view.updateCursor)
  
  // when item was selected
  $list.on("click", "a", function(e) {
    e.preventDefault()
    model.select($(e.target).data("path"))
  })
  
  // prevent from loosing focus
  $list.on("mousedown", "a", function(e) {
    e.preventDefault()
  })
  
  return view
}

module.exports = FinderSuggestView
