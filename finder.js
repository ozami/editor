var Finder = function() {
  var self = this;
  this.path_watcher = null;
  this.last_path = localStorage.getItem("finder-path") || "/";
  this.path = $("#finder-path");
  this.items = $("#finder-items");
  
  this.path.val(this.last_path);

  // open file
  Mousetrap(this.path[0]).bind("enter", function() {
    var active = self.items.find("a.active");
    if (active.length) {
      self.selectItem(active);
    } else {
      file_manager.open(self.path.val());
    }
    return false;
  });
  // when finder item selected
  this.items.on("mousedown", "a", function(e) {
    e.preventDefault();
  });
  this.items.on("click", "a", function(e) {
    self.selectItem(e.target);
  });
  // show finder
  Mousetrap.bind(["ctrl+o", "ctrl+p"], function() {
    self.show();
    self.path.focus();
    return false;
  });
  self.path.blur(function() {
    self.hide();
  });
  // select item with up/down key
  Mousetrap(this.path[0]).bind("down", function() {
    self.moveSelect(true);
    return false;
  });
  Mousetrap(this.path[0]).bind("up", function() {
    self.moveSelect(false);
    return false;
  });
  Mousetrap(this.path[0]).bind("esc", function() {
    self.hide();
    editor_manager.activate(editor_manager.getActive());
    return false;
  });
};
Finder.prototype.show = function(item) {
  $("#finder").addClass("active");
  this.showSuggest();
};
Finder.prototype.hide = function(item) {
  $("#finder").removeClass("active");
  this.hideSuggest();
};
Finder.prototype.selectItem = function(item) {
  item = $(item);
  this.path.val(item.data("path"));
  if (!item.data("dir")) {
    file_manager.open(this.path.val());
    this.hideSuggest();
  }
};
Finder.prototype.moveSelect = function(down) {
  var dir = down ? "next" : "prev";
  var target = this.items.find("a.active")[dir]();
  if (target.length == 0) {
    target = this.items.find("a")[down ? "first" : "last"]();
  }
  this.items.find("a.active").removeClass("active");
  target.addClass("active");
  if (target.length) {
    target[0].scrollIntoView();
  }
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
  }).fail(function() {
    console.log("finder network error");
  }).done(function(reply) {
    self.items.empty();
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
  self.items.empty();
  clearInterval(self.path_watcher);
  self.path_watcher = null;
};
Finder.prototype.setPath = function(path) {
  this.path.val(path);
  this.last_path = path;
  localStorage.setItem("finder-path", path);
}
var finder = new Finder();
