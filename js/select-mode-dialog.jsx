const React = require("react")
const createDialog = require("./dialog.jsx")

class SelectModeDialog extends React.Component {
  constructor(props) {
    super(props)
    this.handleModeChange = this.handleModeChange.bind(this)
  }
  
  handleModeChange(e) {
    this.props.model.mode.set(e.target.value)
  }
  
  render() {
    const model = this.props.model
    return (
      <div>
        <select
          size="10"
          autoFocus
          value={model.mode.get()}
          onChange={this.handleModeChange}>
          {model.options.map(mode => 
            <option key={mode}>{mode}</option>
          )}
        </select>
        <button onClick={model.confirm}>OK</button>
        <button onClick={model.hide}>Cancel</button>
      </div>
    )
  }
}

module.exports = createDialog(SelectModeDialog, "select-mode-dialog")
