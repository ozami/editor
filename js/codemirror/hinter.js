module.exports = function(editor, options) {
  const cursor = editor.getCursor()
  let current_line = editor.getLine(cursor.line)
  let search_word = current_line
  search_word = search_word.substr(0, cursor.ch)
  search_word = search_word.replace(/.*?([-_A-Za-z0-9]*)$/, "$1")
  if (search_word == "") {
    return {
      list: [],
      from: cursor,
      to: cursor,
    }
  }
  let founds = []
  function searchInLine(line_handle) {
    let words = line_handle.text.split(/[^-_A-Za-z0-9]+/)
    words = words.filter(function(word) {
      if (word.length <= search_word.length) {
        return false
      }
      if (word.substr(0, search_word.length) != search_word) {
        return false
      }
      return true
    })
    founds.push(...words)
  }
  editor.eachLine(0, cursor.line, searchInLine)
  founds.reverse()
  editor.eachLine(cursor.line, editor.lastLine(), searchInLine)
  founds = [...new Set(founds)]
  let current_word = current_line.substr(cursor.ch)
  current_word = current_word.replace(/([-_A-Za-z0-9]*)(.*)/, "$1")
  current_word = search_word + current_word
  founds = founds.filter(function(found_word) {
    return found_word != current_word
  })
  return {
    list: founds,
    from: cursor,
    to: cursor,
  }
}
