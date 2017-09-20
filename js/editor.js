var debounce = require("lodash.debounce")
var Observable = require("./observable")
var CodeMirror = require("./codemirror")
var Indent = require("./indent")
var SelectEncodingDialog = require("./select-encoding-dialog")
const SelectModeDialog = require("./select-mode-dialog")

var Editor = function(file) {
  var editor = {
    text: Observable(""),
    status: Observable("clean"),
    mode: Observable("text"),
    indent: Indent(),
    message: Observable(""),
    select_encoding_dialog: SelectEncodingDialog(),
    select_mode_dialog: SelectModeDialog(),
    
    getFile: function() {
      return file
    },
    
    getPath: function() {
      return file.getPath()
    },
    
    load: function(text) {
      return file.read()
      .then(function(text) {
        editor.indent.set(Indent.detectIndentType(text))
        editor.text.set(text)
        editor.message.set("Loaded.")
      })
    },
    
    save: function() {
      return file.write(editor.text.get())
      .then(() => {
        editor.status.set("clean")
        editor.message.set("Saved.")
      })
      .catch(error => {
        editor.message.set("Failed to save. " + error)
        editor.status.set("error")
      })
    },
  }
  
  var detectMode = (function(path) {
    var extension = path.replace(/.*[.](.+)$/, "$1")
    var mode = {
      html: "php",
      tag: "php",
    }[extension]
    if (mode) {
      return mode
    }
    mode = CodeMirror.findModeByExtension(extension)
    if (mode) {
      return mode.mode
    }
    return "text"
  })
  editor.mode.set(detectMode(file.getPath()))
  
  // auto save
  editor.text.observe(debounce(function() {
    if (editor.status.get() != "clean") {
      editor.save()
    }
  }, 4000))
  
  return editor
}

module.exports = Editor
