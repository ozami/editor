"use strict"

var Rotate = require("./rotate.js")

var Indent = function(type) {
  Rotate.call(
    this, ["4SP", "2SP", "TAB"], type
  )
}
Indent.prototype = Object.create(Rotate.prototype)
Indent.prototype.constructor = Rotate

Indent.detectIndentType = function(content) {
  if (content.match(/[\r\n]+\t/)) {
    return "TAB"
  }
  var lines = content.split(/[\r\n]+/)
  for (var i = 0; i < lines.length; ++i) {
    var indent = lines[i].replace(/^( *).*/, "$1")
    if (indent.length == 2) {
      return "2SP"
    }
  }
  return "4SP"
}

module.exports = Indent
