const React = require("react")
const ReactDOM = require("react-dom")
var $ = require("jquery")
var _ = require("underscore")
var EditorView = require("./editor-view")
const FileTabList = require("./file-tab-list.jsx")

var EditorManagerView = function($root, editor_mgr) {
  var $tabs = $("<div>").attr("id", "files").appendTo($root)
  var $editors = $("<div>").attr("id", "editors").appendTo($root)
  
  const render = function() {
    ReactDOM.render(
      (
        <FileTabList
          editorMgr={editor_mgr}
          />
      ),
      $tabs[0]
    )
  }
  
  editor_mgr.opened.add(function(editor) {
    const path = editor.getPath()
    render()
    editor.status.observe(() => {
      render()
    })
    // editor view
    var $editor = $("<div>").addClass("editor").appendTo($editors)
    var editor_view = EditorView($editor, editor, editor_mgr)
    
    editors[path] = {
      $editor: $editor,
    }
  })
  
  editor_mgr.closed.add(function(path) {
    render()
    editors[path].$editor.remove()
    delete editors[path]
  })
  
  editor_mgr.activated.add(render)
}

module.exports = EditorManagerView
