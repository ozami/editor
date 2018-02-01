var CodeMirror = require("codemirror")

CodeMirror.commands.joinLines = function(cm) {
  var cursor = cm.getCursor()
  var line = cm.getLine(cursor.line)
  var next_line = cm.getLine(cursor.line + 1)
  if (next_line === undefined) {
    return
  }
  var start = line.replace(/(.*?)\s*$/, "$1").length
  var end = next_line.replace(/^(\s*).*/, "$1").length
  var glue = (start && end != next_line.length) ? " " : ""
  cm.replaceRange(
    glue,
    {line: cursor.line, ch: start},
    {line: cursor.line + 1, ch: end}
  )
  cm.setCursor({line: cursor.line, ch: start})
}
