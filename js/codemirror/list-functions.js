var CodeMirror = require("codemirror")

function listFunctions(cm) {
  const last_line = cm.lastLine()
  const index = []
  for (let line = cm.firstLine(); line <= last_line; ++line) {
    const text = cm.getLine(line)
    let found = text.match(/function\s+(\w+)\(/)
    if (!found) {
      continue
    }
    index.push({
      line,
      name: found[1],
    })
  }
  console.log(index)
}
CodeMirror.commands.listFunctions = listFunctions
