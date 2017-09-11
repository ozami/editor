var CodeMirror = require("codemirror")

CodeMirror.defineInitHook(function(cm) {
  cm.marks = []
})

CodeMirror.commands.mark = function(cm) {
  var cursor = cm.getCursor()
  if (cm.marks.length) {
    var last = cm.marks[cm.marks.length - 1]
    if (last.line == cursor.line && last.ch == cursor.ch) {
      cm.setSelections(cm.marks.map(function(m) {
        return {head: m, anchor: m}
      }), cm.marks.length - 1)
      cm.marks = []
      return
    }
  }
  cm.marks.push(cursor)
}
