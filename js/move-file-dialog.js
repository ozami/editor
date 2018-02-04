const Signal = require("signals").Signal
const Observable = require("./observable")

const MoveFileDialog = () => {
  const dialog = {
    visible: Observable(false),
    path: Observable(),
    confirmed: new Signal(),
    
    confirm: function() {
      dialog.visible.set(false)
      dialog.confirmed.dispatch(dialog.path.get())
    },
    
    show: function(path) {
      dialog.path.set(path)
      dialog.visible.set(true)
    },
    
    hide: function() {
      dialog.visible.set(false)
    },
  }
  return dialog
}

module.exports = MoveFileDialog
