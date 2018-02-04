const React = require("react")
const CodeMirror = require("./codemirror.jsx")
const SelectEncodingDialog = require("./select-encoding-dialog.jsx")
const SelectModeDialog = require("./select-mode-dialog.jsx")
const MoveFileDialog = require("./move-file-dialog.jsx")

class Editor extends React.Component {
  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }
  
  handleChange() {
    this.forceUpdate()
  }
  
  componentDidMount() {
    const editor = this.props.model
    const file = editor.getFile()
    
    // message
    editor.message.observe(this.handleChange)
    // mode
    editor.mode.observe(this.handleChange)
    editor.select_mode_dialog.confirmed.add(editor.mode.set)
    editor.select_mode_dialog.visible.observe(this.handleChange)
    editor.select_mode_dialog.mode.observe(this.handleChange)
    // indent
    editor.indent.observe(this.handleChange)
    // line seprator
    file.eol.observe(this.handleChange)
    // encoding
    file.encoding.add(this.handleChange)
    editor.select_encoding_dialog.confirmed.add(file.encoding.set)
    editor.select_encoding_dialog.visible.observe(this.handleChange)
    editor.select_encoding_dialog.encoding.observe(this.handleChange)
    // file move
    editor.move_file_dialog.confirmed.add(editor.move)
    editor.move_file_dialog.visible.observe(this.handleChange)
    editor.move_file_dialog.path.observe(this.handleChange)
  }
  
  render() {
    const model = this.props.model
    const file = model.getFile()
    const eol_names = {
      "\r": "CR",
      "\n": "LF",
      "\r\n": "CRLF",
    }
    return (
      <div
        className={"editor " + (this.props.isActive ? "active" : "")}>
        <CodeMirror editor={model} isActive={this.props.isActive} />
        <div className="editor-foot">
          <div className="editor-message">{model.message.get()}</div>
          <button className="editor-indent link" type="button" onClick={model.indent.rotate}>
            {model.indent.get()}
          </button>
          <button className="editor-eol link" type="button" onClick={file.eol.rotate}>
            {eol_names[file.eol.get()]}
          </button>
          <button className="editor-encoding link" type="button"
            onClick={() => model.select_encoding_dialog.show(file.encoding.get())}>
            {file.encoding.get()}
          </button>
          <button className="editor-mode link" type="button"
            onClick={() => model.select_mode_dialog.show(model.mode.get())}>
            {model.mode.get().toUpperCase()}
          </button>
        </div>
        <SelectEncodingDialog
          model={model.select_encoding_dialog}
          isOpen={model.select_encoding_dialog.visible.get()} />
        <SelectModeDialog
          model={model.select_mode_dialog}
          isOpen={model.select_mode_dialog.visible.get()} />
        <MoveFileDialog
          model={model.move_file_dialog}
          isOpen={model.move_file_dialog.visible.get()} />
      </div>
    )
  }
}

module.exports = Editor
