require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var CodeMirror = require("codemirror")

var indentAfterPaste = function(cm, change) {
  if (change.origin != "paste") {
    return
  }
  if (CodeMirror.cmpPos(change.from, change.to)) {
    return
  }
  // check if the insertion point is at the end of the line
  var dest = cm.getLine(change.from.line)
  if (dest.length != change.from.ch) {
    return
  }
  // check if the line consists of only white spaces
  if (dest.match(/[^ \t]/)) {
    return
  }
  // remove the last empty line
  if (change.text[change.text.length - 1] == "") {
    change.text.pop()
  }
  var base_indent = change.text[0].match(/^[ \t]*/)[0]
  change.text = change.text.map(function(line, i) {
    line = line.match(/^([ \t]*)(.*)/)
    var indent = line[1]
    var text = line[2]
    indent = (dest + indent).substr(0, dest.length + indent.length - base_indent.length)
    return indent + text
  })
  change.text[0] = change.text[0].substr(dest.length)
}

module.exports = indentAfterPaste

},{"codemirror":"codemirror"}],2:[function(require,module,exports){
var CodeMirror = require("codemirror")
var _ = require("underscore")
require("codemirror-addon")
require("./mark")
require("./select-line")
require("./select-word")
require("./split-into-lines")
require("./text-mode")

Object.assign(CodeMirror.defaults, {
  lineNumbers: true,
  tabSize: 4,
  showCursorWhenSelecting: true,
  autoCloseBrackets: true,
  matchBrackets: true,
  matchTags: true,
  autoCloseTags: true,
  styleActiveLine: {nonEmpty: true},
  styleSelectedText: true,
  dragDrop: false,
  extraKeys: {
    "Ctrl-Space": "autocomplete",
    "Ctrl-U": "autocomplete",
    "Ctrl-/": "toggleComment",
    "Cmd-/": "toggleComment",
    "Tab": "indentAuto",
    "Ctrl-D": false,
    "Cmd-D": false,
  },
})

CodeMirror.defineInitHook(function(cm) {
  // maintain indentation on paste
  cm.on("beforeChange", require("./indent-after-paste"))
  
  // key bindings
  var input = cm.getInputField()
  input.className += " mousetrap" // enable hotkey
  var keymap = {
    "alt+b": "goWordLeft",
    "alt+f": "goWordRight",
    "alt+h": "delWordBefore",
    "alt+d": "delWordAfter",
    "mod+m": "mark",
    "mod+d": "selectWord",
    "mod+l": "selectLine",
    "mod+shift+l": "splitIntoLines",
  }
  _.each(keymap, function(command, key) {
    Mousetrap(input).bind(key, function() {
      cm.execCommand(command)
      return false
    })
  })
})

module.exports = CodeMirror

},{"./indent-after-paste":1,"./mark":3,"./select-line":4,"./select-word":5,"./split-into-lines":6,"./text-mode":7,"codemirror":"codemirror","codemirror-addon":"codemirror-addon","underscore":"underscore"}],3:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.defineInitHook(function(cm) {
  cm.marks = []
})

