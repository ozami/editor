$(function() {
  var Finder = function() {
    var self = this;
    this.path_watcher = null;
    this.last_path = "";
    this.path = $("#finder-path");
    this.items = $("#finder-items");

    // watch path input focus
    setInterval(function() {
      var path_has_focus = self.path.is(":focus");
      var items_visible = self.items.css("visibility") == "visible";
      if (path_has_focus && !items_visible) {
        self.showSuggest();
      }
      if (!path_has_focus && items_visible) {
        self.hideSuggest();
      }
    }, 100);

    // open file
    $("#finder").submit(function(e) {
      e.preventDefault();
      file_manager.open(self.path.val());
    });
    // when finder item selected
    this.items.on("mousedown", "a", function(e) {
      e.preventDefault();
    });
    this.items.on("click", "a", function(e) {
      self.path.val($(e.target).data("path"));
      self.hideSuggest();
    });
  };
  Finder.prototype.showSuggest = function() {
    var self = this;
    self.last_path = self.path.val();
    self.fetchSuggest(self.last_path);

    var pathChanged = _.debounce(function(path) {
      self.fetchSuggest(path);
    }, 400);
    self.path_watcher = setInterval(function() {
      var current = self.path.val();
      if (current != self.last_path) {
        pathChanged(current);
        self.last_path = current;
      }
    }, 50);
  };
  Finder.prototype.fetchSuggest = function(path) {
    var self = this;
    $.ajax({
      method: "post",
      url: "/finder.php",
      data: {
        path: path
      },
      dataType: "json"
    }).then(function(reply) {
      $("#finder-items").empty();
      if (reply.items.length == 0) {
        return;
      }
      if (reply.items.length == 1 && reply.base + "/" + reply.items[0].name == self.path.val()) {
        return;
      }
      _.each(reply.items, function(item) {
        var name = item.name;
        if (item.dir) {
          name += "/";
        }
        $("#finder-items").append(
          $("<a>").text(name).data("path", reply.base + "/" + name)
        );
      });
      $("#finder-items").scrollTop(0).css({visibility: "visible"});
    });
  };
  Finder.prototype.hideSuggest = function() {
    var self = this;
    self.items.css({visibility: "hidden"});
    clearInterval(self.path_watcher);
    self.path_watcher = null;
  };
  var finder = new Finder();
  
  // EditorManager
  var EditorManager = function() {
  };
  EditorManager.prototype.open = function(path) {
    $.ajax({
      method: "post",
      url: "/file.php",
      data: {
        path: path
      },
      dataType: "json"
    }).then(function(reply){
      if (reply.error) {
        alert(reply.error);
        return;
      }
      var editor = $("<div>").addClass("editor").appendTo("#editors");
      var code_mirror = CodeMirror(editor[0], {
        theme: "abcdef",
        value: reply.content
      });
    });
  };
  EditorManager.prototype.show = function(path) {
  };
  var editor_manager = new EditorManager();

  // FileManager
  var FileManager = function() {
    $("#files").on("click", ".file-item", function(e) {
      e.preventDefault();
      openFile($(e.currentTarget).data("path"));
    });
  };
  FileManager.prototype.open = function(path) {
    var activateFile = function(file) {
      $("#files .file-item.active").removeClass("active");
      file.addClass("active");
      editor_manager.show(path);
    };
    var file = $("#files .file-item").filter(function(idx, item) {
      return $(item).data("path") == path;
    });
    if (file.length) {
      
    } else {
      var dir = path.replace(new RegExp("[^/]+$"), "");
      var name = path.replace(new RegExp(".*/"), "");
      file = $("<div>").data("path", path).addClass("file-item").append(
        $("<div>").addClass("dir").text(dir),
        $("<div>").addClass("name").text(name)
      ).appendTo("#files");
      editor_manager.open(path);
    }

  };
  var file_manager = new FileManager();
  
});
