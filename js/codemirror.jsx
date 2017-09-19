const React = require("react")
const CM = require("./codemirror")

class CodeMirror extends React.Component {
  constructor(props) {
    super(props)
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
      CM.registerHelper("hintWords", mode, null)
    })
    
    // indent
    editor.indent.observe(type => {
      if (type == "TAB") {
        cm.setOption("indentWithTabs", true)
        cm.setOption("indentUnit", 4)
      }
      else {
        cm.setOption("indentWithTabs", false)
        cm.setOption("indentUnit", Number(type.replace("SP", "")))
      }
    })
    
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
