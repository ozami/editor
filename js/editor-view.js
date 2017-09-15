const React = require("react")
const ReactDOM = require("react-dom")
var $ = require("jquery")
var CodeMirror = require("./codemirror")
var SelectEncodingDialogView = require("./select-encoding-dialog-view")

var EditorView = function($root, editor, editor_mgr) {
  var file = editor.getFile()
  
  var cm = CodeMirror($root[0], {
    value: editor.text.get(),
    mode: editor.mode.get(),
  })
  
  const $footer = $('<div>').appendTo($root)
  const render = () => {
    const eol_names = {
      "\r": "CR",
      "\n": "LF",
      "\r\n": "CRLF",
    }
    ReactDOM.render(
      <div className="editor-foot">
        <div className="editor-message">{editor.message.get()}</div>
        <button className="editor-indent link" type="button" onClick={editor.indent.rotate}>
          {editor.indent.get()}
        </button>
        <button className="editor-eol link" type="button" onClick={file.eol.rotate}>
          {eol_names[file.eol.get()]}
        </button>
        <button className="editor-encoding link" type="button"
           onClick={() => editor.select_encoding_dialog.show(file.encoding.get())}>
          {file.encoding.get()}
        </button>
        <div className="editor-mode">
          {editor.mode.get()}
        </div>
      </div>,
      $footer[0]
    )
  }
  render()
  SelectEncodingDialogView(
    $('<div>').appendTo($root),
    editor.select_encoding_dialog
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
  editor.mode.observe((mode) => {
    cm.setOption("mode", mode)
    CodeMirror.registerHelper("hintWords", mode, null)
    render()
  })
  
  // indent
  editor.indent.observe((type) => {
    if (type == "TAB") {
      cm.setOption("indentWithTabs", true)
      cm.setOption("indentUnit", 4)
    }
    else {
      cm.setOption("indentWithTabs", false)
      cm.setOption("indentUnit", Number(type.replace("SP", "")))
    }
    render()
  })
  
  // line seprator
  file.eol.observe(render)
  
  // encoding
  file.encoding.add(render)
  editor.select_encoding_dialog.confirmed.add(file.encoding.set)
  
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
