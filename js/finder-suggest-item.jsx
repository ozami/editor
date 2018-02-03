const React = require("react")

const FinderSuggestItem = function(props) {
  const onClick = (e) => {
    e.preventDefault()
    props.onSelect(props.base + props.item)
  }
  const onMouseDown = (e) => {
    // prevent from getting focused
    e.preventDefault()
  }
  return (
    <a
      className={props.active ? "selected" : ""}
      onClick={onClick}
      onMouseDown={onMouseDown}>
      {props.item}
    </a>
  )
}

module.exports = FinderSuggestItem
