var Observable = require("./observable")

var Rotate = function(values, value) {
  var isValidValue = function(v) {
    return v === null || v === undefined || values.indexOf(v) != -1
  }
  
  var checkValue = function(v) {
    if (!isValidValue(v)) {
      throw "invalid value: " + v
    }
  }
  checkValue(value)
  
  var rotate = Observable(value)
  
  rotate.getValues = function() {
    return values
  }
  
  var _set = rotate.set
  rotate.set = function(new_value) {
    checkValue(new_value)
    _set(new_value)
  }
  
  rotate.rotate = function() {
    var idx = values.indexOf(rotate.get())
    idx = (idx + 1) % values.length
    rotate.set(values[idx])
  }
  
  return rotate
}

module.exports = Rotate
