(function() {
  var Mousetrap = require("mousetrap");
  var file_manager = require("./file.js");
  var finder = require("./finder.js");
  
  // shortcut keys
  Mousetrap.bind(["mod+;", "mod+="], function() {
    file_manager.nextFile();
    return false;
  }, 'keydown');
  Mousetrap.bind(["mod+shift+;", "mod+shift+="], function() {
    file_manager.prevFile();
    return false;
  }, 'keydown');
})();
