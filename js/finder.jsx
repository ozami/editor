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
    finder.visibility_changed.add(this.handleChange)
    finder.path_changed.add(this.handleChange)
    finder.visibility_changed.add((visibility) => {
      if (input) {
        input.focus()
      }
    })

    Mousetrap(input).bind("enter", False(finder.enter))
    Mousetrap(input).bind("tab", False(finder.tab))
    Mousetrap(input).bind("esc", False(finder.hide))
    Mousetrap(input).bind("down", False(function() {
      finder.suggest.moveCursor(true)
    }))
    Mousetrap(input).bind("up", False(function() {
      finder.suggest.moveCursor(false)
    }))
    Mousetrap(input).bind("mod+u", False(
      finder.goToParentDirectory
    ))
  }
  
  componentWillUnmount() {
    this.props.finder.visibility_changed.remove(this.handleChange)
    this.props.finder.path_changed.remove(this.handleChange)
  }
  
  render() {
    const self = this
    const finder = this.props.finder
    
    const onChange = (e) => {
      finder.setPath(e.target.value)
    }
    
    return (
      <form id="finder" className={finder.visible ? "active" : ""}>
        <input
          ref={(input) => self.input = input}
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