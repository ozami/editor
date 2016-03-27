var Finder = function() {
  var self = this;
  this.path_watcher = null;
  this.last_path = localStorage.getItem("finder-path") || "/";
  this.path = $("#finder-path");
  this.items = $("#finder-items");
  
  this.path.val(this.last_path);

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
  }, 300);

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
    if (!$(e.target).data("dir")) {
      $("#finder").submit();
    }
  });
};
Finder.prototype.showSuggest = function() {
  var self = this;
  self.last_path = self.path.val();
  self.fetchSuggest(self.last_path);

  var pathChanged = _.debounce(function(path) {
    localStorage.setItem("finder-path", path);
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
        $("<a>").text(name).data("path", reply.base + "/" + name).data("dir", item.dir)
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
Finder.prototype.setPath = function(path) {
  this.path.val(path);
  this.last_path = path;
  localStorage.setItem("finder-path", path);
}
var finder = new Finder();
