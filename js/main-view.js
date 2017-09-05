var $ = require("jquery")
var EditorManagerView = require("./editor-manager-view")

var MainView = function(editor_mgr) {
  var $main = $("main")
  var editor_mgr_view = EditorManagerView($main, editor_mgr)
}

module.exports = MainView
