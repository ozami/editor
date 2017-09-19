const React = require("react")
const ReactDOM = require("react-dom")
const Editor = require("./editor.jsx")
const FileTabList = require("./file-tab-list.jsx")

var EditorManagerView = function($root, editor_mgr) {
  const render = function() {
    ReactDOM.render(
      <div>
        <div id="files">
          <FileTabList editorMgr={editor_mgr} />
        </div>
        <div id="editors">
          {editor_mgr.editors.map((model) => 
            <Editor
    　　　　　　　key={model.getPath()}
    　　　　　　　isActive={editor_mgr.active == model.getPath()}
    　　　　　　　model={model} />
          )}
        </div>
      </div>,
      $root[0]
    )
  }
  
  editor_mgr.opened.add(render)
  editor_mgr.closed.add(render)
  editor_mgr.activated.add(render)
}

module.exports = EditorManagerView
