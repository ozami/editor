var Signal = require("signals").Signal

var Observable = function(value) {
  var observable = new Signal()
  Object.assign(observable, {
    get: function() {
      return value
    },
    set: function(new_value) {
      if (value === new_value) {
        return
      }
      var old_value = value
      value = new_value
      observable.dispatch(value, old_value, observable)
    },
    observe: observable.add, // alias
  })
  return observable
}

module.exports = Observable
