var CodeMirror = require("codemirror")
var _ = require("underscore")
require("codemirror-addon")
require("./mark")
require("./select-line")
require("./select-word")
require("./split-into-lines")
require("./text-mode")

Object.assign(CodeMirror.defaults, {
  lineNumbers: true,
  tabSize: 4,
  showCursorWhenSelecting: true,
  autoCloseBrackets: true,
  matchBrackets: true,
  matchTags: true,
  autoCloseTags: true,
  styleActiveLine: {nonEmpty: true},
  styleSelectedText: true,
  dragDrop: false,
  extraKeys: {
    "Ctrl-Space": "autocomplete",
    "Ctrl-U": "autocomplete",
    "Ctrl-/": "toggleComment",
    "Cmd-/": "toggleComment",
    "Tab": "indentAuto",
    "Ctrl-D": false,
    "Cmd-D": false,
  },
})

CodeMirror.defineInitHook(function(cm) {
  var input = cm.getInputField()
  input.className += " mousetrap" // enable hotkey
  // key bindings
  var keymap = {
    "alt+b": "goWordLeft",
    "alt+f": "goWordRight",
    "alt+h": "delWordBefore",
    "alt+d": "delWordAfter",
    "mod+m": "mark",
    "mod+d": "selectWord",
    "mod+l": "selectLine",
    "mod+shift+l": "splitIntoLines",
  }
  _.each(keymap, function(command, key) {
    Mousetrap(input).bind(key, function() {
      cm.execCommand(command)
      return false
    })
  })
})

module.exports = CodeMirror
