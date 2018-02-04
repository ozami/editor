const React = require("react")
const ReactDOM = require("react-dom")
const Editor = require("./editor.jsx")
const FileTabList = require("./file-tab-list.jsx")
const Finder = require("./finder.jsx")

const MainView = function(editor_mgr, finder) {
  const main = document.getElementsByTagName("main")[0]
  const render = () => {
    ReactDOM.render(
      <div>
        <div id="files">
          <FileTabList editorMgr={editor_mgr} />
        </div>
        <div id="editors">
          {editor_mgr.editors.map((model) => 
            <Editor
    　　　　　　　key={model.getFile().path.get()}
    　　　　　　　isActive={editor_mgr.active == model.getFile().path.get()}
    　　　　　　　model={model} />
          )}
        </div>
        <Finder finder={finder} />
      </div>,
      main
    )
  }
  render()

  editor_mgr.opened.add(render)
  editor_mgr.closed.add(render)
  editor_mgr.activated.add(render)
    
  // shortcut keys
  Mousetrap.bind(["mod+;", "mod+="], function() {
    editor_mgr.nextFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+shift+;", "mod+shift+="], function() {
    editor_mgr.prevFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+w", "mod+k"], function() {
    editor_mgr.close(editor_mgr.getActive())
    return false
  }, "keydown")
  Mousetrap.bind(["mod+r"], function() {
    editor_mgr.reload(editor_mgr.getActive())
    return false
  }, "keydown")
}

module.exports = MainView
