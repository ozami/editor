var CodeMirror = require("codemirror")

CodeMirror.commands.toggleLineWrapping = function(cm) {
  cm.setOption("lineWrapping", !cm.getOption("lineWrapping"))
}
