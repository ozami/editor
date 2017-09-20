const React = require("react")
const ReactDOM = require("react-dom")
const Portal = require("react-portal-minimal")
const SelectEncodingDialog = require("./select-encoding-dialog.jsx")

var SelectEncodingDialogView = function($root, model) {
  let isOpen = false
  const render = () => {
    ReactDOM.render(
      <Portal>
        <SelectEncodingDialog
          model={model}
          isOpen={isOpen} />
      </Portal>,
      $root[0]
    )
  }
  model.visible.observe(function(visible) {
    isOpen = visible
    render()
  })
  model.encoding.observe(render)
}

module.exports = SelectEncodingDialogView
