// FileManager
var FileManager = function() {
  var self = this;
  $("#files").on("click", ".file-item", function(e) {
    e.preventDefault();
    self.open($(e.currentTarget).data("path"));
  });
};
FileManager.prototype.open = function(path) {
  var activateFile = function(file) {
    $("#files .file-item.active").removeClass("active");
    file.addClass("active");
    editor_manager.activate(file.data("path"));
  };
  // search for opening file
  var file = $("#files .file-item").filter(function(idx, item) {
    return $(item).data("path") == path;
  });
  if (file.length) {
    activateFile(file);
  } else {
    var dir = path.replace(new RegExp("[^/]+$"), "");
    var name = path.replace(new RegExp(".*/"), "");
    editor_manager.open(path).then(function() {
      file = $("<div>").data("path", path).addClass("file-item").append(
        $("<div>").addClass("dir").text(dir),
        $("<div>").addClass("name").text(name)
      ).appendTo("#files");
      activateFile(file);
    });
 }
};
var file_manager = new FileManager();
