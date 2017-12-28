var Rotate = require("./rotate")

var Indent = function(type) {
  return Rotate(["2SP", "4SP", "TAB"], type)
}

Indent.detectIndentType = function(content) {
  if (content.match(/\n\t[^\n]/)) {
    return "TAB"
  }
  for (var size = 2; size <= 4; size *= 2) {
    var rx = new RegExp("^ {" + size + "}[^ \n]", "m")
    if (rx.test(content)) {
      return size + "SP"
    }
  }
  return "2SP"
}

module.exports = Indent
