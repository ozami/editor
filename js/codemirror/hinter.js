const CodeMirror = require("codemirror")

const keywords = [
  ["function", "function() {}", "function() {}"],
  ["foreach", "foreach() {}", "foreach() {}"],
  ["for", "for () {}", "for () {}"],
  ["class", "class {}", "class {}"],
  ["if", "if () {}", "if () {}"],
  ["else", "else {}", "else {}"],
  "break",
  "continue",
  "throw new",
  "var",
  "let",
  "const",
  ["-php", "<?php ?>", "<?php  ?>"],
  ["-print", "<?php p() ?>", "<?php p() ?>"],
  ["-div", "<div>", "<div></div>"],
  ["-p", "<p>", "<p></p>"],
  ["-span", "<span>", "<span></span>"],
  ["-a", "<a>", '<a href=""></a>'],
  ["-h1", "<h1>", '<h1></h1>'],
  ["-h2", "<h2>", '<h2></h2>'],
  ["-h3", "<h3>", '<h3></h3>'],
  ["-h4", "<h4>", '<h4></h4>'],
  ["-h5", "<h5>", '<h5></h5>'],
  ["-ul", "<ul>", '<ul></ul>'],
  ["-li", "<li>", '<li></li>'],
  ["-label", "<label>", '<label></label>'],
  ["-form", "<form>", '<form></form>'],
  ["-button", "<button>", '<button></button>'],
  "compact()",
  "return",
  "namespace",
  "implements",
  "use",
  "this",
  "public",
  "private",
  "protected",
  "static",
  "__construct",
  'id=""',
  'class=""',
  'style=""',
  'block',
  'inline-block',
  'justify-content',
  'align-items',
  'transparent',
  'rgba', 'rgba()', 'rgba(0, 0, 0, 0)',
  'hsl', 'hsl()', 'hsl(0, 0, 0)',
]

function completeWithKeywords(search_word) {
  let hints = keywords.filter(function(keyword) {
    keyword = Array.isArray(keyword) ? keyword[0] : keyword
    return keyword.startsWith(search_word)
  })
  hints = hints.map(function(keyword) {
    if (Array.isArray(keyword)) {
      return {
        displayText: keyword[1],
        text: keyword[2],
      }
    }
    return keyword
  })
  return hints
}

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
  founds = completeWithKeywords(search_word).concat(founds)
  founds = [...new Set(founds)]
  let current_word = current_line.substr(cursor.ch)
  current_word = current_word.replace(/([-_A-Za-z0-9]*)(.*)/, "$1")
  current_word = search_word + current_word
  founds = founds.filter(function(found_word) {
    return found_word != current_word
  })
  return {
    list: founds,
    from: CodeMirror.Pos(cursor.line, cursor.ch - search_word.length),
    to: cursor,
  }
}
