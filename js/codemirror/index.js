var CodeMirror = require("codemirror")
var foreach = require("lodash.foreach")
require("codemirror-addon")
require("./mark")
require("./join-lines")
require("./select-line")
require("./select-word")
require("./split-into-lines")
require("./line-wrapping")
require("./text-mode")
var hinter = require("./hinter")

Object.assign(CodeMirror.defaults, {
  lineNumbers: true,
  tabSize: 4,
  showCursorWhenSelecting: true,
  autoCloseBrackets: true,
  matchBrackets: true,
  matchTags: true,
  autoCloseTags: {
    whenClosing: true,
    whenOpening: false,
  },
  styleActiveLine: {nonEmpty: true},
  styleSelectedText: true,
  dragDrop: false,
  foldOptions: {
    minFoldSize: 5,
  },
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  hintOptions: {hint: hinter},
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
  // maintain indentation on paste
  cm.on("beforeChange", require("./indent-after-paste"))
  
  // key bindings
  var input = cm.getInputField()
  input.className += " mousetrap" // enable hotkey
  var keymap = {
    "alt+b": "goWordLeft",
    "alt+f": "goWordRight",
    "alt+h": "delWordBefore",
    "alt+d": "delWordAfter",
    "mod+j": "joinLines",
    "mod+m": "mark",
    "mod+d": "selectWord",
    "mod+l": "selectLine",
    "mod+shift+l": "splitIntoLines",
    "mod+shift+e": "toggleFold",
    "mod+alt+e": "foldAll",
    "mod+shift+j": "toggleLineWrapping",
  }
  foreach(keymap, function(command, key) {
    Mousetrap(input).bind(key, function() {
      cm.execCommand(command)
      return false
    })
  })
})

module.exports = CodeMirror
