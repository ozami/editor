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
  if (marks.length) {
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

},{"./editor-view":10,"jquery":"jquery","underscore":"underscore"}],9:[function(require,module,exports){
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

},{"./editor":11,"./file":13,"signals":"signals","underscore":"underscore"}],10:[function(require,module,exports){
var $ = require("jquery")
var CodeMirror = require("./codemirror")

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
      $('<div class="editor-eol">'),
      $('<div class="editor-encoding">'),
      $('<div class="editor-mode">')
    )
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
  file.eol.add(updateEol)
  updateEol(file.eol.get())
  
  // encoding
  var updateEncoding = function(encoding) {
    $root.find(".editor-encoding").text(encoding)
  }
  file.encoding.add(updateEncoding)
  updateEncoding(file.encoding.get())
  
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

},{"./codemirror":2,"jquery":"jquery"}],11:[function(require,module,exports){
var $ = require("jquery")
var _ = require("underscore")
var Observable = require("./observable")
var CodeMirror = require("./codemirror")
var Indent = require("./indent")

var Editor = function(file) {
  var editor = {
    text: Observable(""),
    status: Observable("clean"),
    mode: Observable("text"),
    indent: Indent(),
    message: Observable(""),
    
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

},{"./codemirror":2,"./indent":18,"./observable":21,"jquery":"jquery","underscore":"underscore"}],12:[function(require,module,exports){
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

},{"./rotate":23}],13:[function(require,module,exports){
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

},{"./eol":12,"./observable":21,"jquery":"jquery"}],14:[function(require,module,exports){
var $ = require("jquery")

var FinderSuggestView = function(model) {
  var list = $("#finder-items")
  
  var view = {
    updateItems: function(items) {
      list.removeClass("active").empty()
      if (items.length == 0) {
        return
      }
      if (items.length == 1 && items[0] == model.getCursor()) {
        return
      }
      var name_rx = new RegExp("/([^/]*/?)$")
      list.append(items.map(function(item) {
        var name = name_rx.exec(item)[1]
        return $("<a>").text(name).data("path", item)
      }))
      list.scrollTop(0).addClass("active")
    },
    
    updateCursor: function(path) {
      list.find("a.selected").removeClass("selected")
      if (path === null) {
        return
      }
      var a = list.find("a").filter(function() {
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
        var view_height = list.innerHeight()
        if (top - list.scrollTop() < 0) {
          list.scrollTop(top)
        }
        if (bottom - list.scrollTop() > view_height) {
          list.scrollTop(bottom - view_height)
        }
      }
      scrollIntoView(a)
    }
  }
  
  model.items_changed.add(view.updateItems)
  model.cursor_moved.add(view.updateCursor)
  
  // when item was selected
  list.on("click", "a", function(e) {
    e.preventDefault()
    model.select($(e.target).data("path"))
  })
  
  // prevent from loosing focus
  list.on("mousedown", "a", function(e) {
    e.preventDefault()
  })
  
  return view
}

module.exports = FinderSuggestView

},{"jquery":"jquery"}],15:[function(require,module,exports){
var _ = require("underscore")
var $ = require("jquery")
var Signal = require("signals").Signal
var FinderSuggestView = require("./finder-suggest-view.js")

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
  
  var view = FinderSuggestView(model)
  
  return model
}

module.exports = FinderSuggest

},{"./finder-suggest-view.js":14,"jquery":"jquery","signals":"signals","underscore":"underscore"}],16:[function(require,module,exports){
var $ = require("jquery")
var Mousetrap = require("mousetrap")
var False = require("./return-false.js")
var InputWatcher = require("./input-watcher.js")

var FinderView = function(model, suggest) {
  var path_input = $("#finder-path").val("/")
  
  var path_watcher = InputWatcher(path_input, 50)
  path_watcher.changed.add(model.setPath)
  
  var view = {
    show: function() {
      $("#finder").addClass("active")
      path_input.focus()
      path_watcher.start()
    },
    
    hide: function() {
      $("#finder").removeClass("active")
      path_watcher.stop()
    },
  }
  
  // hide on blur
  path_input.blur(model.hide())
  
  model.visibility_changed.add(function(visible) {
    if (visible) {
      view.show()
    }
    else {
      view.hide()
    }
  })
  
  model.path_changed.add(function(path) {
    path_input.val(path)
  })
  
  Mousetrap(path_input[0]).bind("enter", False(model.enter))
  Mousetrap(path_input[0]).bind("tab", False(model.tab))
  Mousetrap(path_input[0]).bind("esc", False(model.hide))
  Mousetrap(path_input[0]).bind("down", False(function() {
    suggest.moveCursor(true)
  }))
  Mousetrap(path_input[0]).bind("up", False(function() {
    suggest.moveCursor(false)
  }))
  Mousetrap(path_input[0]).bind("mod+u", False(
    model.goToParentDirectory
  ))
  
  return view
}

module.exports = FinderView

},{"./input-watcher.js":19,"./return-false.js":22,"jquery":"jquery","mousetrap":"mousetrap"}],17:[function(require,module,exports){
var Signal = require("signals").Signal
var FinderView = require("./finder-view.js")
var FinderSuggest = require("./finder-suggest.js")

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
  
  var suggest = FinderSuggest(model)
  suggest.selected.add(function(path) {
    model.select(path)
  })
  
  var view = FinderView(model, suggest)
  
  return model
}

module.exports = Finder

},{"./finder-suggest.js":15,"./finder-view.js":16,"signals":"signals"}],18:[function(require,module,exports){
"use strict"

var Rotate = require("./rotate.js")

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

},{"./rotate.js":23}],19:[function(require,module,exports){
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

},{"jquery":"jquery","signals":"signals"}],20:[function(require,module,exports){
var $ = require("jquery")
var EditorManagerView = require("./editor-manager-view")

var MainView = function(editor_mgr) {
  var $main = $("main")
  var editor_mgr_view = EditorManagerView($main, editor_mgr)
}

module.exports = MainView

},{"./editor-manager-view":8,"jquery":"jquery"}],21:[function(require,module,exports){
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

},{"signals":"signals"}],22:[function(require,module,exports){
var returnFalse = function(func) {
  return function() {
    func.apply(this, arguments)
    return false
  }
}

module.exports = returnFalse

},{}],23:[function(require,module,exports){
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
    if (value === null) {
      return
    }
    var idx = values.indexOf(value)
    idx = (idx + 1) % values.length
    rotate.set(values[idx])
  }
  
  return rotate
}

module.exports = Rotate

},{"./observable":21}],"app":[function(require,module,exports){
var EditorManager = require("./editor-manager")
var MainView = require("./main-view")

module.exports.run = function() {
  var Mousetrap = require("mousetrap")
  var finder = require("./finder.js")()
  var editor_mgr = EditorManager(finder)
  var view = MainView(editor_mgr)
  
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
  
  // shortcut keys
  Mousetrap.bind(["mod+", "mod+="], function() {
    editor_mgr.nextFile()
    return false
  }, "keydown")
  Mousetrap.bind(["mod+shift+", "mod+shift+="], function() {
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
  // show finder
  Mousetrap.bind(["mod+o", "mod+p"], function() {
    finder.show()
    return false
  }, "keydown")
}

},{"./editor-manager":9,"./finder.js":17,"./main-view":20,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZWRpdG9yLW1hbmFnZXItdmlldy5qcyIsImpzL2VkaXRvci1tYW5hZ2VyLmpzIiwianMvZWRpdG9yLXZpZXcuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9lb2wuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3Qtdmlldy5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LmpzIiwianMvZmluZGVyLXZpZXcuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9pbnB1dC13YXRjaGVyLmpzIiwianMvbWFpbi12aWV3LmpzIiwianMvb2JzZXJ2YWJsZS5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbnZhciBpbmRlbnRBZnRlclBhc3RlID0gZnVuY3Rpb24oY20sIGNoYW5nZSkge1xuICBpZiAoY2hhbmdlLm9yaWdpbiAhPSBcInBhc3RlXCIpIHtcbiAgICByZXR1cm5cbiAgfVxuICBpZiAoQ29kZU1pcnJvci5jbXBQb3MoY2hhbmdlLmZyb20sIGNoYW5nZS50bykpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyBjaGVjayBpZiB0aGUgaW5zZXJ0aW9uIHBvaW50IGlzIGF0IHRoZSBlbmQgb2YgdGhlIGxpbmVcbiAgdmFyIGRlc3QgPSBjbS5nZXRMaW5lKGNoYW5nZS5mcm9tLmxpbmUpXG4gIGlmIChkZXN0Lmxlbmd0aCAhPSBjaGFuZ2UuZnJvbS5jaCkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIGNoZWNrIGlmIHRoZSBsaW5lIGNvbnNpc3RzIG9mIG9ubHkgd2hpdGUgc3BhY2VzXG4gIGlmIChkZXN0Lm1hdGNoKC9bXiBcXHRdLykpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyByZW1vdmUgdGhlIGxhc3QgZW1wdHkgbGluZVxuICBpZiAoY2hhbmdlLnRleHRbY2hhbmdlLnRleHQubGVuZ3RoIC0gMV0gPT0gXCJcIikge1xuICAgIGNoYW5nZS50ZXh0LnBvcCgpXG4gIH1cbiAgdmFyIGJhc2VfaW5kZW50ID0gY2hhbmdlLnRleHRbMF0ubWF0Y2goL15bIFxcdF0qLylbMF1cbiAgY2hhbmdlLnRleHQgPSBjaGFuZ2UudGV4dC5tYXAoZnVuY3Rpb24obGluZSwgaSkge1xuICAgIGxpbmUgPSBsaW5lLm1hdGNoKC9eKFsgXFx0XSopKC4qKS8pXG4gICAgdmFyIGluZGVudCA9IGxpbmVbMV1cbiAgICB2YXIgdGV4dCA9IGxpbmVbMl1cbiAgICBpbmRlbnQgPSAoZGVzdCArIGluZGVudCkuc3Vic3RyKDAsIGRlc3QubGVuZ3RoICsgaW5kZW50Lmxlbmd0aCAtIGJhc2VfaW5kZW50Lmxlbmd0aClcbiAgICByZXR1cm4gaW5kZW50ICsgdGV4dFxuICB9KVxuICBjaGFuZ2UudGV4dFswXSA9IGNoYW5nZS50ZXh0WzBdLnN1YnN0cihkZXN0Lmxlbmd0aClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbmRlbnRBZnRlclBhc3RlXG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG5yZXF1aXJlKFwiY29kZW1pcnJvci1hZGRvblwiKVxucmVxdWlyZShcIi4vbWFya1wiKVxucmVxdWlyZShcIi4vc2VsZWN0LWxpbmVcIilcbnJlcXVpcmUoXCIuL3NlbGVjdC13b3JkXCIpXG5yZXF1aXJlKFwiLi9zcGxpdC1pbnRvLWxpbmVzXCIpXG5yZXF1aXJlKFwiLi90ZXh0LW1vZGVcIilcblxuT2JqZWN0LmFzc2lnbihDb2RlTWlycm9yLmRlZmF1bHRzLCB7XG4gIGxpbmVOdW1iZXJzOiB0cnVlLFxuICB0YWJTaXplOiA0LFxuICBzaG93Q3Vyc29yV2hlblNlbGVjdGluZzogdHJ1ZSxcbiAgYXV0b0Nsb3NlQnJhY2tldHM6IHRydWUsXG4gIG1hdGNoQnJhY2tldHM6IHRydWUsXG4gIG1hdGNoVGFnczogdHJ1ZSxcbiAgYXV0b0Nsb3NlVGFnczogdHJ1ZSxcbiAgc3R5bGVBY3RpdmVMaW5lOiB7bm9uRW1wdHk6IHRydWV9LFxuICBzdHlsZVNlbGVjdGVkVGV4dDogdHJ1ZSxcbiAgZHJhZ0Ryb3A6IGZhbHNlLFxuICBleHRyYUtleXM6IHtcbiAgICBcIkN0cmwtU3BhY2VcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICBcIkN0cmwtVVwiOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgIFwiQ3RybC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgIFwiQ21kLS9cIjogXCJ0b2dnbGVDb21tZW50XCIsXG4gICAgXCJUYWJcIjogXCJpbmRlbnRBdXRvXCIsXG4gICAgXCJDdHJsLURcIjogZmFsc2UsXG4gICAgXCJDbWQtRFwiOiBmYWxzZSxcbiAgfSxcbn0pXG5cbkNvZGVNaXJyb3IuZGVmaW5lSW5pdEhvb2soZnVuY3Rpb24oY20pIHtcbiAgLy8gbWFpbnRhaW4gaW5kZW50YXRpb24gb24gcGFzdGVcbiAgY20ub24oXCJiZWZvcmVDaGFuZ2VcIiwgcmVxdWlyZShcIi4vaW5kZW50LWFmdGVyLXBhc3RlXCIpKVxuICBcbiAgLy8ga2V5IGJpbmRpbmdzXG4gIHZhciBpbnB1dCA9IGNtLmdldElucHV0RmllbGQoKVxuICBpbnB1dC5jbGFzc05hbWUgKz0gXCIgbW91c2V0cmFwXCIgLy8gZW5hYmxlIGhvdGtleVxuICB2YXIga2V5bWFwID0ge1xuICAgIFwiYWx0K2JcIjogXCJnb1dvcmRMZWZ0XCIsXG4gICAgXCJhbHQrZlwiOiBcImdvV29yZFJpZ2h0XCIsXG4gICAgXCJhbHQraFwiOiBcImRlbFdvcmRCZWZvcmVcIixcbiAgICBcImFsdCtkXCI6IFwiZGVsV29yZEFmdGVyXCIsXG4gICAgXCJtb2QrbVwiOiBcIm1hcmtcIixcbiAgICBcIm1vZCtkXCI6IFwic2VsZWN0V29yZFwiLFxuICAgIFwibW9kK2xcIjogXCJzZWxlY3RMaW5lXCIsXG4gICAgXCJtb2Qrc2hpZnQrbFwiOiBcInNwbGl0SW50b0xpbmVzXCIsXG4gIH1cbiAgXy5lYWNoKGtleW1hcCwgZnVuY3Rpb24oY29tbWFuZCwga2V5KSB7XG4gICAgTW91c2V0cmFwKGlucHV0KS5iaW5kKGtleSwgZnVuY3Rpb24oKSB7XG4gICAgICBjbS5leGVjQ29tbWFuZChjb21tYW5kKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfSlcbiAgfSlcbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gQ29kZU1pcnJvclxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmRlZmluZUluaXRIb29rKGZ1bmN0aW9uKGNtKSB7XG4gIGNtLm1hcmtzID0gW11cbn0pXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMubWFyayA9IGZ1bmN0aW9uKGNtKSB7XG4gIHZhciBjdXJzb3IgPSBjbS5nZXRDdXJzb3IoKVxuICBpZiAobWFya3MubGVuZ3RoKSB7XG4gICAgdmFyIGxhc3QgPSBjbS5tYXJrc1tjbS5tYXJrcy5sZW5ndGggLSAxXVxuICAgIGlmIChsYXN0LmxpbmUgPT0gY3Vyc29yLmxpbmUgJiYgbGFzdC5jaCA9PSBjdXJzb3IuY2gpIHtcbiAgICAgIGNtLnNldFNlbGVjdGlvbnMoY20ubWFya3MubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgcmV0dXJuIHtoZWFkOiBtLCBhbmNob3I6IG19XG4gICAgICB9KSwgY20ubWFya3MubGVuZ3RoIC0gMSlcbiAgICAgIGNtLm1hcmtzID0gW11cbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBjbS5tYXJrcy5wdXNoKGN1cnNvcilcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zZWxlY3RMaW5lID0gZnVuY3Rpb24oY20pIHtcbiAgY20uc2V0U2VsZWN0aW9ucyhcbiAgICBjbS5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbmNob3I6IHtcbiAgICAgICAgICBsaW5lOiBpLmhlYWQubGluZSArIDEsXG4gICAgICAgICAgY2g6IDAsXG4gICAgICAgIH0sXG4gICAgICAgIGhlYWQ6IHtcbiAgICAgICAgICBsaW5lOiBpLmFuY2hvci5saW5lLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLnNlbGVjdFdvcmQgPSBmdW5jdGlvbihjbSkge1xuICBjbS5zZXRTZWxlY3Rpb25zKFxuICAgIGNtLmxpc3RTZWxlY3Rpb25zKCkubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBjbS5maW5kV29yZEF0KGkuYW5jaG9yKVxuICAgIH0pXG4gIClcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zcGxpdEludG9MaW5lcyA9IGZ1bmN0aW9uKGNtKSB7XG4gIHZhciBzZWxlY3Rpb25zID0gY20ubGlzdFNlbGVjdGlvbnMoKVxuICBpZiAoc2VsZWN0aW9ucy5sZW5ndGggIT0gMSkge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgYW5jaG9yID0gc2VsZWN0aW9uc1swXS5hbmNob3JcbiAgdmFyIGhlYWQgPSBzZWxlY3Rpb25zWzBdLmhlYWRcbiAgdmFyIG5ld19zZWxlY3Rpb25zID0gW11cbiAgZm9yICh2YXIgaSA9IGFuY2hvci5saW5lOyBpIDw9IGhlYWQubGluZTsgKytpKSB7XG4gICAgbmV3X3NlbGVjdGlvbnMucHVzaCh7XG4gICAgICBhbmNob3I6IHtcbiAgICAgICAgbGluZTogaSxcbiAgICAgICAgY2g6IGkgPT0gYW5jaG9yLmxpbmUgPyBhbmNob3IuY2ggOiAwLFxuICAgICAgfSxcbiAgICAgIGhlYWQ6IHtcbiAgICAgICAgbGluZTogaSxcbiAgICAgICAgY2g6IGkgPT0gaGVhZC5saW5lID8gaGVhZC5jaCA6IEluZmluaXR5LFxuICAgICAgfSxcbiAgICB9KVxuICB9XG4gIGNtLnNldFNlbGVjdGlvbnMobmV3X3NlbGVjdGlvbnMpXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuZGVmaW5lU2ltcGxlTW9kZShcInRleHRcIiwge1xuICBzdGFydDogW10sXG4gIGNvbW1lbnQ6IFtdLFxuICBtZXRhOiB7fSxcbn0pXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciBFZGl0b3JWaWV3ID0gcmVxdWlyZShcIi4vZWRpdG9yLXZpZXdcIilcblxudmFyIEVkaXRvck1hbmFnZXJWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIGVkaXRvcl9tZ3IpIHtcbiAgdmFyIGVkaXRvcnMgPSB7fVxuICB2YXIgJHRhYnMgPSAkKFwiPGRpdj5cIikuYXR0cihcImlkXCIsIFwiZmlsZXNcIikuYXBwZW5kVG8oJHJvb3QpXG4gIHZhciAkZWRpdG9ycyA9ICQoXCI8ZGl2PlwiKS5hdHRyKFwiaWRcIiwgXCJlZGl0b3JzXCIpLmFwcGVuZFRvKCRyb290KVxuICBcbiAgZWRpdG9yX21nci5vcGVuZWQuYWRkKGZ1bmN0aW9uKGVkaXRvcikge1xuICAgIHZhciBwYXRoID0gZWRpdG9yLmdldFBhdGgoKVxuICAgIHZhciBkaXIgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIlteL10rJFwiKSwgXCJcIilcbiAgICB2YXIgbmFtZSA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiLiovXCIpLCBcIlwiKVxuICAgIHZhciAkdGFiID0gJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiZmlsZS1pdGVtXCIpLmFwcGVuZChcbiAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpclwiKS50ZXh0KGRpciksXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJuYW1lXCIpLnRleHQobmFtZSksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwic3RhdHVzIGNsZWFuXCI+JylcbiAgICApLmFwcGVuZFRvKCR0YWJzKVxuICAgIC8vIHN0YXR1cyBpbiB0YWJcbiAgICBlZGl0b3Iuc3RhdHVzLm9ic2VydmUoZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgICAkdGFiLmZpbmQoXCIuc3RhdHVzXCIpLnJlbW92ZUNsYXNzKFwiY2xlYW4gZXJyb3IgbW9kaWZpZWRcIikuYWRkQ2xhc3Moc3RhdHVzKVxuICAgIH0pXG4gICAgLy8gZWRpdG9yIHZpZXdcbiAgICB2YXIgJGVkaXRvciA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImVkaXRvclwiKS5hcHBlbmRUbygkZWRpdG9ycylcbiAgICB2YXIgZWRpdG9yX3ZpZXcgPSBFZGl0b3JWaWV3KCRlZGl0b3IsIGVkaXRvciwgZWRpdG9yX21ncilcbiAgICBcbiAgICBlZGl0b3JzW3BhdGhdID0ge1xuICAgICAgJHRhYjogJHRhYixcbiAgICAgICRlZGl0b3I6ICRlZGl0b3IsXG4gICAgfVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5jbG9zZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBlZGl0b3JzW3BhdGhdLiR0YWIucmVtb3ZlKClcbiAgICBlZGl0b3JzW3BhdGhdLiRlZGl0b3IucmVtb3ZlKClcbiAgICBkZWxldGUgZWRpdG9yc1twYXRoXVxuICB9KVxuICBcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAkdGFicy5maW5kKFwiLmZpbGUtaXRlbS5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGVkaXRvcnNbcGF0aF0uJHRhYi5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICB9KVxuICBcbiAgJHRhYnMub24oXCJjbGlja1wiLCBcIi5maWxlLWl0ZW1cIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIHZhciAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG4gICAgdmFyIHBhdGggPSBfLmZpbmRLZXkoZWRpdG9ycywgZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGkuJHRhYi5pcygkdGFyZ2V0KVxuICAgIH0pXG4gICAgZWRpdG9yX21nci5hY3RpdmF0ZShwYXRoKVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvck1hbmFnZXJWaWV3XG4iLCJ2YXIgc2lnbmFscyA9IHJlcXVpcmUoXCJzaWduYWxzXCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRmlsZSA9IHJlcXVpcmUoXCIuL2ZpbGVcIilcbnZhciBFZGl0b3IgPSByZXF1aXJlKFwiLi9lZGl0b3JcIilcblxudmFyIEVkaXRvck1hbmFnZXIgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIG9wZW5lZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgY2xvc2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBhY3RpdmF0ZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIFxuICAgIGFjdGl2ZTogbnVsbCwgLy8gcGF0aCBvZiBhY3RpdmUgZmlsZVxuICAgIGVkaXRvcnM6IFtdLFxuICAgIFxuICAgIGdldEZpbGVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5lZGl0b3JzLm1hcChmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgICAgcmV0dXJuIGVkaXRvci5nZXRQYXRoKClcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBvcGVuOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBcIlRoZSBwYXRoIGlzIG51bGxcIlxuICAgICAgfVxuICAgICAgLy8gdHJ5IHRvIGFjdGl2YXRlIGFscmVhZHkgb3BlbmVkIGZpbGVzXG4gICAgICBpZiAobW9kZWwuYWN0aXZhdGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgZWRpdG9yID0gRWRpdG9yKEZpbGUocGF0aCkpXG4gICAgICBlZGl0b3IubG9hZCgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGVsLmVkaXRvcnMucHVzaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLm9wZW5lZC5kaXNwYXRjaChlZGl0b3IpXG4gICAgICAgIG1vZGVsLmFjdGl2YXRlKHBhdGgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgZ2V0QWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5hY3RpdmVcbiAgICB9LFxuICAgIFxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgICBpZiAocGF0aCAhPT0gbnVsbCAmJiBtb2RlbC5pbmRleE9mKHBhdGgpID09IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZlID0gcGF0aFxuICAgICAgbW9kZWwuYWN0aXZhdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgICBmaW5kZXIuc2V0UGF0aChwYXRoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFxuICAgIG5leHRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUodHJ1ZSlcbiAgICB9LFxuICAgIFxuICAgIHByZXZGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnJvdGF0ZUZpbGUoZmFsc2UpXG4gICAgfSxcbiAgICBcbiAgICByb3RhdGVGaWxlOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuZWRpdG9ycy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHhcbiAgICAgIGlmIChtb2RlbC5hY3RpdmUgPT09IG51bGwpIHtcbiAgICAgICAgaWR4ID0gbmV4dCA/IDAgOiBtb2RlbC5lZGl0b3JzLmxlbmd0aCAtIDFcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZHggPSBtb2RlbC5pbmRleE9mKG1vZGVsLmFjdGl2ZSlcbiAgICAgICAgaWR4ICs9IG5leHQgPyArMSA6IC0xXG4gICAgICAgIGlkeCA9IChpZHggKyBtb2RlbC5lZGl0b3JzLmxlbmd0aCkgJSBtb2RlbC5lZGl0b3JzLmxlbmd0aFxuICAgICAgfVxuICAgICAgbW9kZWwuYWN0aXZhdGUobW9kZWwuZWRpdG9yc1tpZHhdLmdldFBhdGgoKSlcbiAgICB9LFxuICAgIFxuICAgIGNsb3NlOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaW5kZXhPZihwYXRoKVxuICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5hY3RpdmUpIHtcbiAgICAgICAgaWYgKG1vZGVsLmVkaXRvcnMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBtb2RlbC5hY3RpdmF0ZShudWxsKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1vZGVsLnByZXZGaWxlKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbW9kZWwuZWRpdG9ycy5zcGxpY2UoaWR4LCAxKVxuICAgICAgbW9kZWwuY2xvc2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICByZWxvYWQ6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLmNsb3NlKHBhdGgpXG4gICAgICBtb2RlbC5vcGVuKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBpbmRleE9mOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZ2V0RmlsZXMoKS5pbmRleE9mKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnNlbGVjdGVkLmFkZChtb2RlbC5vcGVuKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yTWFuYWdlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCIuL2NvZGVtaXJyb3JcIilcblxudmFyIEVkaXRvclZpZXcgPSBmdW5jdGlvbigkcm9vdCwgZWRpdG9yLCBlZGl0b3JfbWdyKSB7XG4gIHZhciBmaWxlID0gZWRpdG9yLmdldEZpbGUoKVxuICBcbiAgdmFyIGNtID0gQ29kZU1pcnJvcigkcm9vdFswXSwge1xuICAgIHZhbHVlOiBlZGl0b3IudGV4dC5nZXQoKSxcbiAgICBtb2RlOiBlZGl0b3IubW9kZS5nZXQoKSxcbiAgfSlcbiAgXG4gIC8vIGZvb3RlclxuICAkcm9vdC5hcHBlbmQoXG4gICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1mb290XCI+JykuYXBwZW5kKFxuICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1tZXNzYWdlXCI+JyksXG4gICAgICAkKCc8YnV0dG9uIGNsYXNzPVwiZWRpdG9yLWluZGVudCBsaW5rXCIgdHlwZT1cImJ1dHRvblwiPicpLFxuICAgICAgJCgnPGRpdiBjbGFzcz1cImVkaXRvci1lb2xcIj4nKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW5jb2RpbmdcIj4nKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbW9kZVwiPicpXG4gICAgKVxuICApXG4gIFxuICAvLyBzYXZlXG4gIHZhciBsYXN0X2dlbmVyYXRpb24gPSBjbS5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpXG4gIHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGdlbmVyYXRpb24gPSBjbS5jaGFuZ2VHZW5lcmF0aW9uKHRydWUpXG4gICAgZWRpdG9yLnNhdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgbGFzdF9nZW5lcmF0aW9uID0gZ2VuZXJhdGlvblxuICAgIH0pXG4gIH1cbiAgY20ub24oXCJjaGFuZ2VzXCIsIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvci50ZXh0LnNldChjbS5nZXRWYWx1ZSgpKVxuICAgIGVkaXRvci5zdGF0dXMuc2V0KFxuICAgICAgY20uaXNDbGVhbihsYXN0X2dlbmVyYXRpb24pID8gXCJjbGVhblwiIDogXCJtb2RpZmllZFwiXG4gICAgKVxuICB9KVxuICBlZGl0b3IudGV4dC5vYnNlcnZlKGZ1bmN0aW9uKHRleHQpIHtcbiAgICBpZiAodGV4dCAhPSBjbS5nZXRWYWx1ZSgpKSB7XG4gICAgICBjbS5zZXRWYWx1ZSh0ZXh0KVxuICAgIH1cbiAgfSlcblxuICAvLyBtb2RlXG4gIHZhciB1cGRhdGVNb2RlID0gZnVuY3Rpb24obW9kZSkge1xuICAgIGNtLnNldE9wdGlvbihcIm1vZGVcIiwgbW9kZSlcbiAgICBDb2RlTWlycm9yLnJlZ2lzdGVySGVscGVyKFwiaGludFdvcmRzXCIsIG1vZGUsIG51bGwpXG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItbW9kZVwiKS50ZXh0KG1vZGUpXG4gIH1cbiAgZWRpdG9yLm1vZGUub2JzZXJ2ZSh1cGRhdGVNb2RlKVxuICB1cGRhdGVNb2RlKGVkaXRvci5tb2RlLmdldCgpKVxuICBcbiAgLy8gaW5kZW50XG4gIHZhciB1cGRhdGVJbmRlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLnRleHQodHlwZSlcbiAgICBpZiAodHlwZSA9PSBcIlRBQlwiKSB7XG4gICAgICBjbS5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCB0cnVlKVxuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCA0KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFdpdGhUYWJzXCIsIGZhbHNlKVxuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50VW5pdFwiLCBOdW1iZXIodHlwZS5yZXBsYWNlKFwiU1BcIiwgXCJcIikpKVxuICAgIH1cbiAgfVxuICBlZGl0b3IuaW5kZW50Lm9ic2VydmUodXBkYXRlSW5kZW50KVxuICB1cGRhdGVJbmRlbnQoZWRpdG9yLmluZGVudC5nZXQoKSlcbiAgJHJvb3QuZmluZChcIi5lZGl0b3ItaW5kZW50XCIpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvci5pbmRlbnQucm90YXRlKClcbiAgfSlcbiAgXG4gIC8vIGxpbmUgc2VwcmF0b3JcbiAgdmFyIHVwZGF0ZUVvbCA9IGZ1bmN0aW9uKGVvbCkge1xuICAgIHZhciBuYW1lcyA9IHtcbiAgICAgIFwiXFxyXCI6IFwiQ1JcIixcbiAgICAgIFwiXFxuXCI6IFwiTEZcIixcbiAgICAgIFwiXFxyXFxuXCI6IFwiQ1JMRlwiLFxuICAgIH1cbiAgICAkcm9vdC5maW5kKFwiLmVkaXRvci1lb2xcIikudGV4dChuYW1lc1tlb2xdKVxuICB9XG4gIGZpbGUuZW9sLmFkZCh1cGRhdGVFb2wpXG4gIHVwZGF0ZUVvbChmaWxlLmVvbC5nZXQoKSlcbiAgXG4gIC8vIGVuY29kaW5nXG4gIHZhciB1cGRhdGVFbmNvZGluZyA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZylcbiAgfVxuICBmaWxlLmVuY29kaW5nLmFkZCh1cGRhdGVFbmNvZGluZylcbiAgdXBkYXRlRW5jb2RpbmcoZmlsZS5lbmNvZGluZy5nZXQoKSlcbiAgXG4gIC8vIG1lc3NhZ2VcbiAgZWRpdG9yLm1lc3NhZ2Uub2JzZXJ2ZShmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KG1lc3NhZ2UpXG4gIH0pXG4gIFxuICAvLyBhY3RpdmVcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKGFjdGl2ZSkge1xuICAgIGlmIChhY3RpdmUgPT0gZmlsZS5nZXRQYXRoKCkpIHtcbiAgICAgICRyb290LmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBjbS5mb2N1cygpXG4gICAgICBjbS5yZWZyZXNoKClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkcm9vdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH1cbiAgfSlcbiAgXG4gIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgTW91c2V0cmFwKCRyb290WzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2F2ZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcIi4vY29kZW1pcnJvclwiKVxudmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudFwiKVxuXG52YXIgRWRpdG9yID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgZWRpdG9yID0ge1xuICAgIHRleHQ6IE9ic2VydmFibGUoXCJcIiksXG4gICAgc3RhdHVzOiBPYnNlcnZhYmxlKFwiY2xlYW5cIiksXG4gICAgbW9kZTogT2JzZXJ2YWJsZShcInRleHRcIiksXG4gICAgaW5kZW50OiBJbmRlbnQoKSxcbiAgICBtZXNzYWdlOiBPYnNlcnZhYmxlKFwiXCIpLFxuICAgIFxuICAgIGdldEZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZpbGVcbiAgICB9LFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZpbGUuZ2V0UGF0aCgpXG4gICAgfSxcbiAgICBcbiAgICBsb2FkOiBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICByZXR1cm4gZmlsZS5yZWFkKCkudGhlbihmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgIGVkaXRvci5pbmRlbnQuc2V0KEluZGVudC5kZXRlY3RJbmRlbnRUeXBlKHRleHQpKVxuICAgICAgICBlZGl0b3IudGV4dC5zZXQodGV4dClcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiTG9hZGVkLlwiKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHNhdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZpbGUud3JpdGUoZWRpdG9yLnRleHQuZ2V0KCkpLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGVkaXRvci5tZXNzYWdlLnNldChcIlNhdmUgZmFpbGVkLiBcIiArIHJlcGx5LmVycm9yKVxuICAgICAgICBlZGl0b3Iuc3RhdHVzLnNldChcImVycm9yXCIpXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBlZGl0b3Iuc3RhdHVzLnNldChcImNsZWFuXCIpXG4gICAgICAgIGVkaXRvci5tZXNzYWdlLnNldChcIlNhdmVkLlwiKVxuICAgICAgfSlcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgZGV0ZWN0TW9kZSA9IChmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIilcbiAgICB2YXIgbW9kZSA9IHtcbiAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICB0YWc6IFwicGhwXCIsXG4gICAgfVtleHRlbnNpb25dXG4gICAgaWYgKG1vZGUpIHtcbiAgICAgIHJldHVybiBtb2RlXG4gICAgfVxuICAgIG1vZGUgPSBDb2RlTWlycm9yLmZpbmRNb2RlQnlFeHRlbnNpb24oZXh0ZW5zaW9uKVxuICAgIGlmIChtb2RlKSB7XG4gICAgICByZXR1cm4gbW9kZS5tb2RlXG4gICAgfVxuICAgIHJldHVybiBcInRleHRcIlxuICB9KVxuICBlZGl0b3IubW9kZS5zZXQoZGV0ZWN0TW9kZShmaWxlLmdldFBhdGgoKSkpXG4gIFxuICAvLyBhdXRvIHNhdmVcbiAgZWRpdG9yLnRleHQub2JzZXJ2ZShfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuICAgIGlmIChlZGl0b3Iuc3RhdHVzLmdldCgpICE9IFwiY2xlYW5cIikge1xuICAgICAgZWRpdG9yLnNhdmUoKVxuICAgIH1cbiAgfSwgNDAwMCkpXG4gIFxuICByZXR1cm4gZWRpdG9yXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yXG4iLCJ2YXIgUm90YXRlID0gcmVxdWlyZShcIi4vcm90YXRlXCIpXG5cbnZhciBFb2wgPSBmdW5jdGlvbihlb2wpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCJcXG5cIiwgXCJcXHJcXG5cIiwgXCJcXHJcIl0sIGVvbClcbn1cblxuRW9sLmRldGVjdCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgaWYgKHRleHQubWF0Y2goXCJcXHJcXG5cIikpIHtcbiAgICByZXR1cm4gXCJcXHJcXG5cIlxuICB9XG4gIGlmICh0ZXh0Lm1hdGNoKFwiXFxyXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXCJcbiAgfVxuICByZXR1cm4gXCJcXG5cIlxufVxuXG5Fb2wucmVndWxhdGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoLyhcXHJcXG58XFxyKS8sIFwiXFxuXCIpXG59LFxuXG5tb2R1bGUuZXhwb3J0cyA9IEVvbFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcbnZhciBFb2wgPSByZXF1aXJlKFwiLi9lb2xcIilcblxudmFyIEZpbGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBmaWxlID0ge1xuICAgIGVvbDogRW9sKCksXG4gICAgZW5jb2Rpbmc6IE9ic2VydmFibGUoKSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwYXRoXG4gICAgfSxcbiAgICBcbiAgICByZWFkOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgIHVybDogXCIvcmVhZC5waHBcIixcbiAgICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICAgIH0pLmZhaWwocmVqZWN0KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgICAgZmlsZS5lbmNvZGluZy5zZXQocmVwbHkuZW5jb2RpbmcpXG4gICAgICAgICAgZmlsZS5lb2wuc2V0KEVvbC5kZXRlY3QocmVwbHkuY29udGVudCkpXG4gICAgICAgICAgdmFyIGNvbnRlbnQgPSBFb2wucmVndWxhdGUocmVwbHkuY29udGVudClcbiAgICAgICAgICByZXNvbHZlKGNvbnRlbnQpXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgd3JpdGU6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB1cmw6IFwiL3dyaXRlLnBocFwiLFxuICAgICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgZW5jb2Rpbmc6IGZpbGUuZW5jb2RpbmcuZ2V0KCksXG4gICAgICAgICAgICBjb250ZW50OiB0ZXh0LnJlcGxhY2UoL1xcbi9nLCBmaWxlLmVvbC5nZXQoKSlcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgIGlmIChyZXBseSA9PSBcIm9rXCIpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXBseS5lcnJvcilcbiAgICAgICAgICB9XG4gICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmVqZWN0KFwiXCIpXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0sXG4gIH1cbiAgcmV0dXJuIGZpbGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcblxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgdmFyIGxpc3QgPSAkKFwiI2ZpbmRlci1pdGVtc1wiKVxuICBcbiAgdmFyIHZpZXcgPSB7XG4gICAgdXBkYXRlSXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBsaXN0LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpLmVtcHR5KClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSAmJiBpdGVtc1swXSA9PSBtb2RlbC5nZXRDdXJzb3IoKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBuYW1lX3J4ID0gbmV3IFJlZ0V4cChcIi8oW14vXSovPykkXCIpXG4gICAgICBsaXN0LmFwcGVuZChpdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVfcnguZXhlYyhpdGVtKVsxXVxuICAgICAgICByZXR1cm4gJChcIjxhPlwiKS50ZXh0KG5hbWUpLmRhdGEoXCJwYXRoXCIsIGl0ZW0pXG4gICAgICB9KSlcbiAgICAgIGxpc3Quc2Nyb2xsVG9wKDApLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGxpc3QuZmluZChcImEuc2VsZWN0ZWRcIikucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKVxuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgYSA9IGxpc3QuZmluZChcImFcIikuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCh0aGlzKS5kYXRhKFwicGF0aFwiKSA9PSBwYXRoXG4gICAgICB9KVxuICAgICAgaWYgKGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBhLmFkZENsYXNzKFwic2VsZWN0ZWRcIilcblxuICAgICAgLy8gc2Nyb2xsIHRoZSBsaXN0IHRvIG1ha2UgdGhlIHNlbGVjdGVkIGl0ZW0gdmlzaWJsZVxuICAgICAgdmFyIHNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0YXJnZXQuaGVpZ2h0KClcbiAgICAgICAgdmFyIHRvcCA9IHRhcmdldC5wcmV2QWxsKCkubGVuZ3RoICogaGVpZ2h0XG4gICAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHRcbiAgICAgICAgdmFyIHZpZXdfaGVpZ2h0ID0gbGlzdC5pbm5lckhlaWdodCgpXG4gICAgICAgIGlmICh0b3AgLSBsaXN0LnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgICAgIGxpc3Quc2Nyb2xsVG9wKHRvcClcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm90dG9tIC0gbGlzdC5zY3JvbGxUb3AoKSA+IHZpZXdfaGVpZ2h0KSB7XG4gICAgICAgICAgbGlzdC5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNjcm9sbEludG9WaWV3KGEpXG4gICAgfVxuICB9XG4gIFxuICBtb2RlbC5pdGVtc19jaGFuZ2VkLmFkZCh2aWV3LnVwZGF0ZUl0ZW1zKVxuICBtb2RlbC5jdXJzb3JfbW92ZWQuYWRkKHZpZXcudXBkYXRlQ3Vyc29yKVxuICBcbiAgLy8gd2hlbiBpdGVtIHdhcyBzZWxlY3RlZFxuICBsaXN0Lm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBtb2RlbC5zZWxlY3QoJChlLnRhcmdldCkuZGF0YShcInBhdGhcIikpXG4gIH0pXG4gIFxuICAvLyBwcmV2ZW50IGZyb20gbG9vc2luZyBmb2N1c1xuICBsaXN0Lm9uKFwibW91c2Vkb3duXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIH0pXG4gIFxuICByZXR1cm4gdmlld1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RWaWV3XG4iLCJ2YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBGaW5kZXJTdWdnZXN0VmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LXZpZXcuanNcIilcblxudmFyIEZpbmRlclN1Z2dlc3QgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIGl0ZW1zOiBbXSxcbiAgICBjdXJzb3I6IG51bGwsIC8vIGhpZ2hsaWdodGVkIGl0ZW1cbiAgICBcbiAgICBpdGVtc19jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgY3Vyc29yX21vdmVkOiBuZXcgU2lnbmFsKCksXG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgIHVybDogXCIvZmluZGVyLnBocFwiLFxuICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJmYWlsZWQgdG8gZmV0Y2ggc3VnZ2VzdCBmb3IgdGhlIHBhdGg6IFwiICsgcGF0aClcbiAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgbW9kZWwuc2V0SXRlbXMocmVwbHkuaXRlbXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICByZXR1cm4gcmVwbHkuYmFzZSArIGlcbiAgICAgICAgfSkpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2V0SXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IobnVsbClcbiAgICAgIG1vZGVsLml0ZW1zID0gaXRlbXNcbiAgICAgIG1vZGVsLml0ZW1zX2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwuaXRlbXMpXG4gICAgfSxcbiAgICBcbiAgICBnZXRJdGVtczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuaXRlbXNcbiAgICB9LFxuICAgIFxuICAgIGdldEN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuY3Vyc29yXG4gICAgfSxcbiAgICBcbiAgICBzZXRDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5jdXJzb3IpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jdXJzb3IgPSBwYXRoXG4gICAgICBtb2RlbC5jdXJzb3JfbW92ZWQuZGlzcGF0Y2gobW9kZWwuY3Vyc29yKVxuICAgIH0sXG4gICAgXG4gICAgbW92ZUN1cnNvcjogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmN1cnNvciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAobW9kZWwuaXRlbXMubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbMF0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaXRlbXMuaW5kZXhPZihtb2RlbC5jdXJzb3IpXG4gICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgIGlkeCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vZGVsLml0ZW1zLmxlbmd0aCAtIDEsIGlkeCkpXG4gICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbaWR4XSlcbiAgICB9LFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKHBhdGgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgbW9kZWwudXBkYXRlKGZpbmRlci5nZXRQYXRoKCkpXG4gICAgfVxuICB9KVxuICBcbiAgZmluZGVyLnBhdGhfY2hhbmdlZC5hZGQoXy5kZWJvdW5jZShtb2RlbC51cGRhdGUsIDI1MCkpXG4gIFxuICB2YXIgdmlldyA9IEZpbmRlclN1Z2dlc3RWaWV3KG1vZGVsKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIEZhbHNlID0gcmVxdWlyZShcIi4vcmV0dXJuLWZhbHNlLmpzXCIpXG52YXIgSW5wdXRXYXRjaGVyID0gcmVxdWlyZShcIi4vaW5wdXQtd2F0Y2hlci5qc1wiKVxuXG52YXIgRmluZGVyVmlldyA9IGZ1bmN0aW9uKG1vZGVsLCBzdWdnZXN0KSB7XG4gIHZhciBwYXRoX2lucHV0ID0gJChcIiNmaW5kZXItcGF0aFwiKS52YWwoXCIvXCIpXG4gIFxuICB2YXIgcGF0aF93YXRjaGVyID0gSW5wdXRXYXRjaGVyKHBhdGhfaW5wdXQsIDUwKVxuICBwYXRoX3dhdGNoZXIuY2hhbmdlZC5hZGQobW9kZWwuc2V0UGF0aClcbiAgXG4gIHZhciB2aWV3ID0ge1xuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgJChcIiNmaW5kZXJcIikuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIHBhdGhfaW5wdXQuZm9jdXMoKVxuICAgICAgcGF0aF93YXRjaGVyLnN0YXJ0KClcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgJChcIiNmaW5kZXJcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIHBhdGhfd2F0Y2hlci5zdG9wKClcbiAgICB9LFxuICB9XG4gIFxuICAvLyBoaWRlIG9uIGJsdXJcbiAgcGF0aF9pbnB1dC5ibHVyKG1vZGVsLmhpZGUoKSlcbiAgXG4gIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICB2aWV3LnNob3coKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZpZXcuaGlkZSgpXG4gICAgfVxuICB9KVxuICBcbiAgbW9kZWwucGF0aF9jaGFuZ2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgcGF0aF9pbnB1dC52YWwocGF0aClcbiAgfSlcbiAgXG4gIE1vdXNldHJhcChwYXRoX2lucHV0WzBdKS5iaW5kKFwiZW50ZXJcIiwgRmFsc2UobW9kZWwuZW50ZXIpKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcInRhYlwiLCBGYWxzZShtb2RlbC50YWIpKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcImVzY1wiLCBGYWxzZShtb2RlbC5oaWRlKSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJkb3duXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgIHN1Z2dlc3QubW92ZUN1cnNvcih0cnVlKVxuICB9KSlcbiAgTW91c2V0cmFwKHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ1cFwiLCBGYWxzZShmdW5jdGlvbigpIHtcbiAgICBzdWdnZXN0Lm1vdmVDdXJzb3IoZmFsc2UpXG4gIH0pKVxuICBNb3VzZXRyYXAocGF0aF9pbnB1dFswXSkuYmluZChcIm1vZCt1XCIsIEZhbHNlKFxuICAgIG1vZGVsLmdvVG9QYXJlbnREaXJlY3RvcnlcbiAgKSlcbiAgXG4gIHJldHVybiB2aWV3XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIEZpbmRlclZpZXcgPSByZXF1aXJlKFwiLi9maW5kZXItdmlldy5qc1wiKVxudmFyIEZpbmRlclN1Z2dlc3QgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdC5qc1wiKVxuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIHBhdGhfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIHZpc2liaWxpdHlfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHBhdGg6IFwiXCIsXG4gICAgdmlzaWJsZTogZmFsc2UsXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKHBhdGgpXG4gICAgICBpZiAocGF0aC5zdWJzdHIoLTEpID09IFwiL1wiKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuaGlkZSgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gdHJ1ZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSBmYWxzZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4vLyAgICAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShlZGl0b3JfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICB9LFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLnBhdGhcbiAgICB9LFxuICAgIFxuICAgIHNldFBhdGg6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnBhdGggPSBwYXRoXG4gICAgICBtb2RlbC5wYXRoX2NoYW5nZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGdvVG9QYXJlbnREaXJlY3Rvcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChcbiAgICAgICAgbW9kZWwucGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKi8/JFwiKSwgXCJcIilcbiAgICAgIClcbiAgICB9LFxuICAgIFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXRoID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgbW9kZWwuc2VsZWN0KHBhdGggPyBwYXRoIDogbW9kZWwucGF0aClcbiAgICB9LFxuICAgIFxuICAgIHRhYjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGN1cnNvcilcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaXRlbXMgPSBzdWdnZXN0LmdldEl0ZW1zKClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSkge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGl0ZW1zWzBdKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHN1Z2dlc3QudXBkYXRlKG1vZGVsLnBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgdmFyIHN1Z2dlc3QgPSBGaW5kZXJTdWdnZXN0KG1vZGVsKVxuICBzdWdnZXN0LnNlbGVjdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgbW9kZWwuc2VsZWN0KHBhdGgpXG4gIH0pXG4gIFxuICB2YXIgdmlldyA9IEZpbmRlclZpZXcobW9kZWwsIHN1Z2dlc3QpXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBSb3RhdGUgPSByZXF1aXJlKFwiLi9yb3RhdGUuanNcIilcblxudmFyIEluZGVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCI0U1BcIiwgXCIyU1BcIiwgXCJUQUJcIl0sIHR5cGUpXG59XG5cbkluZGVudC5kZXRlY3RJbmRlbnRUeXBlID0gZnVuY3Rpb24oY29udGVudCkge1xuICBpZiAoY29udGVudC5tYXRjaCgvW1xcclxcbl0rXFx0LykpIHtcbiAgICByZXR1cm4gXCJUQUJcIlxuICB9XG4gIHZhciBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoL1tcXHJcXG5dKy8pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaW5kZW50ID0gbGluZXNbaV0ucmVwbGFjZSgvXiggKikuKi8sIFwiJDFcIilcbiAgICBpZiAoaW5kZW50Lmxlbmd0aCA9PSAyKSB7XG4gICAgICByZXR1cm4gXCIyU1BcIlxuICAgIH1cbiAgfVxuICByZXR1cm4gXCI0U1BcIlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGVudFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBJbnB1dFdhdGNoZXIgPSBmdW5jdGlvbihpbnB1dCwgaW50ZXJ2YWwpIHtcbiAgaW5wdXQgPSAkKGlucHV0KVxuICBcbiAgdmFyIG1vZGVsID0ge1xuICAgIGNoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBpbnB1dDogaW5wdXQsXG4gICAgaW50ZXJ2YWw6IGludGVydmFsLFxuICAgIGxhc3RfdmFsdWU6IGlucHV0LnZhbCgpLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIFxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnN0b3AoKVxuICAgICAgbW9kZWwudGltZXIgPSBzZXRJbnRlcnZhbChtb2RlbC5jaGVjaywgbW9kZWwuaW50ZXJ2YWwpXG4gICAgfSxcbiAgICBcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwobW9kZWwudGltZXIpXG4gICAgICBtb2RlbC50aW1lciA9IG51bGxcbiAgICB9LFxuICAgIFxuICAgIGNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbW9kZWwuaW5wdXQudmFsKClcbiAgICAgIGlmIChjdXJyZW50ID09IG1vZGVsLmxhc3RfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jaGFuZ2VkLmRpc3BhdGNoKGN1cnJlbnQsIG1vZGVsLmxhc3RfdmFsdWUpXG4gICAgICBtb2RlbC5sYXN0X3ZhbHVlID0gY3VycmVudFxuICAgIH0sXG4gICAgXG4gICAga2V5RG93bjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAobW9kZWwudGltZXIpIHtcbiAgICAgICAgbW9kZWwuY2hlY2soKVxuICAgICAgfVxuICAgIH0sXG4gIH1cbiAgXG4gIGlucHV0LmtleWRvd24obW9kZWwua2V5RG93bilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0V2F0Y2hlclxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgRWRpdG9yTWFuYWdlclZpZXcgPSByZXF1aXJlKFwiLi9lZGl0b3ItbWFuYWdlci12aWV3XCIpXG5cbnZhciBNYWluVmlldyA9IGZ1bmN0aW9uKGVkaXRvcl9tZ3IpIHtcbiAgdmFyICRtYWluID0gJChcIm1haW5cIilcbiAgdmFyIGVkaXRvcl9tZ3JfdmlldyA9IEVkaXRvck1hbmFnZXJWaWV3KCRtYWluLCBlZGl0b3JfbWdyKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1haW5WaWV3XG4iLCJ2YXIgU2lnbmFsID0gcmVxdWlyZShcInNpZ25hbHNcIikuU2lnbmFsXG5cbnZhciBPYnNlcnZhYmxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIG9ic2VydmFibGUgPSBuZXcgU2lnbmFsKClcbiAgT2JqZWN0LmFzc2lnbihvYnNlcnZhYmxlLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gbmV3X3ZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIG9sZF92YWx1ZSA9IHZhbHVlXG4gICAgICB2YWx1ZSA9IG5ld192YWx1ZVxuICAgICAgb2JzZXJ2YWJsZS5kaXNwYXRjaCh2YWx1ZSwgb2xkX3ZhbHVlLCBvYnNlcnZhYmxlKVxuICAgIH0sXG4gICAgb2JzZXJ2ZTogb2JzZXJ2YWJsZS5hZGQsIC8vIGFsaWFzXG4gIH0pXG4gIHJldHVybiBvYnNlcnZhYmxlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gT2JzZXJ2YWJsZVxuIiwidmFyIHJldHVybkZhbHNlID0gZnVuY3Rpb24oZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZXR1cm5GYWxzZVxuIiwidmFyIE9ic2VydmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcnZhYmxlXCIpXG5cbnZhciBSb3RhdGUgPSBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlKSB7XG4gIHZhciBpc1ZhbGlkVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlcy5pbmRleE9mKHYpICE9IC0xXG4gIH1cbiAgXG4gIHZhciBjaGVja1ZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIGlmICghaXNWYWxpZFZhbHVlKHYpKSB7XG4gICAgICB0aHJvdyBcImludmFsaWQgdmFsdWU6IFwiICsgdlxuICAgIH1cbiAgfVxuICBjaGVja1ZhbHVlKHZhbHVlKVxuICBcbiAgdmFyIHJvdGF0ZSA9IE9ic2VydmFibGUodmFsdWUpXG4gIFxuICByb3RhdGUuZ2V0VmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHZhbHVlc1xuICB9XG4gIFxuICB2YXIgX3NldCA9IHJvdGF0ZS5zZXRcbiAgcm90YXRlLnNldCA9IGZ1bmN0aW9uKG5ld192YWx1ZSkge1xuICAgIGNoZWNrVmFsdWUobmV3X3ZhbHVlKVxuICAgIF9zZXQobmV3X3ZhbHVlKVxuICB9XG4gIFxuICByb3RhdGUucm90YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdmFyIGlkeCA9IHZhbHVlcy5pbmRleE9mKHZhbHVlKVxuICAgIGlkeCA9IChpZHggKyAxKSAlIHZhbHVlcy5sZW5ndGhcbiAgICByb3RhdGUuc2V0KHZhbHVlc1tpZHhdKVxuICB9XG4gIFxuICByZXR1cm4gcm90YXRlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUm90YXRlXG4iLCJ2YXIgRWRpdG9yTWFuYWdlciA9IHJlcXVpcmUoXCIuL2VkaXRvci1tYW5hZ2VyXCIpXG52YXIgTWFpblZpZXcgPSByZXF1aXJlKFwiLi9tYWluLXZpZXdcIilcblxubW9kdWxlLmV4cG9ydHMucnVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG4gIHZhciBmaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXIuanNcIikoKVxuICB2YXIgZWRpdG9yX21nciA9IEVkaXRvck1hbmFnZXIoZmluZGVyKVxuICB2YXIgdmlldyA9IE1haW5WaWV3KGVkaXRvcl9tZ3IpXG4gIFxuICB2YXIgc2F2ZUZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpbGVzID0gZWRpdG9yX21nci5nZXRGaWxlcygpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJvcGVuLWZpbGVzXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzKSlcbiAgfVxuICB2YXIgbG9hZEZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJvcGVuLWZpbGVzXCIpIHx8IFwiW11cIilcbiAgfVxuICBsb2FkRmlsZUxpc3QoKS5mb3JFYWNoKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBlZGl0b3JfbWdyLm9wZW4ocGF0aClcbiAgfSlcbiAgXG4gIGVkaXRvcl9tZ3Iub3BlbmVkLmFkZChzYXZlRmlsZUxpc3QpXG4gIGVkaXRvcl9tZ3IuY2xvc2VkLmFkZChzYXZlRmlsZUxpc3QpXG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtcIiwgXCJtb2QrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5uZXh0RmlsZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrc2hpZnQrXCIsIFwibW9kK3NoaWZ0Kz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IucHJldkZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3dcIiwgXCJtb2Qra1wiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5jbG9zZShlZGl0b3JfbWdyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3JcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IucmVsb2FkKGVkaXRvcl9tZ3IuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICAvLyBzaG93IGZpbmRlclxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrb1wiLCBcIm1vZCtwXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc2hvdygpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxufVxuIl19
