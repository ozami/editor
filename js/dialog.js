var $ = require("jquery")

var open = function(content) {
  var close = function() {
    backdrop.remove()
  }
  return close
}

var view = function(content, class_name) {
  var backdrop = $('<div class="backdrop">').appendTo(document.body)
  var dialog = $('<div class="dialog">').appendTo(backdrop)
  dialog.addClass(class_name)
  dialog.append(content)
  return backdrop
}

module.exports.view = view