CodeMirror.commands.mark = function(cm) {
  var cursor = cm.getCursor()
  if (cm.marks.length) {
    var last = cm.marks[cm.marks.length - 1]
    if (last.line == cursor.line && last.ch == cursor.ch) {
      cm.setSelections(cm.marks.map(function(m) {
        return {head: m, anchor: m}
      }), cm.marks.length - 1)
      cm.marks = []
      return
    }
  }
  cm.marks.push(cursor)
}

},{"codemirror":"codemirror"}],4:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.commands.selectLine = function(cm) {
  cm.setSelections(
    cm.listSelections().map(function(i) {
      return {
        anchor: {
          line: i.head.line + 1,
          ch: 0,
        },
        head: {
          line: i.anchor.line,
          ch: 0,
        }
      }
    })
  )
}

},{"codemirror":"codemirror"}],5:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.commands.selectWord = function(cm) {
  cm.setSelections(
    cm.listSelections().map(function(i) {
      return cm.findWordAt(i.anchor)
    })
  )
}

},{"codemirror":"codemirror"}],6:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.commands.splitIntoLines = function(cm) {
  var selections = cm.listSelections()
  if (selections.length != 1) {
    // Do nothing
    return
  }
  var anchor = selections[0].anchor
  var head = selections[0].head
  var new_selections = []
  for (var i = anchor.line; i <= head.line; ++i) {
    new_selections.push({
      anchor: {
        line: i,
        ch: i == anchor.line ? anchor.ch : 0,
      },
      head: {
        line: i,
        ch: i == head.line ? head.ch : Infinity,
      },
    })
  }
  cm.setSelections(new_selections)
}

},{"codemirror":"codemirror"}],7:[function(require,module,exports){
var CodeMirror = require("codemirror")

CodeMirror.defineSimpleMode("text", {
  start: [],
  comment: [],
  meta: {},
})

},{"codemirror":"codemirror"}],8:[function(require,module,exports){
var $ = require("jquery")

var open = function(content) {
  var close = function() {
    backdrop.remove()
  }
  return close
}

var view = function(content, class_name) {
  var backdrop = $('<div class="backdrop">').appendTo(document.body)
  var dialog = $('<div class="dialog">').appendTo(backdrop)
  dialog.addClass(class_name)
  dialog.append(content)
  return backdrop
}

module.exports.view = view

},{"jquery":"jquery"}],9:[function(require,module,exports){
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

},{"./editor-view":11,"jquery":"jquery","underscore":"underscore"}],10:[function(require,module,exports){
var signals = require("signals")
var _ = require("underscore")
var File = require("./file")
var Editor = require("./editor")

var EditorManager = function(finder) {
  var model = {
    opened: new signals.Signal(),
    closed: new signals.Signal(),
    activated: new signals.Signal(),
    
    active: null, // path of active file
    editors: [],
    
    getFiles: function() {
      return model.editors.map(function(editor) {
        return editor.getPath()
      })
    },
    
    open: function(path) {
      if (path === null) {
        throw "The path is null"
      }
      // try to activate already opened files
      if (model.activate(path)) {
        return
      }
      var editor = Editor(File(path))
      editor.load().then(function() {
        model.editors.push(editor)
        model.opened.dispatch(editor)
        model.activate(path)
      })
    },
    
    getActive: function() {
      return model.active
    },
    
    activate: function(path) {
      if (path === model.active) {
        return true
      }
      if (path !== null && model.indexOf(path) == -1) {
        return false
      }
      model.active = path
      model.activated.dispatch(path)
      finder.setPath(path)
      return true
    },
    
    nextFile: function() {
      model.rotateFile(true)
    },
    
    prevFile: function() {
      model.rotateFile(false)
    },
    
    rotateFile: function(next) {
      if (model.editors.length == 0) {
        return
      }
      var idx
      if (model.active === null) {
        idx = next ? 0 : model.editors.length - 1
      }
      else {
        idx = model.indexOf(model.active)
        idx += next ? +1 : -1
        idx = (idx + model.editors.length) % model.editors.length
      }
      model.activate(model.editors[idx].getPath())
    },
    
    close: function(path) {
      var idx = model.indexOf(path)
      if (idx == -1) {
        return
      }
      if (path === model.active) {
        if (model.editors.length == 1) {
          model.activate(null)
        }
        else {
          model.prevFile()
        }
      }
      model.editors.splice(idx, 1)
      model.closed.dispatch(path)
    },
    
    reload: function(path) {
      model.close(path)
      model.open(path)
    },
    
    indexOf: function(path) {
      return model.getFiles().indexOf(path)
    },
  }
  
  finder.selected.add(model.open)
  
  return model
}

module.exports = EditorManager

},{"./editor":12,"./file":14,"signals":"signals","underscore":"underscore"}],11:[function(require,module,exports){
var $ = require("jquery")
var CodeMirror = require("./codemirror")
var SelectEncodingDialogView = require("./select-encoding-dialog-view")

var EditorView = function($root, editor, editor_mgr) {
  var file = editor.getFile()
  
  var cm = CodeMirror($root[0], {
    value: editor.text.get(),
    mode: editor.mode.get(),
  })
  
  // footer
  $root.append(
    $('<div class="editor-foot">').append(
      $('<div class="editor-message">'),
      $('<button class="editor-indent link" type="button">'),
      $('<button class="editor-eol link" type="button">'),
      $('<button class="editor-encoding link" type="button">'),
      $('<div class="editor-mode">')
    )
  )
  
  SelectEncodingDialogView(
    editor.select_encoding_dialog
  )
  
  // save
  var last_generation = cm.changeGeneration(true)
  var save = function() {
    var generation = cm.changeGeneration(true)
    editor.save().then(function() {
      last_generation = generation
    })
  }
  cm.on("changes", function() {
    editor.text.set(cm.getValue())
    editor.status.set(
      cm.isClean(last_generation) ? "clean" : "modified"
    )
  })
  editor.text.observe(function(text) {
    if (text != cm.getValue()) {
      cm.setValue(text)
    }
  })

  // mode
  var updateMode = function(mode) {
    cm.setOption("mode", mode)
    CodeMirror.registerHelper("hintWords", mode, null)
    $root.find(".editor-mode").text(mode)
  }
  editor.mode.observe(updateMode)
  updateMode(editor.mode.get())
  
  // indent
  var updateIndent = function(type) {
    $root.find(".editor-indent").text(type)
    if (type == "TAB") {
      cm.setOption("indentWithTabs", true)
      cm.setOption("indentUnit", 4)
    }
    else {
      cm.setOption("indentWithTabs", false)
      cm.setOption("indentUnit", Number(type.replace("SP", "")))
    }
  }
  editor.indent.observe(updateIndent)
  updateIndent(editor.indent.get())
  $root.find(".editor-indent").click(function() {
    editor.indent.rotate()
  })
  
  // line seprator
  var updateEol = function(eol) {
    var names = {
      "\r": "CR",
      "\n": "LF",
      "\r\n": "CRLF",
    }
    $root.find(".editor-eol").text(names[eol])
  }
  file.eol.observe(updateEol)
  updateEol(file.eol.get())
  $root.find(".editor-eol").click(function() {
    file.eol.rotate()
  })
  
  // encoding
  var updateEncoding = function(encoding) {
    $root.find(".editor-encoding").text(encoding)
  }
  file.encoding.add(updateEncoding)
  updateEncoding(file.encoding.get())
  $root.find(".editor-encoding").click(function() {
    editor.select_encoding_dialog.show(
      file.encoding.get()
    )
  })
  editor.select_encoding_dialog.confirmed.add(function(encoding) {
    file.encoding.set(encoding)
  })
  
  // message
  editor.message.observe(function(message) {
    $root.find(".editor-message").text(message)
  })
  
  // active
  editor_mgr.activated.add(function(active) {
    if (active == file.getPath()) {
      $root.addClass("active")
      cm.focus()
      cm.refresh()
    }
    else {
      $root.removeClass("active")
    }
  })
  
  // save with command-s
  Mousetrap($root[0]).bind("mod+s", function() {
    save()
    return false
  })
}

module.exports = EditorView

},{"./codemirror":2,"./select-encoding-dialog-view":25,"jquery":"jquery"}],12:[function(require,module,exports){
var $ = require("jquery")
var _ = require("underscore")
var Observable = require("./observable")
var CodeMirror = require("./codemirror")
var Indent = require("./indent")
var SelectEncodingDialog = require("./select-encoding-dialog")

var Editor = function(file) {
  var editor = {
    text: Observable(""),
    status: Observable("clean"),
    mode: Observable("text"),
    indent: Indent(),
    message: Observable(""),
    select_encoding_dialog: SelectEncodingDialog(),
    
    getFile: function() {
      return file
    },
    
    getPath: function() {
      return file.getPath()
    },
    
    load: function(text) {
      return file.read().then(function(text) {
        editor.indent.set(Indent.detectIndentType(text))
        editor.text.set(text)
        editor.message.set("Loaded.")
      })
    },
    
    save: function() {
      return file.write(editor.text.get()).catch(function(error) {
        editor.message.set("Save failed. " + reply.error)
        editor.status.set("error")
      }).then(function() {
        editor.status.set("clean")
        editor.message.set("Saved.")
      })
    },
  }
  
  var detectMode = (function(path) {
    var extension = path.replace(/.*[.](.+)$/, "$1")
    var mode = {
      html: "php",
      tag: "php",
    }[extension]
    if (mode) {
      return mode
    }
    mode = CodeMirror.findModeByExtension(extension)
    if (mode) {
      return mode.mode
    }
    return "text"
  })
  editor.mode.set(detectMode(file.getPath()))
  
  // auto save
  editor.text.observe(_.debounce(function() {
    if (editor.status.get() != "clean") {
      editor.save()
    }
  }, 4000))
  
  return editor
}

module.exports = Editor

},{"./codemirror":2,"./indent":19,"./observable":22,"./select-encoding-dialog":26,"jquery":"jquery","underscore":"underscore"}],13:[function(require,module,exports){
var Rotate = require("./rotate")

var Eol = function(eol) {
  return Rotate(["\n", "\r\n", "\r"], eol)
}

Eol.detect = function(text) {
  if (text.match("\r\n")) {
    return "\r\n"
  }
  if (text.match("\r")) {
    return "\r"
  }
  return "\n"
}

Eol.regulate = function(text) {
  return text.replace(/(\r\n|\r)/, "\n")
},

module.exports = Eol

},{"./rotate":24}],14:[function(require,module,exports){
var $ = require("jquery")
var Observable = require("./observable")
var Eol = require("./eol")

var File = function(path) {
  var file = {
    eol: Eol(),
    encoding: Observable(),
    
    getPath: function() {
      return path
    },
    
    read: function() {
      return new Promise(function(resolve, reject) {
        $.ajax({
          method: "post",
          url: "/read.php",
          timeout: 3000,
          data: {
            path: path,
          },
          dataType: "json",
        }).fail(reject).done(function(reply) {
          file.encoding.set(reply.encoding)
          file.eol.set(Eol.detect(reply.content))
          var content = Eol.regulate(reply.content)
          resolve(content)
        })
      })
    },
    
    write: function(text) {
      return new Promise(function(resolve, reject) {
        $.ajax({
          url: "/write.php",
          method: "post",
          timeout: 2000,
          data: {
            path: path,
            encoding: file.encoding.get(),
            content: text.replace(/\n/g, file.eol.get())
          },
          dataType: "json",
        }).done(function(reply) {
          if (reply == "ok") {
            resolve()
          }
          else {
            reject(reply.error)
          }
        }).fail(function() {
          reject("")
        })
      })
    },
  }
  return file
}

module.exports = File

},{"./eol":13,"./observable":22,"jquery":"jquery"}],15:[function(require,module,exports){
var $ = require("jquery")

var FinderSuggestView = function($root, model) {
  var $list = $root
  
  var view = {
    updateItems: function(items) {
      $list.removeClass("active").empty()
      if (items.length == 0) {
        return
      }
      if (items.length == 1 && items[0] == model.getCursor()) {
        return
      }
      var name_rx = new RegExp("/([^/]*/?)$")
      $list.append(items.map(function(item) {
        var name = name_rx.exec(item)[1]
        return $("<a>").text(name).data("path", item)
      }))
      $list.scrollTop(0).addClass("active")
    },
    
    updateCursor: function(path) {
      $list.find("a.selected").removeClass("selected")
      if (path === null) {
        return
      }
      var a = $list.find("a").filter(function() {
        return $(this).data("path") == path
      })
      if (a.length == 0) {
        return
      }
      a.addClass("selected")

      // scroll the list to make the selected item visible
      var scrollIntoView = function(target) {
        var height = target.height()
        var top = target.prevAll().length * height
        var bottom = top + height
        var view_height = $list.innerHeight()
        if (top - $list.scrollTop() < 0) {
          $list.scrollTop(top)
        }
        if (bottom - $list.scrollTop() > view_height) {
          $list.scrollTop(bottom - view_height)
        }
      }
      scrollIntoView(a)
    }
  }
  
  model.items_changed.add(view.updateItems)
  model.cursor_moved.add(view.updateCursor)
  
  // when item was selected
  $list.on("click", "a", function(e) {
    e.preventDefault()
    model.select($(e.target).data("path"))
  })
  
  // prevent from loosing focus
  $list.on("mousedown", "a", function(e) {
    e.preventDefault()
  })
  
  return view
}

module.exports = FinderSuggestView

},{"jquery":"jquery"}],16:[function(require,module,exports){
var _ = require("underscore")
var $ = require("jquery")
var Signal = require("signals").Signal

var FinderSuggest = function(finder) {
  var model = {
    items: [],
    cursor: null, // highlighted item
    
    items_changed: new Signal(),
    cursor_moved: new Signal(),
    selected: new Signal(),
    
    update: function(path) {
      $.ajax({
        method: "post",
        url: "/finder.php",
        timeout: 3000,
        data: {
          path: path,
        },
        dataType: "json",
      }).fail(function() {
        console.log("failed to fetch suggest for the path: " + path)
      }).done(function(reply) {
        model.setItems(reply.items.map(function(i) {
          return reply.base + i
        }))
      })
    },
    
    setItems: function(items) {
      model.setCursor(null)
      model.items = items
      model.items_changed.dispatch(model.items)
    },
    
    getItems: function() {
      return model.items
    },
    
    getCursor: function() {
      return model.cursor
    },
    
    setCursor: function(path) {
      if (path === model.cursor) {
        return
      }
      model.cursor = path
      model.cursor_moved.dispatch(model.cursor)
    },
    
    moveCursor: function(next) {
      if (model.cursor === null) {
        if (model.items.length != 0) {
          model.setCursor(model.items[0])
        }
        return
      }
      var idx = model.items.indexOf(model.cursor)
      idx += next ? +1 : -1
      idx = Math.max(0, Math.min(model.items.length - 1, idx))
      model.setCursor(model.items[idx])
    },
    
    select: function(path) {
      model.setCursor(path)
      model.selected.dispatch(path)
    },
  }
  
  finder.visibility_changed.add(function(visible) {
    if (visible) {
      model.update(finder.getPath())
    }
  })
  
  finder.path_changed.add(_.debounce(model.update, 250))
  
  return model
}

module.exports = FinderSuggest

},{"jquery":"jquery","signals":"signals","underscore":"underscore"}],17:[function(require,module,exports){
var $ = require("jquery")
var Mousetrap = require("mousetrap")
var False = require("./return-false")
var InputWatcher = require("./input-watcher")
var FinderSuggestView = require("./finder-suggest-view")

var FinderView = function($root, finder) {
  var $path_input = $(
    '<input type="text" id="finder-path" class="mousetrap" autocomplete="off" value="/">'
  ).appendTo($root)
  
  var path_watcher = InputWatcher($path_input, 50)
  path_watcher.changed.add(finder.setPath)
  
  var view = {
    show: function() {
      $root.addClass("active")
      $path_input.focus()
      path_watcher.start()
    },
    
    hide: function() {
      $root.removeClass("active")
      path_watcher.stop()
    },
  }
  
  // hide on blur
  $path_input.blur(finder.hide())
  
  finder.visibility_changed.add(function(visible) {
    if (visible) {
      view.show()
    }
    else {
      view.hide()
    }
  })
  
  finder.path_changed.add(function(path) {
    $path_input.val(path)
  })
  
  Mousetrap($path_input[0]).bind("enter", False(finder.enter))
  Mousetrap($path_input[0]).bind("tab", False(finder.tab))
  Mousetrap($path_input[0]).bind("esc", False(finder.hide))
  Mousetrap($path_input[0]).bind("down", False(function() {
    finder.suggest.moveCursor(true)
  }))
  Mousetrap($path_input[0]).bind("up", False(function() {
    finder.suggest.moveCursor(false)
  }))
  Mousetrap($path_input[0]).bind("mod+u", False(
    finder.goToParentDirectory
  ))
  
  // suggest view
  var $items = $('<div id="finder-items">').appendTo($root)
  FinderSuggestView($items, finder.suggest)
  
  return view
}

module.exports = FinderView

},{"./finder-suggest-view":15,"./input-watcher":20,"./return-false":23,"jquery":"jquery","mousetrap":"mousetrap"}],18:[function(require,module,exports){
var Signal = require("signals").Signal
var FinderSuggest = require("./finder-suggest")

var Finder = function() {
  var model = {
    selected: new Signal(),
    path_changed: new Signal(),
    visibility_changed: new Signal(),
    
    path: "",
    visible: false,
    
    select: function(path) {
      model.setPath(path)
      if (path.substr(-1) == "/") {
        return
      }
      model.hide()
      model.selected.dispatch(path)
    },
    
    show: function() {
      model.visible = true
      model.visibility_changed.dispatch(model.visible)
    },
    
    hide: function() {
      model.visible = false
      model.visibility_changed.dispatch(model.visible)
//       editor_manager.activate(editor_manager.getActive())
    },
    
    getPath: function() {
      return model.path
    },
    
    setPath: function(path) {
      model.path = path
      model.path_changed.dispatch(path)
    },
    
    goToParentDirectory: function() {
      model.setPath(
        model.path.replace(new RegExp("[^/]*/?$"), "")
      )
    },
    
    enter: function() {
      var path = suggest.getCursor()
      model.select(path ? path : model.path)
    },
    
    tab: function() {
      var cursor = suggest.getCursor()
      if (cursor) {
        model.setPath(cursor)
        return
      }
      var items = suggest.getItems()
      if (items.length == 1) {
        model.setPath(items[0])
        return
      }
      suggest.update(model.path)
    },
  }
  
  var suggest = model.suggest = FinderSuggest(model)
  suggest.selected.add(function(path) {
    model.select(path)
  })
  
  return model
}

module.exports = Finder

},{"./finder-suggest":16,"signals":"signals"}],19:[function(require,module,exports){
var Rotate = require("./rotate")

var Indent = function(type) {
  return Rotate(["4SP", "2SP", "TAB"], type)
}

Indent.detectIndentType = function(content) {
  if (content.match(/[\r\n]+\t/)) {
    return "TAB"
  }
  var lines = content.split(/[\r\n]+/)
  for (var i = 0; i < lines.length; ++i) {
    var indent = lines[i].replace(/^( *).*/, "$1")
    if (indent.length == 2) {
      return "2SP"
    }
  }
  return "4SP"
}

module.exports = Indent

},{"./rotate":24}],20:[function(require,module,exports){
var $ = require("jquery")
var Signal = require("signals").Signal

var InputWatcher = function(input, interval) {
  input = $(input)
  
  var model = {
    changed: new Signal(),
    
    input: input,
    interval: interval,
    last_value: input.val(),
    timer: null,
    
    start: function() {
      model.stop()
      model.timer = setInterval(model.check, model.interval)
    },
    
    stop: function() {
      clearInterval(model.timer)
      model.timer = null
    },
    
    check: function() {
      var current = model.input.val()
      if (current == model.last_value) {
        return
      }
      model.changed.dispatch(current, model.last_value)
      model.last_value = current
    },
    
    keyDown: function() {
      if (model.timer) {
        model.check()
      }
    },
  }
  
  input.keydown(model.keyDown)
  
  return model
}

module.exports = InputWatcher

},{"jquery":"jquery","signals":"signals"}],21:[function(require,module,exports){
var $ = require("jquery")
var EditorManagerView = require("./editor-manager-view")
var FinderView = require("./finder-view")

var MainView = function(editor_mgr, finder) {
  var $main = $("main")
  EditorManagerView(
    $('<div id="editor_manager">').appendTo($main),
    editor_mgr
  )
  FinderView(
    $('<form id="finder">').appendTo($main),
    finder
  )
  
  // shortcut keys
  Mousetrap.bind(["mod+;", "mod+="], function() {
    editor_mgr.nextFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+shift+;", "mod+shift+="], function() {
    editor_mgr.prevFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+w", "mod+k"], function() {
    editor_mgr.close(editor_mgr.getActive())
    return false
  }, "keydown")
  Mousetrap.bind(["mod+r"], function() {
    editor_mgr.reload(editor_mgr.getActive())
    return false
  }, "keydown")
}

module.exports = MainView

},{"./editor-manager-view":9,"./finder-view":17,"jquery":"jquery"}],22:[function(require,module,exports){
var Signal = require("signals").Signal

var Observable = function(value) {
  var observable = new Signal()
  Object.assign(observable, {
    get: function() {
      return value
    },
    set: function(new_value) {
      if (value === new_value) {
        return
      }
      var old_value = value
      value = new_value
      observable.dispatch(value, old_value, observable)
    },
    observe: observable.add, // alias
  })
  return observable
}

module.exports = Observable

},{"signals":"signals"}],23:[function(require,module,exports){
var returnFalse = function(func) {
  return function() {
    func.apply(this, arguments)
    return false
  }
}

module.exports = returnFalse

},{}],24:[function(require,module,exports){
var Observable = require("./observable")

var Rotate = function(values, value) {
  var isValidValue = function(v) {
    return v === null || v === undefined || values.indexOf(v) != -1
  }
  
  var checkValue = function(v) {
    if (!isValidValue(v)) {
      throw "invalid value: " + v
    }
  }
  checkValue(value)
  
  var rotate = Observable(value)
  
  rotate.getValues = function() {
    return values
  }
  
  var _set = rotate.set
  rotate.set = function(new_value) {
    checkValue(new_value)
    _set(new_value)
  }
  
  rotate.rotate = function() {
    var idx = values.indexOf(rotate.get())
    idx = (idx + 1) % values.length
    rotate.set(values[idx])
  }
  
  return rotate
}

module.exports = Rotate

},{"./observable":22}],25:[function(require,module,exports){
var $ = require("jquery")
var Dialog = require("./dialog")

var SelectEncodingDialogView = function(model) {
  var $content = $('<div>').append(
    $('<select size="4">'),
    $('<button class="ok">OK</button>'),
    $('<button class="cancel">Cancel</button>')
  )
  
  var $dialog = Dialog.view($content, "select-encoding-dialog")

  var $select = $content.find("select")
  $select.append(model.options.map(function(encoding) {
    return $('<option>').text(encoding)
  }))
  model.encoding.observe(function(encoding) {
    $select.val(encoding)
  })
  $select.val(model.encoding.get())
  $select.click(function() {
    model.encoding.set($select.val())
  })
  
  // ok
  $content.find("button.ok").click(model.confirm)
  
  // cancel
  $content.find("button.cancel").click(model.hide)
  
  model.visible.observe(function(visible) {
    if (visible) {
      $dialog.addClass("visible")
      $content.find("input, select").focus()
    }
    else {
      $dialog.removeClass("visible")
    }
  })
}

module.exports = SelectEncodingDialogView

},{"./dialog":8,"jquery":"jquery"}],26:[function(require,module,exports){
var $ = require("jquery")
var Signal = require("signals").Signal
var Observable = require("./observable")

var SelectEncodingDialog = function() {
  
  var dialog = {
    visible: Observable(false),
    encoding: Observable(),
    options: [
      "UTF-8",
      "EUC-JP",
      "SJIS-WIN",
    ],
    confirmed: new Signal(),
    
    confirm: function() {
      dialog.visible.set(false)
      dialog.confirmed.dispatch(dialog.encoding.get())
    },
    
    show: function(encoding) {
      dialog.encoding.set(encoding)
      dialog.visible.set(true)
    },
    
    hide: function() {
      dialog.visible.set(false)
    },
  }
  return dialog
}

module.exports = SelectEncodingDialog

},{"./observable":22,"jquery":"jquery","signals":"signals"}],"app":[function(require,module,exports){
var Mousetrap = require("mousetrap")
var EditorManager = require("./editor-manager")
var Finder = require("./finder")
var MainView = require("./main-view")

module.exports.run = function() {
  var finder = Finder()
  var editor_mgr = EditorManager(finder)
  var view = MainView(editor_mgr, finder)
  
  var saveFileList = function() {
    var files = editor_mgr.getFiles()
    localStorage.setItem("open-files", JSON.stringify(files))
  }
  var loadFileList = function() {
    return JSON.parse(localStorage.getItem("open-files") || "[]")
  }
  loadFileList().forEach(function(path) {
    editor_mgr.open(path)
  })
  
  editor_mgr.opened.add(saveFileList)
  editor_mgr.closed.add(saveFileList)
  
  // show finder
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    finder.show()
    return false
  }, "keydown")
}

},{"./editor-manager":10,"./finder":18,"./main-view":21,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZGlhbG9nLmpzIiwianMvZWRpdG9yLW1hbmFnZXItdmlldy5qcyIsImpzL2VkaXRvci1tYW5hZ2VyLmpzIiwianMvZWRpdG9yLXZpZXcuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9lb2wuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3Qtdmlldy5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LmpzIiwianMvZmluZGVyLXZpZXcuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9pbnB1dC13YXRjaGVyLmpzIiwianMvbWFpbi12aWV3LmpzIiwianMvb2JzZXJ2YWJsZS5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL3NlbGVjdC1lbmNvZGluZy1kaWFsb2ctdmlldy5qcyIsImpzL3NlbGVjdC1lbmNvZGluZy1kaWFsb2cuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG52YXIgaW5kZW50QWZ0ZXJQYXN0ZSA9IGZ1bmN0aW9uKGNtLCBjaGFuZ2UpIHtcbiAgaWYgKGNoYW5nZS5vcmlnaW4gIT0gXCJwYXN0ZVwiKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKENvZGVNaXJyb3IuY21wUG9zKGNoYW5nZS5mcm9tLCBjaGFuZ2UudG8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gIHZhciBkZXN0ID0gY20uZ2V0TGluZShjaGFuZ2UuZnJvbS5saW5lKVxuICBpZiAoZGVzdC5sZW5ndGggIT0gY2hhbmdlLmZyb20uY2gpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICBpZiAoZGVzdC5tYXRjaCgvW14gXFx0XS8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgaWYgKGNoYW5nZS50ZXh0W2NoYW5nZS50ZXh0Lmxlbmd0aCAtIDFdID09IFwiXCIpIHtcbiAgICBjaGFuZ2UudGV4dC5wb3AoKVxuICB9XG4gIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdXG4gIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICBsaW5lID0gbGluZS5tYXRjaCgvXihbIFxcdF0qKSguKikvKVxuICAgIHZhciBpbmRlbnQgPSBsaW5lWzFdXG4gICAgdmFyIHRleHQgPSBsaW5lWzJdXG4gICAgaW5kZW50ID0gKGRlc3QgKyBpbmRlbnQpLnN1YnN0cigwLCBkZXN0Lmxlbmd0aCArIGluZGVudC5sZW5ndGggLSBiYXNlX2luZGVudC5sZW5ndGgpXG4gICAgcmV0dXJuIGluZGVudCArIHRleHRcbiAgfSlcbiAgY2hhbmdlLnRleHRbMF0gPSBjaGFuZ2UudGV4dFswXS5zdWJzdHIoZGVzdC5sZW5ndGgpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5kZW50QWZ0ZXJQYXN0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxucmVxdWlyZShcImNvZGVtaXJyb3ItYWRkb25cIilcbnJlcXVpcmUoXCIuL21hcmtcIilcbnJlcXVpcmUoXCIuL3NlbGVjdC1saW5lXCIpXG5yZXF1aXJlKFwiLi9zZWxlY3Qtd29yZFwiKVxucmVxdWlyZShcIi4vc3BsaXQtaW50by1saW5lc1wiKVxucmVxdWlyZShcIi4vdGV4dC1tb2RlXCIpXG5cbk9iamVjdC5hc3NpZ24oQ29kZU1pcnJvci5kZWZhdWx0cywge1xuICBsaW5lTnVtYmVyczogdHJ1ZSxcbiAgdGFiU2l6ZTogNCxcbiAgc2hvd0N1cnNvcldoZW5TZWxlY3Rpbmc6IHRydWUsXG4gIGF1dG9DbG9zZUJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaEJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaFRhZ3M6IHRydWUsXG4gIGF1dG9DbG9zZVRhZ3M6IHRydWUsXG4gIHN0eWxlQWN0aXZlTGluZToge25vbkVtcHR5OiB0cnVlfSxcbiAgc3R5bGVTZWxlY3RlZFRleHQ6IHRydWUsXG4gIGRyYWdEcm9wOiBmYWxzZSxcbiAgZXh0cmFLZXlzOiB7XG4gICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgIFwiVGFiXCI6IFwiaW5kZW50QXV0b1wiLFxuICAgIFwiQ3RybC1EXCI6IGZhbHNlLFxuICAgIFwiQ21kLURcIjogZmFsc2UsXG4gIH0sXG59KVxuXG5Db2RlTWlycm9yLmRlZmluZUluaXRIb29rKGZ1bmN0aW9uKGNtKSB7XG4gIC8vIG1haW50YWluIGluZGVudGF0aW9uIG9uIHBhc3RlXG4gIGNtLm9uKFwiYmVmb3JlQ2hhbmdlXCIsIHJlcXVpcmUoXCIuL2luZGVudC1hZnRlci1wYXN0ZVwiKSlcbiAgXG4gIC8vIGtleSBiaW5kaW5nc1xuICB2YXIgaW5wdXQgPSBjbS5nZXRJbnB1dEZpZWxkKClcbiAgaW5wdXQuY2xhc3NOYW1lICs9IFwiIG1vdXNldHJhcFwiIC8vIGVuYWJsZSBob3RrZXlcbiAgdmFyIGtleW1hcCA9IHtcbiAgICBcImFsdCtiXCI6IFwiZ29Xb3JkTGVmdFwiLFxuICAgIFwiYWx0K2ZcIjogXCJnb1dvcmRSaWdodFwiLFxuICAgIFwiYWx0K2hcIjogXCJkZWxXb3JkQmVmb3JlXCIsXG4gICAgXCJhbHQrZFwiOiBcImRlbFdvcmRBZnRlclwiLFxuICAgIFwibW9kK21cIjogXCJtYXJrXCIsXG4gICAgXCJtb2QrZFwiOiBcInNlbGVjdFdvcmRcIixcbiAgICBcIm1vZCtsXCI6IFwic2VsZWN0TGluZVwiLFxuICAgIFwibW9kK3NoaWZ0K2xcIjogXCJzcGxpdEludG9MaW5lc1wiLFxuICB9XG4gIF8uZWFjaChrZXltYXAsIGZ1bmN0aW9uKGNvbW1hbmQsIGtleSkge1xuICAgIE1vdXNldHJhcChpbnB1dCkuYmluZChrZXksIGZ1bmN0aW9uKCkge1xuICAgICAgY20uZXhlY0NvbW1hbmQoY29tbWFuZClcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pXG4gIH0pXG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVNaXJyb3JcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5kZWZpbmVJbml0SG9vayhmdW5jdGlvbihjbSkge1xuICBjbS5tYXJrcyA9IFtdXG59KVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLm1hcmsgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgY3Vyc29yID0gY20uZ2V0Q3Vyc29yKClcbiAgaWYgKGNtLm1hcmtzLmxlbmd0aCkge1xuICAgIHZhciBsYXN0ID0gY20ubWFya3NbY20ubWFya3MubGVuZ3RoIC0gMV1cbiAgICBpZiAobGFzdC5saW5lID09IGN1cnNvci5saW5lICYmIGxhc3QuY2ggPT0gY3Vyc29yLmNoKSB7XG4gICAgICBjbS5zZXRTZWxlY3Rpb25zKGNtLm1hcmtzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHJldHVybiB7aGVhZDogbSwgYW5jaG9yOiBtfVxuICAgICAgfSksIGNtLm1hcmtzLmxlbmd0aCAtIDEpXG4gICAgICBjbS5tYXJrcyA9IFtdXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgY20ubWFya3MucHVzaChjdXJzb3IpXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0TGluZSA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9LFxuICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgbGluZTogaS5hbmNob3IubGluZSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIClcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zZWxlY3RXb3JkID0gZnVuY3Rpb24oY20pIHtcbiAgY20uc2V0U2VsZWN0aW9ucyhcbiAgICBjbS5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gY20uZmluZFdvcmRBdChpLmFuY2hvcilcbiAgICB9KVxuICApXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc3BsaXRJbnRvTGluZXMgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGNtLmxpc3RTZWxlY3Rpb25zKClcbiAgaWYgKHNlbGVjdGlvbnMubGVuZ3RoICE9IDEpIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gICAgcmV0dXJuXG4gIH1cbiAgdmFyIGFuY2hvciA9IHNlbGVjdGlvbnNbMF0uYW5jaG9yXG4gIHZhciBoZWFkID0gc2VsZWN0aW9uc1swXS5oZWFkXG4gIHZhciBuZXdfc2VsZWN0aW9ucyA9IFtdXG4gIGZvciAodmFyIGkgPSBhbmNob3IubGluZTsgaSA8PSBoZWFkLmxpbmU7ICsraSkge1xuICAgIG5ld19zZWxlY3Rpb25zLnB1c2goe1xuICAgICAgYW5jaG9yOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGFuY2hvci5saW5lID8gYW5jaG9yLmNoIDogMCxcbiAgICAgIH0sXG4gICAgICBoZWFkOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGhlYWQubGluZSA/IGhlYWQuY2ggOiBJbmZpbml0eSxcbiAgICAgIH0sXG4gICAgfSlcbiAgfVxuICBjbS5zZXRTZWxlY3Rpb25zKG5ld19zZWxlY3Rpb25zKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmRlZmluZVNpbXBsZU1vZGUoXCJ0ZXh0XCIsIHtcbiAgc3RhcnQ6IFtdLFxuICBjb21tZW50OiBbXSxcbiAgbWV0YToge30sXG59KVxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG5cbnZhciBvcGVuID0gZnVuY3Rpb24oY29udGVudCkge1xuICB2YXIgY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICBiYWNrZHJvcC5yZW1vdmUoKVxuICB9XG4gIHJldHVybiBjbG9zZVxufVxuXG52YXIgdmlldyA9IGZ1bmN0aW9uKGNvbnRlbnQsIGNsYXNzX25hbWUpIHtcbiAgdmFyIGJhY2tkcm9wID0gJCgnPGRpdiBjbGFzcz1cImJhY2tkcm9wXCI+JykuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgdmFyIGRpYWxvZyA9ICQoJzxkaXYgY2xhc3M9XCJkaWFsb2dcIj4nKS5hcHBlbmRUbyhiYWNrZHJvcClcbiAgZGlhbG9nLmFkZENsYXNzKGNsYXNzX25hbWUpXG4gIGRpYWxvZy5hcHBlbmQoY29udGVudClcbiAgcmV0dXJuIGJhY2tkcm9wXG59XG5cbm1vZHVsZS5leHBvcnRzLnZpZXcgPSB2aWV3XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciBFZGl0b3JWaWV3ID0gcmVxdWlyZShcIi4vZWRpdG9yLXZpZXdcIilcblxudmFyIEVkaXRvck1hbmFnZXJWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIGVkaXRvcl9tZ3IpIHtcbiAgdmFyIGVkaXRvcnMgPSB7fVxuICB2YXIgJHRhYnMgPSAkKFwiPGRpdj5cIikuYXR0cihcImlkXCIsIFwiZmlsZXNcIikuYXBwZW5kVG8oJHJvb3QpXG4gIHZhciAkZWRpdG9ycyA9ICQoXCI8ZGl2PlwiKS5hdHRyKFwiaWRcIiwgXCJlZGl0b3JzXCIpLmFwcGVuZFRvKCRyb290KVxuICBcbiAgZWRpdG9yX21nci5vcGVuZWQuYWRkKGZ1bmN0aW9uKGVkaXRvcikge1xuICAgIHZhciBwYXRoID0gZWRpdG9yLmdldFBhdGgoKVxuICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIilcbiAgICB2YXIgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKVxuICAgIHZhciAkdGFiID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpclwiKS50ZXh0KGRpciksXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICApLmFwcGVuZFRvKCR0YWJzKVxuICAgIC8vIHN0YXR1cyBpbiB0YWJcbiAgICBlZGl0b3Iuc3RhdHVzLm9ic2VydmUoZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgICAkdGFiLmZpbmQoXCIuc3RhdHVzXCIpLnJlbW92ZUNsYXNzKFwiY2xlYW4gZXJyb3IgbW9kaWZpZWRcIikuYWRkQ2xhc3Moc3RhdHVzKVxuICAgIH0pXG4gICAgLy8gZWRpdG9yIHZpZXdcbiAgICB2YXIgJGVkaXRvciA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImVkaXRvclwiKS5hcHBlbmRUbygkZWRpdG9ycylcbiAgICB2YXIgZWRpdG9yX3ZpZXcgPSBFZGl0b3JWaWV3KCRlZGl0b3IsIGVkaXRvciwgZWRpdG9yX21ncilcbiAgICBcbiAgICBlZGl0b3JzW3BhdGhdID0ge1xuICAgICAgJHRhYjogJHRhYixcbiAgICAgICRlZGl0b3I6ICRlZGl0b3IsXG4gICAgfVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5jbG9zZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBlZGl0b3JzW3BhdGhdLiR0YWIucmVtb3ZlKClcbiAgICBlZGl0b3JzW3BhdGhdLiRlZGl0b3IucmVtb3ZlKClcbiAgICBkZWxldGUgZWRpdG9yc1twYXRoXVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAkdGFicy5maW5kKFwiLmZpbGUtaXRlbS5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGVkaXRvcnNbcGF0aF0uJHRhYi5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICB9KVxuICBcbiAgJHRhYnMub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIHZhciAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG4gICAgdmFyIHBhdGggPSBfLmZpbmRLZXkoZWRpdG9ycywgZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGkuJHRhYi5pcygkdGFyZ2V0KVxuICAgIH0pXG4gICAgZWRpdG9yX21nci5hY3RpdmF0ZShwYXRoKVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvck1hbmFnZXJWaWV3XG4iLCJ2YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRmlsZSA9IHJlcXVpcmUoXCIuL2ZpbGVcIilcbnZhciBFZGl0b3IgPSByZXF1aXJlKFwiLi9lZGl0b3JcIilcblxudmFyIEVkaXRvck1hbmFnZXIgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIG9wZW5lZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgY2xvc2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBhY3RpdmF0ZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGFjdGl2ZTogbnVsbCwgLy8gcGF0aCBvZiBhY3RpdmUgZmlsZVxuICAgIGVkaXRvcnM6IFtdLFxuICAgIFxuICAgIGdldEZpbGVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5lZGl0b3JzLm1hcChmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgICAgcmV0dXJuIGVkaXRvci5nZXRQYXRoKClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBvcGVuOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBcIlRoZSBwYXRoIGlzIG51bGxcIlxuICAgICAgfVxuICAgICAgLy8gdHJ5IHRvIGFjdGl2YXRlIGFscmVhZHkgb3BlbmVkIGZpbGVzXG4gICAgICBpZiAobW9kZWwuYWN0aXZhdGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgZWRpdG9yID0gRWRpdG9yKEZpbGUocGF0aCkpXG4gICAgICBlZGl0b3IubG9hZCgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGVsLmVkaXRvcnMucHVzaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLm9wZW5lZC5kaXNwYXRjaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLmFjdGl2YXRlKHBhdGgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgZ2V0QWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5hY3RpdmVcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgICBpZiAocGF0aCAhPT0gbnVsbCAmJiBtb2RlbC5pbmRleE9mKHBhdGgpID09IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZlID0gcGF0aFxuICAgICAgbW9kZWwuYWN0aXZhdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICBmaW5kZXIuc2V0UGF0aChwYXRoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFxuICAgIG5leHRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUodHJ1ZSlcbiAgICB9LFxuICAgIFxuICAgIHByZXZGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUoZmFsc2UpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGVGaWxlOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuZWRpdG9ycy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHhcbiAgICAgIGlmIChtb2RlbC5hY3RpdmUgPT09IG51bGwpIHtcbiAgICAgICAgaWR4ID0gbmV4dCA/IDAgOiBtb2RlbC5lZGl0b3JzLmxlbmd0aCAtIDFcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZHggPSBtb2RlbC5pbmRleE9mKG1vZGVsLmFjdGl2ZSlcbiAgICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICAgIGlkeCA9IChpZHggKyBtb2RlbC5lZGl0b3JzLmxlbmd0aCkgJSBtb2RlbC5lZGl0b3JzLmxlbmd0aFxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZhdGUobW9kZWwuZWRpdG9yc1tpZHhdLmdldFBhdGgoKSlcbiAgICB9LFxuICAgIFxuICAgIGNsb3NlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaW5kZXhPZihwYXRoKVxuICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgaWYgKG1vZGVsLmVkaXRvcnMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBtb2RlbC5hY3RpdmF0ZShudWxsKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1vZGVsLnByZXZGaWxlKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbW9kZWwuZWRpdG9ycy5zcGxpY2UoaWR4LCAxKVxuICAgICAgbW9kZWwuY2xvc2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICByZWxvYWQ6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5vcGVuKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBpbmRleE9mOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZ2V0RmlsZXMoKS5pbmRleE9mKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnNlbGVjdGVkLmFkZChtb2RlbC5vcGVuKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yTWFuYWdlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCIuL2NvZGVtaXJyb3JcIilcbnZhciBTZWxlY3RFbmNvZGluZ0RpYWxvZ1ZpZXcgPSByZXF1aXJlKFwiLi9zZWxlY3QtZW5jb2RpbmctZGlhbG9nLXZpZXdcIilcblxudmFyIEVkaXRvclZpZXcgPSBmdW5jdGlvbigkcm9vdCwgZWRpdG9yLCBlZGl0b3JfbWdyKSB7XG4gIHZhciBmaWxlID0gZWRpdG9yLmdldEZpbGUoKVxuICBcbiAgdmFyIGNtID0gQ29kZU1pcnJvcigkcm9vdFswXSwge1xuICAgIHZhbHVlOiBlZGl0b3IudGV4dC5nZXQoKSxcbiAgICBtb2RlOiBlZGl0b3IubW9kZS5nZXQoKSxcbiAgfSlcbiAgXG4gIC8vIGZvb3RlclxuICAkcm9vdC5hcHBlbmQoXG4gICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1lb2wgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxidXR0b24gY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmcgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgKVxuICApXG4gIFxuICBTZWxlY3RFbmNvZGluZ0RpYWxvZ1ZpZXcoXG4gICAgZWRpdG9yLnNlbGVjdF9lbmNvZGluZ19kaWFsb2dcbiAgKVxuICBcbiAgLy8gc2F2ZVxuICB2YXIgbGFzdF9nZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBnZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICAgIGVkaXRvci5zYXZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGxhc3RfZ2VuZXJhdGlvbiA9IGdlbmVyYXRpb25cbiAgICB9KVxuICB9XG4gIGNtLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IudGV4dC5zZXQoY20uZ2V0VmFsdWUoKSlcbiAgICBlZGl0b3Iuc3RhdHVzLnNldChcbiAgICAgIGNtLmlzQ2xlYW4obGFzdF9nZW5lcmF0aW9uKSA/IFwiY2xlYW5cIiA6IFwibW9kaWZpZWRcIlxuICAgIClcbiAgfSlcbiAgZWRpdG9yLnRleHQub2JzZXJ2ZShmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKHRleHQgIT0gY20uZ2V0VmFsdWUoKSkge1xuICAgICAgY20uc2V0VmFsdWUodGV4dClcbiAgICB9XG4gIH0pXG5cbiAgLy8gbW9kZVxuICB2YXIgdXBkYXRlTW9kZSA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICBjbS5zZXRPcHRpb24oXCJtb2RlXCIsIG1vZGUpXG4gICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKVxuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlKVxuICB9XG4gIGVkaXRvci5tb2RlLm9ic2VydmUodXBkYXRlTW9kZSlcbiAgdXBkYXRlTW9kZShlZGl0b3IubW9kZS5nZXQoKSlcbiAgXG4gIC8vIGluZGVudFxuICB2YXIgdXBkYXRlSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpXG4gICAgaWYgKHR5cGUgPT0gXCJUQUJcIikge1xuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjbS5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCBmYWxzZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgTnVtYmVyKHR5cGUucmVwbGFjZShcIlNQXCIsIFwiXCIpKSlcbiAgICB9XG4gIH1cbiAgZWRpdG9yLmluZGVudC5vYnNlcnZlKHVwZGF0ZUluZGVudClcbiAgdXBkYXRlSW5kZW50KGVkaXRvci5pbmRlbnQuZ2V0KCkpXG4gICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IuaW5kZW50LnJvdGF0ZSgpXG4gIH0pXG4gIFxuICAvLyBsaW5lIHNlcHJhdG9yXG4gIHZhciB1cGRhdGVFb2wgPSBmdW5jdGlvbihlb2wpIHtcbiAgICB2YXIgbmFtZXMgPSB7XG4gICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICBcIlxcblwiOiBcIkxGXCIsXG4gICAgICBcIlxcclxcblwiOiBcIkNSTEZcIixcbiAgICB9XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQobmFtZXNbZW9sXSlcbiAgfVxuICBmaWxlLmVvbC5vYnNlcnZlKHVwZGF0ZUVvbClcbiAgdXBkYXRlRW9sKGZpbGUuZW9sLmdldCgpKVxuICAkcm9vdC5maW5kKFwiLmVkaXRvci1lb2xcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgZmlsZS5lb2wucm90YXRlKClcbiAgfSlcbiAgXG4gIC8vIGVuY29kaW5nXG4gIHZhciB1cGRhdGVFbmNvZGluZyA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZylcbiAgfVxuICBmaWxlLmVuY29kaW5nLmFkZCh1cGRhdGVFbmNvZGluZylcbiAgdXBkYXRlRW5jb2RpbmcoZmlsZS5lbmNvZGluZy5nZXQoKSlcbiAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yLnNlbGVjdF9lbmNvZGluZ19kaWFsb2cuc2hvdyhcbiAgICAgIGZpbGUuZW5jb2RpbmcuZ2V0KClcbiAgICApXG4gIH0pXG4gIGVkaXRvci5zZWxlY3RfZW5jb2RpbmdfZGlhbG9nLmNvbmZpcm1lZC5hZGQoZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICBmaWxlLmVuY29kaW5nLnNldChlbmNvZGluZylcbiAgfSlcbiAgXG4gIC8vIG1lc3NhZ2VcbiAgZWRpdG9yLm1lc3NhZ2Uub2JzZXJ2ZShmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KG1lc3NhZ2UpXG4gIH0pXG4gIFxuICAvLyBhY3RpdmVcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKGFjdGl2ZSkge1xuICAgIGlmIChhY3RpdmUgPT0gZmlsZS5nZXRQYXRoKCkpIHtcbiAgICAgICRyb290LmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBjbS5mb2N1cygpXG4gICAgICBjbS5yZWZyZXNoKClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkcm9vdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH1cbiAgfSlcbiAgXG4gIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgTW91c2V0cmFwKCRyb290WzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2F2ZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcIi4vY29kZW1pcnJvclwiKVxudmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudFwiKVxudmFyIFNlbGVjdEVuY29kaW5nRGlhbG9nID0gcmVxdWlyZShcIi4vc2VsZWN0LWVuY29kaW5nLWRpYWxvZ1wiKVxuXG52YXIgRWRpdG9yID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgZWRpdG9yID0ge1xuICAgIHRleHQ6IE9ic2VydmFibGUoXCJcIiksXG4gICAgc3RhdHVzOiBPYnNlcnZhYmxlKFwiY2xlYW5cIiksXG4gICAgbW9kZTogT2JzZXJ2YWJsZShcInRleHRcIiksXG4gICAgaW5kZW50OiBJbmRlbnQoKSxcbiAgICBtZXNzYWdlOiBPYnNlcnZhYmxlKFwiXCIpLFxuICAgIHNlbGVjdF9lbmNvZGluZ19kaWFsb2c6IFNlbGVjdEVuY29kaW5nRGlhbG9nKCksXG4gICAgXG4gICAgZ2V0RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZS5nZXRQYXRoKClcbiAgICB9LFxuICAgIFxuICAgIGxvYWQ6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgIHJldHVybiBmaWxlLnJlYWQoKS50aGVuKGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgZWRpdG9yLmluZGVudC5zZXQoSW5kZW50LmRldGVjdEluZGVudFR5cGUodGV4dCkpXG4gICAgICAgIGVkaXRvci50ZXh0LnNldCh0ZXh0KVxuICAgICAgICBlZGl0b3IubWVzc2FnZS5zZXQoXCJMb2FkZWQuXCIpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2F2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmlsZS53cml0ZShlZGl0b3IudGV4dC5nZXQoKSkuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiU2F2ZSBmYWlsZWQuIFwiICsgcmVwbHkuZXJyb3IpXG4gICAgICAgIGVkaXRvci5zdGF0dXMuc2V0KFwiZXJyb3JcIilcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGVkaXRvci5zdGF0dXMuc2V0KFwiY2xlYW5cIilcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiU2F2ZWQuXCIpXG4gICAgICB9KVxuICAgIH0sXG4gIH1cbiAgXG4gIHZhciBkZXRlY3RNb2RlID0gKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gcGF0aC5yZXBsYWNlKC8uKlsuXSguKykkLywgXCIkMVwiKVxuICAgIHZhciBtb2RlID0ge1xuICAgICAgaHRtbDogXCJwaHBcIixcbiAgICAgIHRhZzogXCJwaHBcIixcbiAgICB9W2V4dGVuc2lvbl1cbiAgICBpZiAobW9kZSkge1xuICAgICAgcmV0dXJuIG1vZGVcbiAgICB9XG4gICAgbW9kZSA9IENvZGVNaXJyb3IuZmluZE1vZGVCeUV4dGVuc2lvbihleHRlbnNpb24pXG4gICAgaWYgKG1vZGUpIHtcbiAgICAgIHJldHVybiBtb2RlLm1vZGVcbiAgICB9XG4gICAgcmV0dXJuIFwidGV4dFwiXG4gIH0pXG4gIGVkaXRvci5tb2RlLnNldChkZXRlY3RNb2RlKGZpbGUuZ2V0UGF0aCgpKSlcbiAgXG4gIC8vIGF1dG8gc2F2ZVxuICBlZGl0b3IudGV4dC5vYnNlcnZlKF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgaWYgKGVkaXRvci5zdGF0dXMuZ2V0KCkgIT0gXCJjbGVhblwiKSB7XG4gICAgICBlZGl0b3Iuc2F2ZSgpXG4gICAgfVxuICB9LCA0MDAwKSlcbiAgXG4gIHJldHVybiBlZGl0b3Jcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JcbiIsInZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGVcIilcblxudmFyIEVvbCA9IGZ1bmN0aW9uKGVvbCkge1xuICByZXR1cm4gUm90YXRlKFtcIlxcblwiLCBcIlxcclxcblwiLCBcIlxcclwiXSwgZW9sKVxufVxuXG5Fb2wuZGV0ZWN0ID0gZnVuY3Rpb24odGV4dCkge1xuICBpZiAodGV4dC5tYXRjaChcIlxcclxcblwiKSkge1xuICAgIHJldHVybiBcIlxcclxcblwiXG4gIH1cbiAgaWYgKHRleHQubWF0Y2goXCJcXHJcIikpIHtcbiAgICByZXR1cm4gXCJcXHJcIlxuICB9XG4gIHJldHVybiBcIlxcblwiXG59XG5cbkVvbC5yZWd1bGF0ZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvKFxcclxcbnxcXHIpLywgXCJcXG5cIilcbn0sXG5cbm1vZHVsZS5leHBvcnRzID0gRW9sXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxudmFyIEVvbCA9IHJlcXVpcmUoXCIuL2VvbFwiKVxuXG52YXIgRmlsZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGZpbGUgPSB7XG4gICAgZW9sOiBFb2woKSxcbiAgICBlbmNvZGluZzogT2JzZXJ2YWJsZSgpLFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBhdGhcbiAgICB9LFxuICAgIFxuICAgIHJlYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgICAgdXJsOiBcIi9yZWFkLnBocFwiLFxuICAgICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgICAgfSkuZmFpbChyZWplY3QpLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICBmaWxlLmVuY29kaW5nLnNldChyZXBseS5lbmNvZGluZylcbiAgICAgICAgICBmaWxlLmVvbC5zZXQoRW9sLmRldGVjdChyZXBseS5jb250ZW50KSlcbiAgICAgICAgICB2YXIgY29udGVudCA9IEVvbC5yZWd1bGF0ZShyZXBseS5jb250ZW50KVxuICAgICAgICAgIHJlc29sdmUoY29udGVudClcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB3cml0ZTogZnVuY3Rpb24odGV4dCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogXCIvd3JpdGUucGhwXCIsXG4gICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICBlbmNvZGluZzogZmlsZS5lbmNvZGluZy5nZXQoKSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IHRleHQucmVwbGFjZSgvXFxuL2csIGZpbGUuZW9sLmdldCgpKVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgICAgaWYgKHJlcGx5ID09IFwib2tcIikge1xuICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHJlcGx5LmVycm9yKVxuICAgICAgICAgIH1cbiAgICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZWplY3QoXCJcIilcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSxcbiAgfVxuICByZXR1cm4gZmlsZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxuXG52YXIgRmluZGVyU3VnZ2VzdFZpZXcgPSBmdW5jdGlvbigkcm9vdCwgbW9kZWwpIHtcbiAgdmFyICRsaXN0ID0gJHJvb3RcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHVwZGF0ZUl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgJGxpc3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIikuZW1wdHkoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxICYmIGl0ZW1zWzBdID09IG1vZGVsLmdldEN1cnNvcigpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIG5hbWVfcnggPSBuZXcgUmVnRXhwKFwiLyhbXi9dKi8/KSRcIilcbiAgICAgICRsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVfcnguZXhlYyhpdGVtKVsxXVxuICAgICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgICB9KSlcbiAgICAgICRsaXN0LnNjcm9sbFRvcCgwKS5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkbGlzdC5maW5kKFwiYS5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpXG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBhID0gJGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gICAgICB9KVxuICAgICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcblxuICAgICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KClcbiAgICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgICAgdmFyIHZpZXdfaGVpZ2h0ID0gJGxpc3QuaW5uZXJIZWlnaHQoKVxuICAgICAgICBpZiAodG9wIC0gJGxpc3Quc2Nyb2xsVG9wKCkgPCAwKSB7XG4gICAgICAgICAgJGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm90dG9tIC0gJGxpc3Quc2Nyb2xsVG9wKCkgPiB2aWV3X2hlaWdodCkge1xuICAgICAgICAgICRsaXN0LnNjcm9sbFRvcChib3R0b20gLSB2aWV3X2hlaWdodClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2Nyb2xsSW50b1ZpZXcoYSlcbiAgICB9XG4gIH1cbiAgXG4gIG1vZGVsLml0ZW1zX2NoYW5nZWQuYWRkKHZpZXcudXBkYXRlSXRlbXMpXG4gIG1vZGVsLmN1cnNvcl9tb3ZlZC5hZGQodmlldy51cGRhdGVDdXJzb3IpXG4gIFxuICAvLyB3aGVuIGl0ZW0gd2FzIHNlbGVjdGVkXG4gICRsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIFxuICAvLyBwcmV2ZW50IGZyb20gbG9vc2luZyBmb2N1c1xuICAkbGlzdC5vbihcIm1vdXNlZG93blwiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICB9KVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0Vmlld1xuIiwidmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBGaW5kZXJTdWdnZXN0ID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBpdGVtczogW10sXG4gICAgY3Vyc29yOiBudWxsLCAvLyBoaWdobGlnaHRlZCBpdGVtXG4gICAgXG4gICAgaXRlbXNfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIGN1cnNvcl9tb3ZlZDogbmV3IFNpZ25hbCgpLFxuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICB1cmw6IFwiL2ZpbmRlci5waHBcIixcbiAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZmFpbGVkIHRvIGZldGNoIHN1Z2dlc3QgZm9yIHRoZSBwYXRoOiBcIiArIHBhdGgpXG4gICAgICB9KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgIG1vZGVsLnNldEl0ZW1zKHJlcGx5Lml0ZW1zLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlcGx5LmJhc2UgKyBpXG4gICAgICAgIH0pKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHNldEl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG51bGwpXG4gICAgICBtb2RlbC5pdGVtcyA9IGl0ZW1zXG4gICAgICBtb2RlbC5pdGVtc19jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLml0ZW1zKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLml0ZW1zXG4gICAgfSxcbiAgICBcbiAgICBnZXRDdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmN1cnNvclxuICAgIH0sXG4gICAgXG4gICAgc2V0Q3Vyc29yOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuY3Vyc29yKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuY3Vyc29yID0gcGF0aFxuICAgICAgbW9kZWwuY3Vyc29yX21vdmVkLmRpc3BhdGNoKG1vZGVsLmN1cnNvcilcbiAgICB9LFxuICAgIFxuICAgIG1vdmVDdXJzb3I6IGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgIGlmIChtb2RlbC5jdXJzb3IgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKG1vZGVsLml0ZW1zLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zWzBdKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGlkeCA9IG1vZGVsLml0ZW1zLmluZGV4T2YobW9kZWwuY3Vyc29yKVxuICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICBpZHggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb2RlbC5pdGVtcy5sZW5ndGggLSAxLCBpZHgpKVxuICAgICAgbW9kZWwuc2V0Q3Vyc29yKG1vZGVsLml0ZW1zW2lkeF0pXG4gICAgfSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihwYXRoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICB9XG4gIFxuICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIG1vZGVsLnVwZGF0ZShmaW5kZXIuZ2V0UGF0aCgpKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKF8uZGVib3VuY2UobW9kZWwudXBkYXRlLCAyNTApKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIEZhbHNlID0gcmVxdWlyZShcIi4vcmV0dXJuLWZhbHNlXCIpXG52YXIgSW5wdXRXYXRjaGVyID0gcmVxdWlyZShcIi4vaW5wdXQtd2F0Y2hlclwiKVxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3Qtdmlld1wiKVxuXG52YXIgRmluZGVyVmlldyA9IGZ1bmN0aW9uKCRyb290LCBmaW5kZXIpIHtcbiAgdmFyICRwYXRoX2lucHV0ID0gJChcbiAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJmaW5kZXItcGF0aFwiIGNsYXNzPVwibW91c2V0cmFwXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCIgdmFsdWU9XCIvXCI+J1xuICApLmFwcGVuZFRvKCRyb290KVxuICBcbiAgdmFyIHBhdGhfd2F0Y2hlciA9IElucHV0V2F0Y2hlcigkcGF0aF9pbnB1dCwgNTApXG4gIHBhdGhfd2F0Y2hlci5jaGFuZ2VkLmFkZChmaW5kZXIuc2V0UGF0aClcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgJHJvb3QuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgICRwYXRoX2lucHV0LmZvY3VzKClcbiAgICAgIHBhdGhfd2F0Y2hlci5zdGFydCgpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICRyb290LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RvcCgpXG4gICAgfSxcbiAgfVxuICBcbiAgLy8gaGlkZSBvbiBibHVyXG4gICRwYXRoX2lucHV0LmJsdXIoZmluZGVyLmhpZGUoKSlcbiAgXG4gIGZpbmRlci52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgdmlldy5zaG93KClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2aWV3LmhpZGUoKVxuICAgIH1cbiAgfSlcbiAgXG4gIGZpbmRlci5wYXRoX2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAkcGF0aF9pbnB1dC52YWwocGF0aClcbiAgfSlcbiAgXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcImVudGVyXCIsIEZhbHNlKGZpbmRlci5lbnRlcikpXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcInRhYlwiLCBGYWxzZShmaW5kZXIudGFiKSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwiZXNjXCIsIEZhbHNlKGZpbmRlci5oaWRlKSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwiZG93blwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc3VnZ2VzdC5tb3ZlQ3Vyc29yKHRydWUpXG4gIH0pKVxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ1cFwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc3VnZ2VzdC5tb3ZlQ3Vyc29yKGZhbHNlKVxuICB9KSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwibW9kK3VcIiwgRmFsc2UoXG4gICAgZmluZGVyLmdvVG9QYXJlbnREaXJlY3RvcnlcbiAgKSlcbiAgXG4gIC8vIHN1Z2dlc3Qgdmlld1xuICB2YXIgJGl0ZW1zID0gJCgnPGRpdiBpZD1cImZpbmRlci1pdGVtc1wiPicpLmFwcGVuZFRvKCRyb290KVxuICBGaW5kZXJTdWdnZXN0VmlldygkaXRlbXMsIGZpbmRlci5zdWdnZXN0KVxuICBcbiAgcmV0dXJuIHZpZXdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJWaWV3XG4iLCJ2YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgRmluZGVyU3VnZ2VzdCA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0XCIpXG5cbnZhciBGaW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIHNlbGVjdGVkOiBuZXcgU2lnbmFsKCksXG4gICAgcGF0aF9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgdmlzaWJpbGl0eV9jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgcGF0aDogXCJcIixcbiAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICBcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgocGF0aClcbiAgICAgIGlmIChwYXRoLnN1YnN0cigtMSkgPT0gXCIvXCIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5oaWRlKClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSB0cnVlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IGZhbHNlXG4gICAgICBtb2RlbC52aXNpYmlsaXR5X2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwudmlzaWJsZSlcbi8vICAgICAgIGVkaXRvcl9tYW5hZ2VyLmFjdGl2YXRlKGVkaXRvcl9tYW5hZ2VyLmdldEFjdGl2ZSgpKVxuICAgIH0sXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwucGF0aFxuICAgIH0sXG4gICAgXG4gICAgc2V0UGF0aDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwucGF0aCA9IHBhdGhcbiAgICAgIG1vZGVsLnBhdGhfY2hhbmdlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgZ29Ub1BhcmVudERpcmVjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKFxuICAgICAgICBtb2RlbC5wYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10qLz8kXCIpLCBcIlwiKVxuICAgICAgKVxuICAgIH0sXG4gICAgXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhdGggPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBtb2RlbC5zZWxlY3QocGF0aCA/IHBhdGggOiBtb2RlbC5wYXRoKVxuICAgIH0sXG4gICAgXG4gICAgdGFiOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSBzdWdnZXN0LmdldEN1cnNvcigpXG4gICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoY3Vyc29yKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpdGVtcyA9IHN1Z2dlc3QuZ2V0SXRlbXMoKVxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIG1vZGVsLnNldFBhdGgoaXRlbXNbMF0pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgc3VnZ2VzdC51cGRhdGUobW9kZWwucGF0aClcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgc3VnZ2VzdCA9IG1vZGVsLnN1Z2dlc3QgPSBGaW5kZXJTdWdnZXN0KG1vZGVsKVxuICBzdWdnZXN0LnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwuc2VsZWN0KHBhdGgpXG4gIH0pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJcbiIsInZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGVcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCI0U1BcIiwgXCIyU1BcIiwgXCJUQUJcIl0sIHR5cGUpXG59XG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBJbnB1dFdhdGNoZXIgPSBmdW5jdGlvbihpbnB1dCwgaW50ZXJ2YWwpIHtcbiAgaW5wdXQgPSAkKGlucHV0KVxuICBcbiAgdmFyIG1vZGVsID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBpbnB1dDogaW5wdXQsXG4gICAgaW50ZXJ2YWw6IGludGVydmFsLFxuICAgIGxhc3RfdmFsdWU6IGlucHV0LnZhbCgpLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIFxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnN0b3AoKVxuICAgICAgbW9kZWwudGltZXIgPSBzZXRJbnRlcnZhbChtb2RlbC5jaGVjaywgbW9kZWwuaW50ZXJ2YWwpXG4gICAgfSxcbiAgICBcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwobW9kZWwudGltZXIpXG4gICAgICBtb2RlbC50aW1lciA9IG51bGxcbiAgICB9LFxuICAgIFxuICAgIGNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbW9kZWwuaW5wdXQudmFsKClcbiAgICAgIGlmIChjdXJyZW50ID09IG1vZGVsLmxhc3RfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jaGFuZ2VkLmRpc3BhdGNoKGN1cnJlbnQsIG1vZGVsLmxhc3RfdmFsdWUpXG4gICAgICBtb2RlbC5sYXN0X3ZhbHVlID0gY3VycmVudFxuICAgIH0sXG4gICAgXG4gICAga2V5RG93bjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAobW9kZWwudGltZXIpIHtcbiAgICAgICAgbW9kZWwuY2hlY2soKVxuICAgICAgfVxuICAgIH0sXG4gIH1cbiAgXG4gIGlucHV0LmtleWRvd24obW9kZWwua2V5RG93bilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0V2F0Y2hlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgRWRpdG9yTWFuYWdlclZpZXcgPSByZXF1aXJlKFwiLi9lZGl0b3ItbWFuYWdlci12aWV3XCIpXG52YXIgRmluZGVyVmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci12aWV3XCIpXG5cbnZhciBNYWluVmlldyA9IGZ1bmN0aW9uKGVkaXRvcl9tZ3IsIGZpbmRlcikge1xuICB2YXIgJG1haW4gPSAkKFwibWFpblwiKVxuICBFZGl0b3JNYW5hZ2VyVmlldyhcbiAgICAkKCc8ZGl2IGlkPVwiZWRpdG9yX21hbmFnZXJcIj4nKS5hcHBlbmRUbygkbWFpbiksXG4gICAgZWRpdG9yX21nclxuICApXG4gIEZpbmRlclZpZXcoXG4gICAgJCgnPGZvcm0gaWQ9XCJmaW5kZXJcIj4nKS5hcHBlbmRUbygkbWFpbiksXG4gICAgZmluZGVyXG4gIClcbiAgXG4gIC8vIHNob3J0Y3V0IGtleXNcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kKztcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5uZXh0RmlsZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrc2hpZnQrO1wiLCBcIm1vZCtzaGlmdCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IuY2xvc2UoZWRpdG9yX21nci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnJlbG9hZChlZGl0b3JfbWdyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNYWluVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBvYnNlcnZhYmxlID0gbmV3IFNpZ25hbCgpXG4gIE9iamVjdC5hc3NpZ24ob2JzZXJ2YWJsZSwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUgPT09IG5ld192YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBvbGRfdmFsdWUgPSB2YWx1ZVxuICAgICAgdmFsdWUgPSBuZXdfdmFsdWVcbiAgICAgIG9ic2VydmFibGUuZGlzcGF0Y2godmFsdWUsIG9sZF92YWx1ZSwgb2JzZXJ2YWJsZSlcbiAgICB9LFxuICAgIG9ic2VydmU6IG9ic2VydmFibGUuYWRkLCAvLyBhbGlhc1xuICB9KVxuICByZXR1cm4gb2JzZXJ2YWJsZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9ic2VydmFibGVcbiIsInZhciByZXR1cm5GYWxzZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmV0dXJuRmFsc2VcbiIsInZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxuXG52YXIgUm90YXRlID0gZnVuY3Rpb24odmFsdWVzLCB2YWx1ZSkge1xuICB2YXIgaXNWYWxpZFZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZXMuaW5kZXhPZih2KSAhPSAtMVxuICB9XG4gIFxuICB2YXIgY2hlY2tWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoIWlzVmFsaWRWYWx1ZSh2KSkge1xuICAgICAgdGhyb3cgXCJpbnZhbGlkIHZhbHVlOiBcIiArIHZcbiAgICB9XG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSBPYnNlcnZhYmxlKHZhbHVlKVxuICBcbiAgcm90YXRlLmdldFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB2YWx1ZXNcbiAgfVxuICBcbiAgdmFyIF9zZXQgPSByb3RhdGUuc2V0XG4gIHJvdGF0ZS5zZXQgPSBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICBjaGVja1ZhbHVlKG5ld192YWx1ZSlcbiAgICBfc2V0KG5ld192YWx1ZSlcbiAgfVxuICBcbiAgcm90YXRlLnJvdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpZHggPSB2YWx1ZXMuaW5kZXhPZihyb3RhdGUuZ2V0KCkpXG4gICAgaWR4ID0gKGlkeCArIDEpICUgdmFsdWVzLmxlbmd0aFxuICAgIHJvdGF0ZS5zZXQodmFsdWVzW2lkeF0pXG4gIH1cbiAgXG4gIHJldHVybiByb3RhdGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSb3RhdGVcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIERpYWxvZyA9IHJlcXVpcmUoXCIuL2RpYWxvZ1wiKVxuXG52YXIgU2VsZWN0RW5jb2RpbmdEaWFsb2dWaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgdmFyICRjb250ZW50ID0gJCgnPGRpdj4nKS5hcHBlbmQoXG4gICAgJCgnPHNlbGVjdCBzaXplPVwiNFwiPicpLFxuICAgICQoJzxidXR0b24gY2xhc3M9XCJva1wiPk9LPC9idXR0b24+JyksXG4gICAgJCgnPGJ1dHRvbiBjbGFzcz1cImNhbmNlbFwiPkNhbmNlbDwvYnV0dG9uPicpXG4gIClcbiAgXG4gIHZhciAkZGlhbG9nID0gRGlhbG9nLnZpZXcoJGNvbnRlbnQsIFwic2VsZWN0LWVuY29kaW5nLWRpYWxvZ1wiKVxuXG4gIHZhciAkc2VsZWN0ID0gJGNvbnRlbnQuZmluZChcInNlbGVjdFwiKVxuICAkc2VsZWN0LmFwcGVuZChtb2RlbC5vcHRpb25zLm1hcChmdW5jdGlvbihlbmNvZGluZykge1xuICAgIHJldHVybiAkKCc8b3B0aW9uPicpLnRleHQoZW5jb2RpbmcpXG4gIH0pKVxuICBtb2RlbC5lbmNvZGluZy5vYnNlcnZlKGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHNlbGVjdC52YWwoZW5jb2RpbmcpXG4gIH0pXG4gICRzZWxlY3QudmFsKG1vZGVsLmVuY29kaW5nLmdldCgpKVxuICAkc2VsZWN0LmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgIG1vZGVsLmVuY29kaW5nLnNldCgkc2VsZWN0LnZhbCgpKVxuICB9KVxuICBcbiAgLy8gb2tcbiAgJGNvbnRlbnQuZmluZChcImJ1dHRvbi5va1wiKS5jbGljayhtb2RlbC5jb25maXJtKVxuICBcbiAgLy8gY2FuY2VsXG4gICRjb250ZW50LmZpbmQoXCJidXR0b24uY2FuY2VsXCIpLmNsaWNrKG1vZGVsLmhpZGUpXG4gIFxuICBtb2RlbC52aXNpYmxlLm9ic2VydmUoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAkZGlhbG9nLmFkZENsYXNzKFwidmlzaWJsZVwiKVxuICAgICAgJGNvbnRlbnQuZmluZChcImlucHV0LCBzZWxlY3RcIikuZm9jdXMoKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICRkaWFsb2cucmVtb3ZlQ2xhc3MoXCJ2aXNpYmxlXCIpXG4gICAgfVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdEVuY29kaW5nRGlhbG9nVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcblxudmFyIFNlbGVjdEVuY29kaW5nRGlhbG9nID0gZnVuY3Rpb24oKSB7XG4gIFxuICB2YXIgZGlhbG9nID0ge1xuICAgIHZpc2libGU6IE9ic2VydmFibGUoZmFsc2UpLFxuICAgIGVuY29kaW5nOiBPYnNlcnZhYmxlKCksXG4gICAgb3B0aW9uczogW1xuICAgICAgXCJVVEYtOFwiLFxuICAgICAgXCJFVUMtSlBcIixcbiAgICAgIFwiU0pJUy1XSU5cIixcbiAgICBdLFxuICAgIGNvbmZpcm1lZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIGNvbmZpcm06IGZ1bmN0aW9uKCkge1xuICAgICAgZGlhbG9nLnZpc2libGUuc2V0KGZhbHNlKVxuICAgICAgZGlhbG9nLmNvbmZpcm1lZC5kaXNwYXRjaChkaWFsb2cuZW5jb2RpbmcuZ2V0KCkpXG4gICAgfSxcbiAgICBcbiAgICBzaG93OiBmdW5jdGlvbihlbmNvZGluZykge1xuICAgICAgZGlhbG9nLmVuY29kaW5nLnNldChlbmNvZGluZylcbiAgICAgIGRpYWxvZy52aXNpYmxlLnNldCh0cnVlKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICBkaWFsb2cudmlzaWJsZS5zZXQoZmFsc2UpXG4gICAgfSxcbiAgfVxuICByZXR1cm4gZGlhbG9nXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0RW5jb2RpbmdEaWFsb2dcbiIsInZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG52YXIgRWRpdG9yTWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci1tYW5hZ2VyXCIpXG52YXIgRmluZGVyID0gcmVxdWlyZShcIi4vZmluZGVyXCIpXG52YXIgTWFpblZpZXcgPSByZXF1aXJlKFwiLi9tYWluLXZpZXdcIilcblxubW9kdWxlLmV4cG9ydHMucnVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmaW5kZXIgPSBGaW5kZXIoKVxuICB2YXIgZWRpdG9yX21nciA9IEVkaXRvck1hbmFnZXIoZmluZGVyKVxuICB2YXIgdmlldyA9IE1haW5WaWV3KGVkaXRvcl9tZ3IsIGZpbmRlcilcbiAgXG4gIHZhciBzYXZlRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmlsZXMgPSBlZGl0b3JfbWdyLmdldEZpbGVzKClcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm9wZW4tZmlsZXNcIiwgSlNPTi5zdHJpbmdpZnkoZmlsZXMpKVxuICB9XG4gIHZhciBsb2FkRmlsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm9wZW4tZmlsZXNcIikgfHwgXCJbXVwiKVxuICB9XG4gIGxvYWRGaWxlTGlzdCgpLmZvckVhY2goZnVuY3Rpb24ocGF0aCkge1xuICAgIGVkaXRvcl9tZ3Iub3BlbihwYXRoKVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5vcGVuZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgZWRpdG9yX21nci5jbG9zZWQuYWRkKHNhdmVGaWxlTGlzdClcbiAgXG4gIC8vIHNob3cgZmluZGVyXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtvXCIsIFwibW9kK3BcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zaG93KClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG59XG4iXX0=
