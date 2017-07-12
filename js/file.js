var $ = require("jquery");
var editor_manager = require("./editor.js");
var Mousetrap = require("mousetrap");

// FileManager
var FileManager = function() {
  var self = this;
  $("#files").on("click", ".file-item", function(e) {
    e.preventDefault();
    self.open($(e.currentTarget).data("path"));
  });
  Mousetrap.bind(["mod+w", "mod+k"], function() {
    self.close(self.getActive());
    return false;
  }, 'keydown');
  Mousetrap.bind(["mod+r"], function() {
    self.reload(self.getActive());
    return false;
  }, 'keydown');
  $.each(JSON.parse(localStorage.getItem("open-files") || "[]"), function(i, path) {
    self.open(path);
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
      $("<div>").addClass("name").text(name),
      $('<div class="status clean">')
    ).appendTo("#files");
    self.activate(path);
    self._saveFileList();
  });
};
FileManager.prototype.get = function(path) {
  return $("#files .file-item").filter(function(idx, item) {
    return $(item).data("path") == path;
  });
};
FileManager.prototype.getActive = function() {
  return $("#files .file-item.active").data("path");
};
FileManager.prototype.activate = function(path) {
  var file = this.get(path);
  if (file.length == 0) {
    return false;
  }
  $("#files .file-item.active").removeClass("active");
  file.addClass("active");
  editor_manager.activate(path);
  var finder = require("./finder.js");
  finder.setPath(path);
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
  this.activate(target.data("path"));
};
FileManager.prototype.setStatus = function(path, status) {
  var file = $("#files .file-item").filter(function(idx, item) {
    return $(item).data("path") == path;
  });
  file.find(".status").removeClass("clean error modified").addClass(status);
};
FileManager.prototype.close = function(path) {
  var target = this.get(path);
  if (target.length == 0) {
    return;
  }
  if (target.hasClass("active")) {
    this.prevFile();
  }
  target.remove();
  editor_manager.close(path);
  this._saveFileList();
};

FileManager.prototype.reload = function(path) {
  this.close(path);
  this.open(path);
};

FileManager.prototype._saveFileList = function() {
  var files = $.map($("#files .file-item"), function(item) {
    return $(item).data("path");
  });
  localStorage.setItem("open-files", JSON.stringify(files));
};
module.exports = new FileManager();
