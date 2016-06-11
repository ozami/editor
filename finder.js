var Finder = function() {
  var self = this;
  this.path = $("#finder-path").val(this._getLastPath());
  this.path_watcher = null;
  this.suggest = new FinderSuggest(this);
  
  // open file with enter key
  Mousetrap(this.path[0]).bind("enter", function() {
    var path = self.suggest.getSelection();
    if (path) {
      self.suggestSelected(path);
    } else {
      file_manager.open(self.path.val());
      self.hide();
    }
    return false;
  });
  
  // path completion with tab key
  Mousetrap(this.path[0]).bind("tab", function() {
    var path = self.path.val();
    self.suggest.fetch(path).then(function(suggest) {
      if (suggest.items.length == 0) {
        return;
      }
      if (suggest.items.length == 1) {
        self.setPath(suggest.base + suggest.items[0]);
        return;
      }
    }).catch(function() {
      console.log("completion failed.");
    });
    return false;
  });
  //
  Mousetrap(this.path[0]).bind("mod+u", function() {
    var path = self.path.val();
    path = path.replace(new RegExp("[^/]*/?$"), "");
    self.path.val(path);
    return false;
  });
  // show finder
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    self.show();
    self.path.focus();
    return false;
  });
  
  // hide on blur
  self.path.blur(function() {
    self.hide();
  });
  
  // select item with up/down key
  Mousetrap(this.path[0]).bind("down", function() {
    self.suggest.moveSelect(true);
    return false;
  });
  Mousetrap(this.path[0]).bind("up", function() {
    self.suggest.moveSelect(false);
    return false;
  });
  
  // quit finder with esc key
  Mousetrap(this.path[0]).bind("esc", function() {
    self.hide();
    editor_manager.activate(editor_manager.getActive());
    return false;
  });
};

Finder.prototype.suggestSelected = function(path) {
  this.setPath(path);
  if (path.substr(-1) != "/") {
    file_manager.open(path);
  }
};

Finder.prototype.show = function() {
  var self = this;
  $("#finder").addClass("active");
  
  // start suggest
  var pathChanged = _.debounce(function() {
    self.suggest.update(self.path.val());
  }, 300);
  clearInterval(self.path_watcher);
  self.path_watcher = setInterval(function() {
    var current = self.path.val();
    if (current != self._getLastPath()) {
      self._setLastPath(current);
      pathChanged();
    }
  }, 50);
};

Finder.prototype.hide = function(item) {
  $("#finder").removeClass("active");
};

Finder.prototype.setPath = function(path) {
  this.path.val(path);
  this._setLastPath(path);
  this.suggest.update(path);
};

Finder.prototype._getLastPath = function() {
  return localStorage.getItem("finder-path") || "/";
};

Finder.prototype._setLastPath = function(path) {
  localStorage.setItem("finder-path", path);
};

var finder = new Finder();
