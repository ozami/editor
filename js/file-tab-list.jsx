const React = require("react")
const FileTab = require("./file-tab.jsx")

const FileTabList = (props) => {
  const mgr = props.editorMgr
  const onClick = (path) => {
    mgr.activate(path)
  }
  const items = mgr.editors.map((editor) => {
    return (
      <FileTab
        key={editor.getPath()}
        editor={editor}
        active={mgr.active == editor.getPath()}
        onClick={onClick}
        />
    )
  })
  return (
    <div id="files">{items}</div>
  )
}

module.exports = FileTabList
