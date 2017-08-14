"use strict"

var signals = require("signals")

var Rotate = function(values, value) {
  this.values = values
  this.changed = new signals.Signal()
  this.checkValue(value)
  this.value = value
}

Rotate.prototype.getValues = function() {
  return this.values
}

Rotate.prototype.isValidValue = function(value) {
  return this.values.indexOf(value) != -1
}

Rotate.prototype.checkValue = function(value) {
  if (!this.isValidValue(value)) {
    throw "invalid value: " + value
  }
}

Rotate.prototype.get = function() {
  return this.value
}

Rotate.prototype.set = function(value) {
  if (value == this.value) {
    return
  }
  this.checkValue(value)
  this.value = value
  this.changed.dispatch(this.value)
}

Rotate.prototype.rotate = function() {
  var idx = this.values.indexOf(this.value)
  idx = (idx + 1) % this.values.length
  this.set(this.values[idx])
}

module.exports = Rotate
