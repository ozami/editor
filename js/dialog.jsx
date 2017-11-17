const React = require("react")
const ReactDOM = require("react-dom")

const modal_root = document.getElementById("modals")

const createDialog = (Component, class_name) => {
  return class Dialog extends React.Component {
    constructor(props) {
      super(props)
      this.el = document.createElement("div")
    }
    
    componentDidMount() {
      modal_root.appendChild(this.el)
    }
    
    componentWillUnmount() {
      modal_root.removeChild(this.el)
    }
    
    render() {
      if (this.props.isOpen) {
        return ReactDOM.createPortal(
          <div className="dialog-backdrop">
            <div className={"dialog " + class_name}>
              <Component {...this.props} />
            </div>
          </div>,
          this.el
        )
      }
      return null
    }
  }
}

module.exports = createDialog
