var $ = require("jquery")

var open = function(content, class_name) {
  var backdrop = $("<div>").addClass("backdrop")
  var dialog = $("<div>").addClass("dialog")
  if (class_name) {
    dialog.addClass(class_name)
  }
  dialog.append(content)
  backdrop.append(dialog)
  $(document.body).append(backdrop)
  var close = function() {
    backdrop.remove()
  }
  return close
}

module.exports.open = open
