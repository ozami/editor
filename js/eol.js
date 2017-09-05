var Rotate = require("./rotate")

var Eol = function(eol) {
  return Rotate(["\n", "\r\n", "\r"], eol)
}

Eol.detect = function(text) {
  if (text.match("\r\n")) {
    return "\r\n"
  }
  if (text.match("\r")) {
    return "\r"
  }
  return "\n"
}

Eol.regulate = function(text) {
  return text.replace(/(\r\n|\r)/, "\n")
},

module.exports = Eol
