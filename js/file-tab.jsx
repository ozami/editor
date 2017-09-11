const React = require("react")

const FileTab = (props) => {
  const path = props.editor.getPath()
  const dir = path.replace(new RegExp("[^/]+$"), "")
  const name = path.replace(new RegExp(".*/"), "")
  const onClick = (e) => {
    e.preventDefault()
    props.onClick(path)
  }
  return (
    <div
      className={"file-item " + (props.active ? "active" : "")}
      onClick={onClick}>
      <div className="dir">{dir}</div>
      <div className="name">{name}</div>
      <div className={"status " + props.editor.status.get()}></div>
    </div>
  )
}

module.exports = FileTab
