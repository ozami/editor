const React = require("react")
const ReactDOM = require("react-dom")
const Finder = require("./finder.jsx")

var FinderView = function($root, finder) {
  const render = () => {
    ReactDOM.render(
      (<Finder finder={finder} />),
      $root[0]
    )
  }
  render()
}

module.exports = FinderView
