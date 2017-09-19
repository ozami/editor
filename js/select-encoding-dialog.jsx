const React = require("react")
const createDialog = require("./dialog.jsx")

class SelectEncodingDialog extends React.Component {
  constructor(props) {
    super(props)
    this.handleEncodingChange = this.handleEncodingChange.bind(this)
  }
  
  handleEncodingChange(e) {
    this.props.model.encoding.set(e.target.value)
  }
  
  render() {
    const model = this.props.model
    return (
      <div>
        <select
          size="4"
          autoFocus
          value={model.encoding.get()}
          onChange={this.handleEncodingChange}>
          {model.options.map(encoding => 
            <option key={encoding}>{encoding}</option>
          )}
        </select>
        <button className="ok" onClick={model.confirm}>OK</button>
        <button className="cancel" onClick={model.hide}>Cancel</button>
      </div>
    )
  }
}

module.exports = createDialog(SelectEncodingDialog, "select-encoding-dialog")
