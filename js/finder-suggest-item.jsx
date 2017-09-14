const React = require("react")

const name_rx = new RegExp("/([^/]*/?)$")

const FinderSuggestItem = function(props) {
  const name = name_rx.exec(props.path)[1]
  const onClick = (e) => {
    e.preventDefault()
    props.onSelect(props.path)
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
      {name}
    </a>
  )
}

module.exports = FinderSuggestItem
