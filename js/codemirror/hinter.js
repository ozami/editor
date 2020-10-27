const CodeMirror = require("codemirror")

function makeApplyHintFunction(move_line, move_ch) {
  return function(code_mirror, self, data) {
    code_mirror.replaceRange(data.text, self.from, self.to)
    for (let x = 1; x < data.text.split("\n").length; ++x) {
      code_mirror.indentLine(self.to.line + x)
    }
    code_mirror.setCursor(self.from.line + move_line, self.from.ch + move_ch)
  }
}

const keywords = [
  // keyword, display text, insert text, hint function
  ["function", "function {}", "function() {\n\n}", makeApplyHintFunction(0, 9)],
  ["foreach", "foreach {}", "foreach () {\n\n}", makeApplyHintFunction(0, 9)],
  ["for", "for {}", "for () {\n\n}", makeApplyHintFunction(0, 5)],
  ["class", "class {}", "class  {\n\n}", makeApplyHintFunction(0, 6)],
  ["if", "if {}", "if () {\n\n}", makeApplyHintFunction(0, 4)],
  ["else", "else {}", "else {\n\n}", makeApplyHintFunction(0, 6)],
  "break",
  "continue",
  "throw new",
  "var",
  "let",
  "const",
  ["<div", "<div>", "<div>\n\n</div>", makeApplyHintFunction(1, 0)],
  ["<p", "<p>", "<p>\n\n</p>", makeApplyHintFunction(1, 0)],
  ["<span", "<span>", "<span></span>", makeApplyHintFunction(0, 6)],
  ["<a", "<a>", '<a href=""></a>', makeApplyHintFunction(0, 9)],
  ["<h1", "<h1>", '<h1>\n\n</h1>', makeApplyHintFunction(1, 0)],
  ["<h2", "<h2>", '<h2>\n\n</h2>', makeApplyHintFunction(1, 0)],
  ["<h3", "<h3>", '<h3>\n\n</h3>', makeApplyHintFunction(1, 0)],
  ["<h4", "<h4>", '<h4>\n\n</h4>', makeApplyHintFunction(1, 0)],
  ["<h5", "<h5>", '<h5>\n\n</h5>', makeApplyHintFunction(1, 0)],
  ["<ul", "<ul>", '<ul>\n\n</ul>', makeApplyHintFunction(1, 0)],
  ["<li", "<li>", '<li>\n\n</li>', makeApplyHintFunction(1, 0)],
  ["<form", "<form>", '<form>\n\n</form>', makeApplyHintFunction(1, 0)],
  ["<label", "<label>", '<label></label>', makeApplyHintFunction(0, 7)],
  ["<button", "<button>", '<button></button>', makeApplyHintFunction(0, 8)],
  ["<php", "<?php ?>", "<?php  ?>"],
  ["<phpif", "<?php if {} ?>", "<?php if () { ?>\n\n<?php } ?>", makeApplyHintFunction(0, 10)],
  ["<phpforeach", "<?php foreach {} ?>", "<?php foreach () { ?>\n\n<?php } ?>", makeApplyHintFunction(0, 15)],
  ["<phpp", "<?php p() ?>", "<?php p() ?>", makeApplyHintFunction(0, 8)],
  ["compact", "compact()", "compact()", makeApplyHintFunction(0, 8)],
  "return",
  "namespace",
  "implements",
  "use",
  "this",
  "public",
  "private",
  "protected",
  "static",
  ["__construct", "__construct()", "__construct()", makeApplyHintFunction(0, 12)],
  ['id', 'id=""', 'id=""', makeApplyHintFunction(0, 4)],
  ['class', 'class=""', 'class=""', makeApplyHintFunction(0, 7)],
  ['style', 'style=""', 'style=""', makeApplyHintFunction(0, 7)],
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
        hint: keyword[3],
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
  search_word = search_word.replace(/.*?([-_<A-Za-z0-9]*)$/, "$1")
  if (search_word == "") {
    return {
      list: [],
      from: cursor,
      to: cursor,
    }
  }
  let founds = []
  function searchInLine(line_handle) {
    let words = line_handle.text.split(/[^-<_A-Za-z0-9]+/)
    words = words.filter(function(word) {
      if (word.length <= search_word.length) {
        return false
      }
      if (word.substr(0, search_word.length) != search_word) {
        return false
      }
      return true
    })
    words = words.map(function(word) {
      return word.replace(/[^A-Za-z0-9]+$/, "")
    })
    founds.push(...words)
  }
  editor.eachLine(0, cursor.line, searchInLine)
  founds.reverse()
  editor.eachLine(cursor.line, editor.lastLine(), searchInLine)
  founds = completeWithKeywords(search_word).concat(founds)
  founds = [...new Set(founds)]
  let current_word = current_line.substr(cursor.ch)
  current_word = current_word.replace(/([-_<A-Za-z0-9]*)(.*)/, "$1")
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
