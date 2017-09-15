const React = require("react")

const createDialog = (Component, class_name) => {
  return class Dialog extends React.Component {
    render() {
      if (this.props.isOpen) {
        return (
          <div className="dialog-backdrop">
            <div className={"dialog " + class_name}>
              <Component {...this.props} />
            </div>
          </div>
        )
      }
      return null
    }
  }
}

module.exports = createDialog
