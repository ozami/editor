const React = require("react")
const FinderSuggestItem = require("./finder-suggest-item.jsx")

class FinderSuggest extends React.Component {
  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }
  
  handleChange() {
    this.forceUpdate()
  }
  
  componentDidMount() {
    this.props.suggest.items_changed.add(this.handleChange)
    this.props.suggest.cursor_moved.add(this.handleChange)
  }
  
  componentWillUnmount() {
    this.props.suggest.items_changed.remove(this.handleChange)
    this.props.suggest.cursor_moved.remove(this.handleChange)
  }
  
  componentDidUpdate() {
    if (this.props.suggest.cursor) {
      this.scrollIntoView(
        this.list,
        this.list.getElementsByClassName("selected")[0]
      )
    }
  }
  
  scrollIntoView(parent, target) {
    let top = 0
    for (let node = target.previousSibling; node; node = node.previousSibling) {
      top += node.offsetHeight
    }
    if (top < parent.scrollTop) {
      parent.scrollTop = top
    }
    const bottom = top + target.offsetHeight - parent.clientHeight
    if (bottom > parent.scrollTop) {
      parent.scrollTop = bottom
    }
  }
  
  render() {
    const suggest = this.props.suggest
    const self = this
    if (suggest.items.length == 0) {
      return null
    }
    return (
      <div
        id="finder-items"
        ref={list => self.list = list}>
        {suggest.items.map(item => (
          <FinderSuggestItem
            key={item}
            base={suggest.base}
            item={item}
            active={suggest.cursor == suggest.base + item}
            onSelect={suggest.select} />
        ))}
      </div>
    )
  }
}

module.exports = FinderSuggest
