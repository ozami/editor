var $ = require("jquery")
var Dialog = require("./dialog")

var SelectEncodingDialogView = function(model) {
  var $content = $('<div>').append(
    $('<select size="4">'),
    $('<button class="ok">OK</button>'),
    $('<button class="cancel">Cancel</button>')
  )
  
  var $dialog = Dialog.view($content, "select-encoding-dialog")

  var $select = $content.find("select")
  $select.append(model.options.map(function(encoding) {
    return $('<option>').text(encoding)
  }))
  model.encoding.observe(function(encoding) {
    $select.val(encoding)
  })
  $select.val(model.encoding.get())
  $select.click(function() {
    model.encoding.set($select.val())
  })
  
  // ok
  $content.find("button.ok").click(model.confirm)
  
  // cancel
  $content.find("button.cancel").click(model.hide)
  
  model.visible.observe(function(visible) {
    if (visible) {
      $dialog.addClass("visible")
      $content.find("input, select").focus()
    }
    else {
      $dialog.removeClass("visible")
    }
  })
}

module.exports = SelectEncodingDialogView
