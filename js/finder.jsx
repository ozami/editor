const React = require("react")
const Mousetrap = require("mousetrap")
const False = require("./return-false")
const FinderSuggest = require("./finder-suggest.jsx")

class Finder extends React.Component {
  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }
  
  handleChange() {
    this.forceUpdate()
  }
  
  componentDidMount() {
    const finder = this.props.finder
    const input = this.input
    finder.path_changed.add(this.handleChange)
    finder.visibility_changed.add(this.handleChange)
    const bindings = this.bindings = new Mousetrap(input)
    bindings.bind("enter", False(finder.enter))
    bindings.bind("tab", False(finder.tab))
    bindings.bind("esc", False(finder.hide))
    bindings.bind("down", False(function() {
      finder.suggest.moveCursor(true)
    }))
    bindings.bind("up", False(function() {
      finder.suggest.moveCursor(false)
    }))
    bindings.bind("mod+u", False(
      finder.goToParentDirectory
    ))
  }
  
  componentWillUnmount() {
    this.props.finder.visibility_changed.remove(this.handleChange)
    this.props.finder.path_changed.remove(this.handleChange)
  }
  
  componentDidUpdate() {
    const input = this.input
    if (this.props.finder.visible && document.activeElement != input) {
      input.focus()
      input.setSelectionRange(9999, 9999)
    }
  }
  
  render() {
    const self = this
    const finder = this.props.finder
    
    const onChange = (e) => {
      finder.setPath(e.target.value)
    }
    const formStyles = {
      display: finder.visible ? "" : "none",
    }
    return (
      <form id="finder" style={formStyles}>
        <input
          ref={input => self.input = input}
          type="text"
          id="finder-path"
          className="mousetrap"
          autoComplete="off"
          value={finder.path}
          onChange={onChange}
          onBlur={finder.hide} />
        <FinderSuggest
          suggest={finder.suggest} />
      </form>
    )
  }
}

module.exports = Finder
