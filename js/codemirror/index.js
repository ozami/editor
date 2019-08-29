var CodeMirror = require("codemirror")
var foreach = require("lodash.foreach")
require("codemirror-addon")
require("./mark")
require("./join-lines")
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
  foldOptions: {
    minFoldSize: 5,
  },
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  // Use solely anyword-hint
  hintOptions: {hint: CodeMirror.hint.anyword},
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
  }
  foreach(keymap, function(command, key) {
    Mousetrap(input).bind(key, function() {
      cm.execCommand(command)
      return false
    })
  })
})

module.exports = CodeMirror
