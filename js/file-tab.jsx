const React = require("react")

class FileTab extends React.Component {
  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }
  
  componentDidMount() {
    this.props.editor.status.observe(this.handleChange)
  }
  
  componentWillUnmount() {
    this.props.editor.status.remove(this.handleChange)
  }
  
  handleChange() {
    this.forceUpdate()
  }
  
  handleClick(e) {
    e.preventDefault()
    this.props.onClick(this.props.editor.getPath())
  }
  
  render() {
    const props = this.props
    const path = props.editor.getPath()
    const dir = path.replace(new RegExp("[^/]+$"), "")
    const name = path.replace(new RegExp(".*/"), "")
    return (
      <div
        className={"file-item " + (props.active ? "active" : "")}
        onClick={this.handleClick}>
        <div className="dir">{dir}</div>
        <div className="name">{name}</div>
        <div className={"status " + props.editor.status.get()}></div>
      </div>
    )
  }
}

module.exports = FileTab
