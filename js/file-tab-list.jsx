const React = require("react")
const FileTab = require("./file-tab.jsx")

const FileTabList = (props) => {
  const mgr = props.editorMgr
  const onClick = (path) => {
    mgr.activate(path)
  }
  const items = mgr.editors.map((editor) => (
    <FileTab
      key={editor.getFile().path.get()}
      editor={editor}
      active={mgr.active == editor.getFile().path.get()}
      onClick={onClick}
      />
  ))
  return (
    <div id="files">{items}</div>
  )
}

module.exports = FileTabList
