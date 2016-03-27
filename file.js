// FileManager
var FileManager = function() {
  var self = this;
  $("#files").on("click", ".file-item", function(e) {
    e.preventDefault();
    self.open($(e.currentTarget).data("path"));
  });
};
FileManager.prototype.open = function(path) {
  var self = this;
  // try to activate opening files
  if (this.activate(path)) {
    return;
  }
  editor_manager.open(path).then(function() {
    var dir = path.replace(new RegExp("[^/]+$"), "");
    var name = path.replace(new RegExp(".*/"), "");
    $("<div>").data("path", path).addClass("file-item").append(
      $("<div>").addClass("dir").text(dir),
      $("<div>").addClass("name").text(name)
    ).appendTo("#files");
    self.activate(path);
  });
};
FileManager.prototype.activate = function(path) {
  var file = $("#files .file-item").filter(function(idx, item) {
    return $(item).data("path") == path;
  });
  if (file.length == 0) {
    return false;
  }
  $("#files .file-item.active").removeClass("active");
  file.addClass("active");
  editor_manager.activate(path);
  return true;
};
FileManager.prototype.nextFile = function() {
  this.rotateFile(true);
};
FileManager.prototype.prevFile = function() {
  this.rotateFile(false);
};
FileManager.prototype.rotateFile = function(next) {
  var dir = next ? "next" : "prev";
  var target = $("#files .file-item.active")[dir]();
  if (target.length == 0) {
    dir = next ? "first" : "last";
    target = $("#files .file-item")[dir]();
    if (target.length == 0) {
      return;
    }
  }
  $("#files .file-item.active").removeClass("active");
  target.addClass("active");
  editor_manager.activate(target.data("path"));
};


var file_manager = new FileManager();
