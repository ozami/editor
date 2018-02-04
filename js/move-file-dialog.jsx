const React = require("react")
const createDialog = require("./dialog.jsx")

class MoveFileDialog extends React.Component {
  constructor(props) {
    super(props)
    this.handlePathChange = this.handlePathChange.bind(this)
  }
  
  handlePathChange(e) {
    this.props.model.path.set(e.target.value)
  }
  
  render() {
    const model = this.props.model
    return (
      <div>
        <div style={{marginBottom: "1rem"}}>
          <input type="text"
            size="60"
            autoFocus
            value={model.path.get()}
            onChange={this.handlePathChange} />
        </div>
        <button onClick={model.confirm}>OK</button>
        <button onClick={model.hide}>Cancel</button>
      </div>
    )
  }
}

module.exports = createDialog(MoveFileDialog, "move-file-dialog")
