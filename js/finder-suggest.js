var debounce = require("lodash.debounce")
var Signal = require("signals").Signal

var FinderSuggest = function(finder) {
  var model = {
    base: null,
    items: [],
    cursor: null, // highlighted item
    
    items_changed: new Signal(),
    cursor_moved: new Signal(),
    selected: new Signal(),
    
    update: function(path) {
      const body = new FormData()
      body.append("path", path)
      fetch("/finder.php", {
        method: "POST",
        body,
      })
      .then(response => response.json())
      .then(response => {
        model.setItems(response.base, response.items)
      })
      .catch((err) => {
        console.log(err)
        console.log("failed to fetch suggest for the path: " + path)
      })
    },
    
    setItems: function(base, items) {
      if (base == model.base && items.join("\n") == model.items.join("\n")) {
        return
      }
      model.setCursor(null)
      model.base = base
      model.items = items
      model.items_changed.dispatch(model.items, model.base)
    },
    
    getBase: function() {
      return model.base
    },
    
    getItems: function() {
      return model.items.map(x => model.base + x)
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
    
    getCursorIndex: function() {
      return model.items.findIndex(function(item) {
        return model.base + item == model.cursor
      })
    },
    
    moveCursor: function(next) {
      if (model.cursor === null) {
        if (model.items.length != 0) {
          model.setCursor(model.base + model.items[0])
        }
        return
      }
      var idx = model.getCursorIndex()
      idx += next ? +1 : -1
      idx = Math.max(0, Math.min(model.items.length - 1, idx))
      model.setCursor(model.base + model.items[idx])
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
  
  finder.path_changed.add(debounce(model.update, 250))
  
  return model
}

module.exports = FinderSuggest
