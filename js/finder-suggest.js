var $ = require("jquery")
var _ = require("underscore")
var Signal = require("signals").Signal

var FinderSuggest = function(finder) {
  var model = {
    items: [],
    cursor: null, // highlighted item
    
    items_changed: new Signal(),
    cursor_moved: new Signal(),
    selected: new Signal(),
    
    update: function(path) {
      $.ajax({
        method: "post",
        url: "/finder.php",
        timeout: 3000,
        data: {
          path: path,
        },
        dataType: "json",
      }).fail(function() {
        console.log("failed to fetch suggest for the path: " + path)
      }).done(function(reply) {
        model.setItems(reply.items.map(function(i) {
          return reply.base + i
        }))
      })
    },
    
    setItems: function(items) {
      model.setCursor(null)
      model.items = items
      model.items_changed.dispatch(model.items)
    },
    
    getItems: function() {
      return model.items
    },
    
    getCursor: function() {
      return model.cursor
    },
    
    setCursor: function(path) {
      if (path === model.cursor) {
        return
      }
      model.cursor = path
      model.cursor_moved.dispatch(model.cursor)
    },
    
    moveCursor: function(next) {
      if (model.cursor === null) {
        if (model.items.length != 0) {
          model.setCursor(model.items[0])
        }
        return
      }
      var idx = model.items.indexOf(model.cursor)
      idx += next ? +1 : -1
      idx = Math.max(0, Math.min(model.items.length - 1, idx))
      model.setCursor(model.items[idx])
    },
    
    select: function(path) {
      model.setCursor(path)
      model.selected.dispatch(path)
    },
  }
  
  finder.visibility_changed.add(function(visible) {
    if (visible) {
      model.update(finder.getPath())
    }
  })
  
  finder.path_changed.add(_.debounce(model.update, 250))
  
  // view
  var list = $("#finder-items")
  model.items_changed.add(function(items) {
    list.removeClass("active").empty()
    if (items.length == 0) {
      return
    }
    if (items.length == 1 && items[0] == model.getCursor()) {
      return
    }
    var name_rx = new RegExp("/([^/]*/?)$")
    list.append(items.map(function(item) {
      var name = name_rx.exec(item)[1]
      return $("<a>").text(name).data("path", item)
    }))
    list.scrollTop(0).addClass("active")
  })
  
  model.cursor_moved.add(function(path) {
    list.find("a.selected").removeClass("selected")
    if (path === null) {
      return
    }
    var a = list.find("a").filter(function() {
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
      var view_height = list.innerHeight()
      if (top - list.scrollTop() < 0) {
        list.scrollTop(top)
      }
      if (bottom - list.scrollTop() > view_height) {
        list.scrollTop(bottom - view_height)
      }
    }
    scrollIntoView(a)
  })
  
  // when item was selected
  list.on("click", "a", function(e) {
    e.preventDefault()
    model.select($(e.target).data("path"))
  })
  // prevent from loosing focus
  list.on("mousedown", "a", function(e) {
    e.preventDefault()
  })
  
  return model
}

module.exports = FinderSuggest
