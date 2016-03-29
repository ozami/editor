(function() {
  // shortcut keys
  Mousetrap.bind("ctrl+=", function() {
    file_manager.nextFile();
    return false;
  }, 'keydown');
  Mousetrap.bind("ctrl+shift+=", function() {
    file_manager.prevFile();
    return false;
  }, 'keydown');
})();
