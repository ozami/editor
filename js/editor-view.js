var $ = require("jquery")
var CodeMirror = require("./codemirror")

var EditorView = function($root, editor, editor_mgr) {
  var file = editor.getFile()
  
  var cm = CodeMirror($root[0], {
    value: editor.text.get(),
    mode: editor.mode.get(),
  })
  
  // footer
  $root.append(
    $('<div class="editor-foot">').append(
      $('<div class="editor-message">'),
      $('<button class="editor-indent link" type="button">'),
      $('<div class="editor-eol">'),
      $('<div class="editor-encoding">'),
      $('<div class="editor-mode">')
    )
  )
  
  // save
  var last_generation = cm.changeGeneration(true)
  var save = function() {
    var generation = cm.changeGeneration(true)
    editor.save().then(function() {
      last_generation = generation
    })
  }
  cm.on("changes", function() {
    editor.text.set(cm.getValue())
    editor.status.set(
      cm.isClean(last_generation) ? "clean" : "modified"
    )
  })
  editor.text.observe(function(text) {
    if (text != cm.getValue()) {
      cm.setValue(text)
    }
  })

  // mode
  var updateMode = function(mode) {
    cm.setOption("mode", mode)
    CodeMirror.registerHelper("hintWords", mode, null)
    $root.find(".editor-mode").text(mode)
  }
  editor.mode.observe(updateMode)
  updateMode(editor.mode.get())
  
  // indent
  var updateIndent = function(type) {
    $root.find(".editor-indent").text(type)
    if (type == "TAB") {
      cm.setOption("indentWithTabs", true)
      cm.setOption("indentUnit", 4)
    }
    else {
      cm.setOption("indentWithTabs", false)
      cm.setOption("indentUnit", Number(type.replace("SP", "")))
    }
  }
  editor.indent.observe(updateIndent)
  updateIndent(editor.indent.get())
  $root.find(".editor-indent").click(function() {
    editor.indent.rotate()
  })
  
  // line seprator
  var updateEol = function(eol) {
    var names = {
      "\r": "CR",
      "\n": "LF",
      "\r\n": "CRLF",
    }
    $root.find(".editor-eol").text(names[eol])
  }
  file.eol.add(updateEol)
  updateEol(file.eol.get())
  
  // encoding
  var updateEncoding = function(encoding) {
    $root.find(".editor-encoding").text(encoding)
  }
  file.encoding.add(updateEncoding)
  updateEncoding(file.encoding.get())
  
  // message
  editor.message.observe(function(message) {
    $root.find(".editor-message").text(message)
  })
  
  // active
  editor_mgr.activated.add(function(active) {
    if (active == file.getPath()) {
      $root.addClass("active")
      cm.focus()
      cm.refresh()
    }
    else {
      $root.removeClass("active")
    }
  })
  
  // save with command-s
  Mousetrap($root[0]).bind("mod+s", function() {
    save()
    return false
  })
}

module.exports = EditorView
