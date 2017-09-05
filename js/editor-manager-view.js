var $ = require("jquery")
var _ = require("underscore")
var EditorView = require("./editor-view")

var EditorManagerView = function($root, editor_mgr) {
  var editors = {}
  var $tabs = $("<div>").attr("id", "files").appendTo($root)
  var $editors = $("<div>").attr("id", "editors").appendTo($root)
  
  editor_mgr.opened.add(function(editor) {
    var path = editor.getPath()
    var dir = path.replace(new RegExp("[^/]+$"), "")
    var name = path.replace(new RegExp(".*/"), "")
    var $tab = $("<div>").addClass("file-item").append(
      $("<div>").addClass("dir").text(dir),
      $("<div>").addClass("name").text(name),
      $('<div class="status clean">')
    ).appendTo($tabs)
    // status in tab
    editor.status.observe(function(status) {
      $tab.find(".status").removeClass("clean error modified").addClass(status)
    })
    // editor view
    var $editor = $("<div>").addClass("editor").appendTo($editors)
    var editor_view = EditorView($editor, editor, editor_mgr)
    
    editors[path] = {
      $tab: $tab,
      $editor: $editor,
    }
  })
  
  editor_mgr.closed.add(function(path) {
    editors[path].$tab.remove()
    editors[path].$editor.remove()
    delete editors[path]
  })
  
  editor_mgr.activated.add(function(path) {
    $tabs.find(".file-item.active").removeClass("active")
    if (path === null) {
      return
    }
    editors[path].$tab.addClass("active")
  })
  
  $tabs.on("click", ".file-item", function(e) {
    e.preventDefault()
    var $target = $(e.currentTarget)
    var path = _.findKey(editors, function(i) {
      return i.$tab.is($target)
    })
    editor_mgr.activate(path)
  })
}

module.exports = EditorManagerView
