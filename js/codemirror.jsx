const React = require("react")
const CM = require("./codemirror")

class CodeMirror extends React.Component {
  handleIndentChange() {
    const type = this.props.editor.indent.get()
    if (type == "TAB") {
      this.cm.setOption("indentWithTabs", true)
      this.cm.setOption("indentUnit", 4)
    }
    else {
      this.cm.setOption("indentWithTabs", false)
      this.cm.setOption("indentUnit", Number(type.replace("SP", "")))
    }
  }
  
  componentDidMount() {
    const editor = this.props.editor
    
    const cm = this.cm = CM(this.el, {
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
    editor.text.observe(text => {
      if (text != cm.getValue()) {
        cm.setValue(text)
      }
    })
    
    // mode
    editor.mode.observe(mode => {
      cm.setOption("mode", mode)
    })
    
    // indent
    editor.indent.observe(() => this.handleIndentChange())
    this.handleIndentChange()
    
    // save with command-s
    Mousetrap(this.el).bind("mod+s", () => {
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
    return (
      <div ref={(el) => self.el = el}></div>
    )
  }
}

module.exports = CodeMirror
