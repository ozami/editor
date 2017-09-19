const React = require("react")
const Portal = require("react-portal-minimal")
const CodeMirror = require("./codemirror")
const SelectEncodingDialog = require("./select-encoding-dialog.jsx")

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
    
    const cm = this.cm = CodeMirror(this.cm_el, {
      value: editor.text.get(),
      mode: editor.mode.get(),
    })
    
    // save
    let last_generation = cm.changeGeneration(true)
    const save = () => {
      const generation = cm.changeGeneration(true)
      editor.save().then(function() {
        last_generation = generation
      })
    }
    cm.on("changes", () => {
      editor.text.set(cm.getValue())
      editor.status.set(
        cm.isClean(last_generation) ? "clean" : "modified"
      )
    })
    editor.text.observe((text) => {
      if (text != cm.getValue()) {
        cm.setValue(text)
      }
    })
    
    // message
    editor.message.observe(this.handleChange)
    
    // mode
    editor.mode.observe((mode) => {
      cm.setOption("mode", mode)
      CodeMirror.registerHelper("hintWords", mode, null)
      this.handleChange()
    })
    
    // indent
    editor.indent.observe((type) => {
      if (type == "TAB") {
        cm.setOption("indentWithTabs", true)
        cm.setOption("indentUnit", 4)
      }
      else {
        cm.setOption("indentWithTabs", false)
        cm.setOption("indentUnit", Number(type.replace("SP", "")))
      }
      this.handleChange()
    })
    
    // line seprator
    file.eol.observe(this.handleChange)
    
    // encoding
    file.encoding.add(this.handleChange)
    editor.select_encoding_dialog.confirmed.add(file.encoding.set)
    editor.select_encoding_dialog.visible.observe(this.handleChange)
    editor.select_encoding_dialog.encoding.observe(this.handleChange)
    
    // save with command-s
    Mousetrap(this.cm_el).bind("mod+s", () => {
      save()
      return false
    })
  }
  
  componentDidUpdate(prevs) {
    if (this.props.isActive && !prevs.isActive) {
      this.cm.focus()
      this.cm.refresh()
    }
  }
  
  render() {
    const self = this
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
        <div ref={(cm_el) => self.cm_el = cm_el}></div>
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
          <div className="editor-mode">
            {model.mode.get()}
          </div>
        </div>
        <Portal>
          <SelectEncodingDialog
            model={model.select_encoding_dialog}
            isOpen={model.select_encoding_dialog.visible.get()} />
        </Portal>
      </div>
    )
  }
}

module.exports = Editor
