const Signal = require("signals").Signal
const Observable = require("./observable")

const SelectModeDialog = () => {
  const dialog = {
    visible: Observable(false),
    mode: Observable(),
    options: [
      "coffeescript",
      "css",
      "diff",
      "go",
      "htmlmixed",
      "javascript",
      "jsx",
      "markdown",
      "php",
      "python",
      "ruby",
      "rust",
      "sass",
      "shell",
      "toml",
      "text",
      "sql",
      "xml",
      "yaml",
    ],
    confirmed: new Signal(),
    
    confirm: function() {
      dialog.visible.set(false)
      dialog.confirmed.dispatch(dialog.mode.get())
    },
    
    show: function(mode) {
      dialog.mode.set(mode)
      dialog.visible.set(true)
    },
    
    hide: function() {
      dialog.visible.set(false)
    },
  }
  return dialog
}

module.exports = SelectModeDialog
