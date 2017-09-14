const React = require("react")
const $ = require("jquery")
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
        this.$list,
        this.$list.find(".selected")
      )
    }
  }
  
  scrollIntoView($parent, $target) {
    var height = $target.height()
    var top = $target.prevAll().length * height
    var bottom = top + height
    var view_height = $parent.innerHeight()
    if (top - $parent.scrollTop() < 0) {
      $parent.scrollTop(top)
    }
    if (bottom - $parent.scrollTop() > view_height) {
      $parent.scrollTop(bottom - view_height)
    }
  }
  
  render() {
    const suggest = this.props.suggest
    const self = this
    return (
      <div
        id="finder-items"
        ref={(list) => self.$list = $(list)}
        className={suggest.items.length ? "active" : ""}>
        {suggest.items.map((path) => (
            <FinderSuggestItem
            key={path}
            path={path}
            active={suggest.cursor === path}
            onSelect={suggest.select} />
        ))}
      </div>
    )
  }
}

module.exports = FinderSuggest
