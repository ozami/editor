var $ = require("jquery")
var Signal = require("signals").Signal
var Observable = require("./observable")

var SelectEncodingDialog = function() {
  
  var dialog = {
    visible: Observable(false),
    encoding: Observable(),
    options: [
      "UTF-8",
      "EUC-JP",
      "SJIS-WIN",
    ],
    confirmed: new Signal(),
    
    confirm: function() {
      dialog.visible.set(false)
      dialog.confirmed.dispatch(dialog.encoding.get())
    },
    
    show: function(encoding) {
      dialog.encoding.set(encoding)
      dialog.visible.set(true)
    },
    
    hide: function() {
      dialog.visible.set(false)
    },
  }
  return dialog
}

module.exports = SelectEncodingDialog
