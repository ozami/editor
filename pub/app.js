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

},{"jquery":"jquery"}],15:[function(require,module,exports){
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

},{"jquery":"jquery","signals":"signals","underscore":"underscore"}],16:[function(require,module,exports){
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

},{"./finder-suggest-view":14,"./input-watcher":19,"./return-false":22,"jquery":"jquery","mousetrap":"mousetrap"}],17:[function(require,module,exports){
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

},{"./finder-suggest":15,"signals":"signals"}],18:[function(require,module,exports){
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

},{"./rotate":23}],19:[function(require,module,exports){
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
}

module.exports = MainView

},{"./editor-manager-view":8,"./finder-view":16,"jquery":"jquery"}],21:[function(require,module,exports){
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

},{"./editor-manager":9,"./finder":17,"./main-view":20,"mousetrap":"mousetrap"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZWRpdG9yLW1hbmFnZXItdmlldy5qcyIsImpzL2VkaXRvci1tYW5hZ2VyLmpzIiwianMvZWRpdG9yLXZpZXcuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9lb2wuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3Qtdmlldy5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LmpzIiwianMvZmluZGVyLXZpZXcuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9pbnB1dC13YXRjaGVyLmpzIiwianMvbWFpbi12aWV3LmpzIiwianMvb2JzZXJ2YWJsZS5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG52YXIgaW5kZW50QWZ0ZXJQYXN0ZSA9IGZ1bmN0aW9uKGNtLCBjaGFuZ2UpIHtcbiAgaWYgKGNoYW5nZS5vcmlnaW4gIT0gXCJwYXN0ZVwiKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKENvZGVNaXJyb3IuY21wUG9zKGNoYW5nZS5mcm9tLCBjaGFuZ2UudG8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gIHZhciBkZXN0ID0gY20uZ2V0TGluZShjaGFuZ2UuZnJvbS5saW5lKVxuICBpZiAoZGVzdC5sZW5ndGggIT0gY2hhbmdlLmZyb20uY2gpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICBpZiAoZGVzdC5tYXRjaCgvW14gXFx0XS8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgaWYgKGNoYW5nZS50ZXh0W2NoYW5nZS50ZXh0Lmxlbmd0aCAtIDFdID09IFwiXCIpIHtcbiAgICBjaGFuZ2UudGV4dC5wb3AoKVxuICB9XG4gIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdXG4gIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICBsaW5lID0gbGluZS5tYXRjaCgvXihbIFxcdF0qKSguKikvKVxuICAgIHZhciBpbmRlbnQgPSBsaW5lWzFdXG4gICAgdmFyIHRleHQgPSBsaW5lWzJdXG4gICAgaW5kZW50ID0gKGRlc3QgKyBpbmRlbnQpLnN1YnN0cigwLCBkZXN0Lmxlbmd0aCArIGluZGVudC5sZW5ndGggLSBiYXNlX2luZGVudC5sZW5ndGgpXG4gICAgcmV0dXJuIGluZGVudCArIHRleHRcbiAgfSlcbiAgY2hhbmdlLnRleHRbMF0gPSBjaGFuZ2UudGV4dFswXS5zdWJzdHIoZGVzdC5sZW5ndGgpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5kZW50QWZ0ZXJQYXN0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxucmVxdWlyZShcImNvZGVtaXJyb3ItYWRkb25cIilcbnJlcXVpcmUoXCIuL21hcmtcIilcbnJlcXVpcmUoXCIuL3NlbGVjdC1saW5lXCIpXG5yZXF1aXJlKFwiLi9zZWxlY3Qtd29yZFwiKVxucmVxdWlyZShcIi4vc3BsaXQtaW50by1saW5lc1wiKVxucmVxdWlyZShcIi4vdGV4dC1tb2RlXCIpXG5cbk9iamVjdC5hc3NpZ24oQ29kZU1pcnJvci5kZWZhdWx0cywge1xuICBsaW5lTnVtYmVyczogdHJ1ZSxcbiAgdGFiU2l6ZTogNCxcbiAgc2hvd0N1cnNvcldoZW5TZWxlY3Rpbmc6IHRydWUsXG4gIGF1dG9DbG9zZUJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaEJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaFRhZ3M6IHRydWUsXG4gIGF1dG9DbG9zZVRhZ3M6IHRydWUsXG4gIHN0eWxlQWN0aXZlTGluZToge25vbkVtcHR5OiB0cnVlfSxcbiAgc3R5bGVTZWxlY3RlZFRleHQ6IHRydWUsXG4gIGRyYWdEcm9wOiBmYWxzZSxcbiAgZXh0cmFLZXlzOiB7XG4gICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgIFwiVGFiXCI6IFwiaW5kZW50QXV0b1wiLFxuICAgIFwiQ3RybC1EXCI6IGZhbHNlLFxuICAgIFwiQ21kLURcIjogZmFsc2UsXG4gIH0sXG59KVxuXG5Db2RlTWlycm9yLmRlZmluZUluaXRIb29rKGZ1bmN0aW9uKGNtKSB7XG4gIC8vIG1haW50YWluIGluZGVudGF0aW9uIG9uIHBhc3RlXG4gIGNtLm9uKFwiYmVmb3JlQ2hhbmdlXCIsIHJlcXVpcmUoXCIuL2luZGVudC1hZnRlci1wYXN0ZVwiKSlcbiAgXG4gIC8vIGtleSBiaW5kaW5nc1xuICB2YXIgaW5wdXQgPSBjbS5nZXRJbnB1dEZpZWxkKClcbiAgaW5wdXQuY2xhc3NOYW1lICs9IFwiIG1vdXNldHJhcFwiIC8vIGVuYWJsZSBob3RrZXlcbiAgdmFyIGtleW1hcCA9IHtcbiAgICBcImFsdCtiXCI6IFwiZ29Xb3JkTGVmdFwiLFxuICAgIFwiYWx0K2ZcIjogXCJnb1dvcmRSaWdodFwiLFxuICAgIFwiYWx0K2hcIjogXCJkZWxXb3JkQmVmb3JlXCIsXG4gICAgXCJhbHQrZFwiOiBcImRlbFdvcmRBZnRlclwiLFxuICAgIFwibW9kK21cIjogXCJtYXJrXCIsXG4gICAgXCJtb2QrZFwiOiBcInNlbGVjdFdvcmRcIixcbiAgICBcIm1vZCtsXCI6IFwic2VsZWN0TGluZVwiLFxuICAgIFwibW9kK3NoaWZ0K2xcIjogXCJzcGxpdEludG9MaW5lc1wiLFxuICB9XG4gIF8uZWFjaChrZXltYXAsIGZ1bmN0aW9uKGNvbW1hbmQsIGtleSkge1xuICAgIE1vdXNldHJhcChpbnB1dCkuYmluZChrZXksIGZ1bmN0aW9uKCkge1xuICAgICAgY20uZXhlY0NvbW1hbmQoY29tbWFuZClcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pXG4gIH0pXG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVNaXJyb3JcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5kZWZpbmVJbml0SG9vayhmdW5jdGlvbihjbSkge1xuICBjbS5tYXJrcyA9IFtdXG59KVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLm1hcmsgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgY3Vyc29yID0gY20uZ2V0Q3Vyc29yKClcbiAgaWYgKG1hcmtzLmxlbmd0aCkge1xuICAgIHZhciBsYXN0ID0gY20ubWFya3NbY20ubWFya3MubGVuZ3RoIC0gMV1cbiAgICBpZiAobGFzdC5saW5lID09IGN1cnNvci5saW5lICYmIGxhc3QuY2ggPT0gY3Vyc29yLmNoKSB7XG4gICAgICBjbS5zZXRTZWxlY3Rpb25zKGNtLm1hcmtzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHJldHVybiB7aGVhZDogbSwgYW5jaG9yOiBtfVxuICAgICAgfSksIGNtLm1hcmtzLmxlbmd0aCAtIDEpXG4gICAgICBjbS5tYXJrcyA9IFtdXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgY20ubWFya3MucHVzaChjdXJzb3IpXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0TGluZSA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9LFxuICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgbGluZTogaS5hbmNob3IubGluZSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIClcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zZWxlY3RXb3JkID0gZnVuY3Rpb24oY20pIHtcbiAgY20uc2V0U2VsZWN0aW9ucyhcbiAgICBjbS5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gY20uZmluZFdvcmRBdChpLmFuY2hvcilcbiAgICB9KVxuICApXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc3BsaXRJbnRvTGluZXMgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGNtLmxpc3RTZWxlY3Rpb25zKClcbiAgaWYgKHNlbGVjdGlvbnMubGVuZ3RoICE9IDEpIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gICAgcmV0dXJuXG4gIH1cbiAgdmFyIGFuY2hvciA9IHNlbGVjdGlvbnNbMF0uYW5jaG9yXG4gIHZhciBoZWFkID0gc2VsZWN0aW9uc1swXS5oZWFkXG4gIHZhciBuZXdfc2VsZWN0aW9ucyA9IFtdXG4gIGZvciAodmFyIGkgPSBhbmNob3IubGluZTsgaSA8PSBoZWFkLmxpbmU7ICsraSkge1xuICAgIG5ld19zZWxlY3Rpb25zLnB1c2goe1xuICAgICAgYW5jaG9yOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGFuY2hvci5saW5lID8gYW5jaG9yLmNoIDogMCxcbiAgICAgIH0sXG4gICAgICBoZWFkOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGhlYWQubGluZSA/IGhlYWQuY2ggOiBJbmZpbml0eSxcbiAgICAgIH0sXG4gICAgfSlcbiAgfVxuICBjbS5zZXRTZWxlY3Rpb25zKG5ld19zZWxlY3Rpb25zKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmRlZmluZVNpbXBsZU1vZGUoXCJ0ZXh0XCIsIHtcbiAgc3RhcnQ6IFtdLFxuICBjb21tZW50OiBbXSxcbiAgbWV0YToge30sXG59KVxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRWRpdG9yVmlldyA9IHJlcXVpcmUoXCIuL2VkaXRvci12aWV3XCIpXG5cbnZhciBFZGl0b3JNYW5hZ2VyVmlldyA9IGZ1bmN0aW9uKCRyb290LCBlZGl0b3JfbWdyKSB7XG4gIHZhciBlZGl0b3JzID0ge31cbiAgdmFyICR0YWJzID0gJChcIjxkaXY+XCIpLmF0dHIoXCJpZFwiLCBcImZpbGVzXCIpLmFwcGVuZFRvKCRyb290KVxuICB2YXIgJGVkaXRvcnMgPSAkKFwiPGRpdj5cIikuYXR0cihcImlkXCIsIFwiZWRpdG9yc1wiKS5hcHBlbmRUbygkcm9vdClcbiAgXG4gIGVkaXRvcl9tZ3Iub3BlbmVkLmFkZChmdW5jdGlvbihlZGl0b3IpIHtcbiAgICB2YXIgcGF0aCA9IGVkaXRvci5nZXRQYXRoKClcbiAgICB2YXIgZGlyID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKyRcIiksIFwiXCIpXG4gICAgdmFyIG5hbWUgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIi4qL1wiKSwgXCJcIilcbiAgICB2YXIgJHRhYiA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImZpbGUtaXRlbVwiKS5hcHBlbmQoXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJkaXJcIikudGV4dChkaXIpLFxuICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwibmFtZVwiKS50ZXh0KG5hbWUpLFxuICAgICAgJCgnPGRpdiBjbGFzcz1cInN0YXR1cyBjbGVhblwiPicpXG4gICAgKS5hcHBlbmRUbygkdGFicylcbiAgICAvLyBzdGF0dXMgaW4gdGFiXG4gICAgZWRpdG9yLnN0YXR1cy5vYnNlcnZlKGZ1bmN0aW9uKHN0YXR1cykge1xuICAgICAgJHRhYi5maW5kKFwiLnN0YXR1c1wiKS5yZW1vdmVDbGFzcyhcImNsZWFuIGVycm9yIG1vZGlmaWVkXCIpLmFkZENsYXNzKHN0YXR1cylcbiAgICB9KVxuICAgIC8vIGVkaXRvciB2aWV3XG4gICAgdmFyICRlZGl0b3IgPSAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJlZGl0b3JcIikuYXBwZW5kVG8oJGVkaXRvcnMpXG4gICAgdmFyIGVkaXRvcl92aWV3ID0gRWRpdG9yVmlldygkZWRpdG9yLCBlZGl0b3IsIGVkaXRvcl9tZ3IpXG4gICAgXG4gICAgZWRpdG9yc1twYXRoXSA9IHtcbiAgICAgICR0YWI6ICR0YWIsXG4gICAgICAkZWRpdG9yOiAkZWRpdG9yLFxuICAgIH1cbiAgfSlcbiAgXG4gIGVkaXRvcl9tZ3IuY2xvc2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgZWRpdG9yc1twYXRoXS4kdGFiLnJlbW92ZSgpXG4gICAgZWRpdG9yc1twYXRoXS4kZWRpdG9yLnJlbW92ZSgpXG4gICAgZGVsZXRlIGVkaXRvcnNbcGF0aF1cbiAgfSlcbiAgXG4gIGVkaXRvcl9tZ3IuYWN0aXZhdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgJHRhYnMuZmluZChcIi5maWxlLWl0ZW0uYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBlZGl0b3JzW3BhdGhdLiR0YWIuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgfSlcbiAgXG4gICR0YWJzLm9uKFwiY2xpY2tcIiwgXCIuZmlsZS1pdGVtXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICB2YXIgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuICAgIHZhciBwYXRoID0gXy5maW5kS2V5KGVkaXRvcnMsIGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBpLiR0YWIuaXMoJHRhcmdldClcbiAgICB9KVxuICAgIGVkaXRvcl9tZ3IuYWN0aXZhdGUocGF0aClcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JNYW5hZ2VyVmlld1xuIiwidmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIEZpbGUgPSByZXF1aXJlKFwiLi9maWxlXCIpXG52YXIgRWRpdG9yID0gcmVxdWlyZShcIi4vZWRpdG9yXCIpXG5cbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBvcGVuZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGNsb3NlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgYWN0aXZhdGVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBcbiAgICBhY3RpdmU6IG51bGwsIC8vIHBhdGggb2YgYWN0aXZlIGZpbGVcbiAgICBlZGl0b3JzOiBbXSxcbiAgICBcbiAgICBnZXRGaWxlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZWRpdG9ycy5tYXAoZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgICAgIHJldHVybiBlZGl0b3IuZ2V0UGF0aCgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgb3BlbjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgXCJUaGUgcGF0aCBpcyBudWxsXCJcbiAgICAgIH1cbiAgICAgIC8vIHRyeSB0byBhY3RpdmF0ZSBhbHJlYWR5IG9wZW5lZCBmaWxlc1xuICAgICAgaWYgKG1vZGVsLmFjdGl2YXRlKHBhdGgpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGVkaXRvciA9IEVkaXRvcihGaWxlKHBhdGgpKVxuICAgICAgZWRpdG9yLmxvYWQoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RlbC5lZGl0b3JzLnB1c2goZWRpdG9yKVxuICAgICAgICBtb2RlbC5vcGVuZWQuZGlzcGF0Y2goZWRpdG9yKVxuICAgICAgICBtb2RlbC5hY3RpdmF0ZShwYXRoKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGdldEFjdGl2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuYWN0aXZlXG4gICAgfSxcbiAgICBcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgICAgaWYgKHBhdGggIT09IG51bGwgJiYgbW9kZWwuaW5kZXhPZihwYXRoKSA9PSAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFjdGl2ZSA9IHBhdGhcbiAgICAgIG1vZGVsLmFjdGl2YXRlZC5kaXNwYXRjaChwYXRoKVxuICAgICAgZmluZGVyLnNldFBhdGgocGF0aClcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSxcbiAgICBcbiAgICBuZXh0RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKHRydWUpXG4gICAgfSxcbiAgICBcbiAgICBwcmV2RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKGZhbHNlKVxuICAgIH0sXG4gICAgXG4gICAgcm90YXRlRmlsZTogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmVkaXRvcnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4XG4gICAgICBpZiAobW9kZWwuYWN0aXZlID09PSBudWxsKSB7XG4gICAgICAgIGlkeCA9IG5leHQgPyAwIDogbW9kZWwuZWRpdG9ycy5sZW5ndGggLSAxXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWR4ID0gbW9kZWwuaW5kZXhPZihtb2RlbC5hY3RpdmUpXG4gICAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgICBpZHggPSAoaWR4ICsgbW9kZWwuZWRpdG9ycy5sZW5ndGgpICUgbW9kZWwuZWRpdG9ycy5sZW5ndGhcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFjdGl2YXRlKG1vZGVsLmVkaXRvcnNbaWR4XS5nZXRQYXRoKCkpXG4gICAgfSxcbiAgICBcbiAgICBjbG9zZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgdmFyIGlkeCA9IG1vZGVsLmluZGV4T2YocGF0aClcbiAgICAgIGlmIChpZHggPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIGlmIChtb2RlbC5lZGl0b3JzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgbW9kZWwuYWN0aXZhdGUobnVsbClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtb2RlbC5wcmV2RmlsZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG1vZGVsLmVkaXRvcnMuc3BsaWNlKGlkeCwgMSlcbiAgICAgIG1vZGVsLmNsb3NlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgcmVsb2FkOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5jbG9zZShwYXRoKVxuICAgICAgbW9kZWwub3BlbihwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgaW5kZXhPZjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmdldEZpbGVzKCkuaW5kZXhPZihwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci5zZWxlY3RlZC5hZGQobW9kZWwub3BlbilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvck1hbmFnZXJcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiLi9jb2RlbWlycm9yXCIpXG5cbnZhciBFZGl0b3JWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIGVkaXRvciwgZWRpdG9yX21ncikge1xuICB2YXIgZmlsZSA9IGVkaXRvci5nZXRGaWxlKClcbiAgXG4gIHZhciBjbSA9IENvZGVNaXJyb3IoJHJvb3RbMF0sIHtcbiAgICB2YWx1ZTogZWRpdG9yLnRleHQuZ2V0KCksXG4gICAgbW9kZTogZWRpdG9yLm1vZGUuZ2V0KCksXG4gIH0pXG4gIFxuICAvLyBmb290ZXJcbiAgJHJvb3QuYXBwZW5kKFxuICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZm9vdFwiPicpLmFwcGVuZChcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbWVzc2FnZVwiPicpLFxuICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1pbmRlbnQgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZW9sXCI+JyksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVuY29kaW5nXCI+JyksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1vZGVcIj4nKVxuICAgIClcbiAgKVxuICBcbiAgLy8gc2F2ZVxuICB2YXIgbGFzdF9nZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBnZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICAgIGVkaXRvci5zYXZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGxhc3RfZ2VuZXJhdGlvbiA9IGdlbmVyYXRpb25cbiAgICB9KVxuICB9XG4gIGNtLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IudGV4dC5zZXQoY20uZ2V0VmFsdWUoKSlcbiAgICBlZGl0b3Iuc3RhdHVzLnNldChcbiAgICAgIGNtLmlzQ2xlYW4obGFzdF9nZW5lcmF0aW9uKSA/IFwiY2xlYW5cIiA6IFwibW9kaWZpZWRcIlxuICAgIClcbiAgfSlcbiAgZWRpdG9yLnRleHQub2JzZXJ2ZShmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKHRleHQgIT0gY20uZ2V0VmFsdWUoKSkge1xuICAgICAgY20uc2V0VmFsdWUodGV4dClcbiAgICB9XG4gIH0pXG5cbiAgLy8gbW9kZVxuICB2YXIgdXBkYXRlTW9kZSA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICBjbS5zZXRPcHRpb24oXCJtb2RlXCIsIG1vZGUpXG4gICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKVxuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlKVxuICB9XG4gIGVkaXRvci5tb2RlLm9ic2VydmUodXBkYXRlTW9kZSlcbiAgdXBkYXRlTW9kZShlZGl0b3IubW9kZS5nZXQoKSlcbiAgXG4gIC8vIGluZGVudFxuICB2YXIgdXBkYXRlSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpXG4gICAgaWYgKHR5cGUgPT0gXCJUQUJcIikge1xuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjbS5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCBmYWxzZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgTnVtYmVyKHR5cGUucmVwbGFjZShcIlNQXCIsIFwiXCIpKSlcbiAgICB9XG4gIH1cbiAgZWRpdG9yLmluZGVudC5vYnNlcnZlKHVwZGF0ZUluZGVudClcbiAgdXBkYXRlSW5kZW50KGVkaXRvci5pbmRlbnQuZ2V0KCkpXG4gICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IuaW5kZW50LnJvdGF0ZSgpXG4gIH0pXG4gIFxuICAvLyBsaW5lIHNlcHJhdG9yXG4gIHZhciB1cGRhdGVFb2wgPSBmdW5jdGlvbihlb2wpIHtcbiAgICB2YXIgbmFtZXMgPSB7XG4gICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICBcIlxcblwiOiBcIkxGXCIsXG4gICAgICBcIlxcclxcblwiOiBcIkNSTEZcIixcbiAgICB9XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQobmFtZXNbZW9sXSlcbiAgfVxuICBmaWxlLmVvbC5hZGQodXBkYXRlRW9sKVxuICB1cGRhdGVFb2woZmlsZS5lb2wuZ2V0KCkpXG4gIFxuICAvLyBlbmNvZGluZ1xuICB2YXIgdXBkYXRlRW5jb2RpbmcgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLWVuY29kaW5nXCIpLnRleHQoZW5jb2RpbmcpXG4gIH1cbiAgZmlsZS5lbmNvZGluZy5hZGQodXBkYXRlRW5jb2RpbmcpXG4gIHVwZGF0ZUVuY29kaW5nKGZpbGUuZW5jb2RpbmcuZ2V0KCkpXG4gIFxuICAvLyBtZXNzYWdlXG4gIGVkaXRvci5tZXNzYWdlLm9ic2VydmUoZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLW1lc3NhZ2VcIikudGV4dChtZXNzYWdlKVxuICB9KVxuICBcbiAgLy8gYWN0aXZlXG4gIGVkaXRvcl9tZ3IuYWN0aXZhdGVkLmFkZChmdW5jdGlvbihhY3RpdmUpIHtcbiAgICBpZiAoYWN0aXZlID09IGZpbGUuZ2V0UGF0aCgpKSB7XG4gICAgICAkcm9vdC5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgICAgY20uZm9jdXMoKVxuICAgICAgY20ucmVmcmVzaCgpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJHJvb3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICB9XG4gIH0pXG4gIFxuICAvLyBzYXZlIHdpdGggY29tbWFuZC1zXG4gIE1vdXNldHJhcCgkcm9vdFswXSkuYmluZChcIm1vZCtzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHNhdmUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvclZpZXdcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIE9ic2VydmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcnZhYmxlXCIpXG52YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCIuL2NvZGVtaXJyb3JcIilcbnZhciBJbmRlbnQgPSByZXF1aXJlKFwiLi9pbmRlbnRcIilcblxudmFyIEVkaXRvciA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgdmFyIGVkaXRvciA9IHtcbiAgICB0ZXh0OiBPYnNlcnZhYmxlKFwiXCIpLFxuICAgIHN0YXR1czogT2JzZXJ2YWJsZShcImNsZWFuXCIpLFxuICAgIG1vZGU6IE9ic2VydmFibGUoXCJ0ZXh0XCIpLFxuICAgIGluZGVudDogSW5kZW50KCksXG4gICAgbWVzc2FnZTogT2JzZXJ2YWJsZShcIlwiKSxcbiAgICBcbiAgICBnZXRGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmaWxlXG4gICAgfSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmaWxlLmdldFBhdGgoKVxuICAgIH0sXG4gICAgXG4gICAgbG9hZDogZnVuY3Rpb24odGV4dCkge1xuICAgICAgcmV0dXJuIGZpbGUucmVhZCgpLnRoZW4oZnVuY3Rpb24odGV4dCkge1xuICAgICAgICBlZGl0b3IuaW5kZW50LnNldChJbmRlbnQuZGV0ZWN0SW5kZW50VHlwZSh0ZXh0KSlcbiAgICAgICAgZWRpdG9yLnRleHQuc2V0KHRleHQpXG4gICAgICAgIGVkaXRvci5tZXNzYWdlLnNldChcIkxvYWRlZC5cIilcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBzYXZlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmaWxlLndyaXRlKGVkaXRvci50ZXh0LmdldCgpKS5jYXRjaChmdW5jdGlvbihlcnJvcikge1xuICAgICAgICBlZGl0b3IubWVzc2FnZS5zZXQoXCJTYXZlIGZhaWxlZC4gXCIgKyByZXBseS5lcnJvcilcbiAgICAgICAgZWRpdG9yLnN0YXR1cy5zZXQoXCJlcnJvclwiKVxuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgZWRpdG9yLnN0YXR1cy5zZXQoXCJjbGVhblwiKVxuICAgICAgICBlZGl0b3IubWVzc2FnZS5zZXQoXCJTYXZlZC5cIilcbiAgICAgIH0pXG4gICAgfSxcbiAgfVxuICBcbiAgdmFyIGRldGVjdE1vZGUgPSAoZnVuY3Rpb24ocGF0aCkge1xuICAgIHZhciBleHRlbnNpb24gPSBwYXRoLnJlcGxhY2UoLy4qWy5dKC4rKSQvLCBcIiQxXCIpXG4gICAgdmFyIG1vZGUgPSB7XG4gICAgICBodG1sOiBcInBocFwiLFxuICAgICAgdGFnOiBcInBocFwiLFxuICAgIH1bZXh0ZW5zaW9uXVxuICAgIGlmIChtb2RlKSB7XG4gICAgICByZXR1cm4gbW9kZVxuICAgIH1cbiAgICBtb2RlID0gQ29kZU1pcnJvci5maW5kTW9kZUJ5RXh0ZW5zaW9uKGV4dGVuc2lvbilcbiAgICBpZiAobW9kZSkge1xuICAgICAgcmV0dXJuIG1vZGUubW9kZVxuICAgIH1cbiAgICByZXR1cm4gXCJ0ZXh0XCJcbiAgfSlcbiAgZWRpdG9yLm1vZGUuc2V0KGRldGVjdE1vZGUoZmlsZS5nZXRQYXRoKCkpKVxuICBcbiAgLy8gYXV0byBzYXZlXG4gIGVkaXRvci50ZXh0Lm9ic2VydmUoXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICBpZiAoZWRpdG9yLnN0YXR1cy5nZXQoKSAhPSBcImNsZWFuXCIpIHtcbiAgICAgIGVkaXRvci5zYXZlKClcbiAgICB9XG4gIH0sIDQwMDApKVxuICBcbiAgcmV0dXJuIGVkaXRvclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvclxuIiwidmFyIFJvdGF0ZSA9IHJlcXVpcmUoXCIuL3JvdGF0ZVwiKVxuXG52YXIgRW9sID0gZnVuY3Rpb24oZW9sKSB7XG4gIHJldHVybiBSb3RhdGUoW1wiXFxuXCIsIFwiXFxyXFxuXCIsIFwiXFxyXCJdLCBlb2wpXG59XG5cbkVvbC5kZXRlY3QgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIGlmICh0ZXh0Lm1hdGNoKFwiXFxyXFxuXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXFxuXCJcbiAgfVxuICBpZiAodGV4dC5tYXRjaChcIlxcclwiKSkge1xuICAgIHJldHVybiBcIlxcclwiXG4gIH1cbiAgcmV0dXJuIFwiXFxuXCJcbn1cblxuRW9sLnJlZ3VsYXRlID0gZnVuY3Rpb24odGV4dCkge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC8oXFxyXFxufFxccikvLCBcIlxcblwiKVxufSxcblxubW9kdWxlLmV4cG9ydHMgPSBFb2xcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIE9ic2VydmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcnZhYmxlXCIpXG52YXIgRW9sID0gcmVxdWlyZShcIi4vZW9sXCIpXG5cbnZhciBGaWxlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgZmlsZSA9IHtcbiAgICBlb2w6IEVvbCgpLFxuICAgIGVuY29kaW5nOiBPYnNlcnZhYmxlKCksXG4gICAgXG4gICAgZ2V0UGF0aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGF0aFxuICAgIH0sXG4gICAgXG4gICAgcmVhZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICB1cmw6IFwiL3JlYWQucGhwXCIsXG4gICAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgICB9KS5mYWlsKHJlamVjdCkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgIGZpbGUuZW5jb2Rpbmcuc2V0KHJlcGx5LmVuY29kaW5nKVxuICAgICAgICAgIGZpbGUuZW9sLnNldChFb2wuZGV0ZWN0KHJlcGx5LmNvbnRlbnQpKVxuICAgICAgICAgIHZhciBjb250ZW50ID0gRW9sLnJlZ3VsYXRlKHJlcGx5LmNvbnRlbnQpXG4gICAgICAgICAgcmVzb2x2ZShjb250ZW50KVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHdyaXRlOiBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiBcIi93cml0ZS5waHBcIixcbiAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgIGVuY29kaW5nOiBmaWxlLmVuY29kaW5nLmdldCgpLFxuICAgICAgICAgICAgY29udGVudDogdGV4dC5yZXBsYWNlKC9cXG4vZywgZmlsZS5lb2wuZ2V0KCkpXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgICBpZiAocmVwbHkgPT0gXCJva1wiKSB7XG4gICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZWplY3QocmVwbHkuZXJyb3IpXG4gICAgICAgICAgfVxuICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJlamVjdChcIlwiKVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9LFxuICB9XG4gIHJldHVybiBmaWxlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZVxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG5cbnZhciBGaW5kZXJTdWdnZXN0VmlldyA9IGZ1bmN0aW9uKCRyb290LCBtb2RlbCkge1xuICB2YXIgJGxpc3QgPSAkcm9vdFxuICBcbiAgdmFyIHZpZXcgPSB7XG4gICAgdXBkYXRlSXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICAkbGlzdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKS5lbXB0eSgpXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09IDEgJiYgaXRlbXNbMF0gPT0gbW9kZWwuZ2V0Q3Vyc29yKCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgbmFtZV9yeCA9IG5ldyBSZWdFeHAoXCIvKFteL10qLz8pJFwiKVxuICAgICAgJGxpc3QuYXBwZW5kKGl0ZW1zLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHZhciBuYW1lID0gbmFtZV9yeC5leGVjKGl0ZW0pWzFdXG4gICAgICAgIHJldHVybiAkKFwiPGE+XCIpLnRleHQobmFtZSkuZGF0YShcInBhdGhcIiwgaXRlbSlcbiAgICAgIH0pKVxuICAgICAgJGxpc3Quc2Nyb2xsVG9wKDApLmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICRsaXN0LmZpbmQoXCJhLnNlbGVjdGVkXCIpLnJlbW92ZUNsYXNzKFwic2VsZWN0ZWRcIilcbiAgICAgIGlmIChwYXRoID09PSBudWxsKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGEgPSAkbGlzdC5maW5kKFwiYVwiKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkKHRoaXMpLmRhdGEoXCJwYXRoXCIpID09IHBhdGhcbiAgICAgIH0pXG4gICAgICBpZiAoYS5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGEuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKVxuXG4gICAgICAvLyBzY3JvbGwgdGhlIGxpc3QgdG8gbWFrZSB0aGUgc2VsZWN0ZWQgaXRlbSB2aXNpYmxlXG4gICAgICB2YXIgc2Nyb2xsSW50b1ZpZXcgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRhcmdldC5oZWlnaHQoKVxuICAgICAgICB2YXIgdG9wID0gdGFyZ2V0LnByZXZBbGwoKS5sZW5ndGggKiBoZWlnaHRcbiAgICAgICAgdmFyIGJvdHRvbSA9IHRvcCArIGhlaWdodFxuICAgICAgICB2YXIgdmlld19oZWlnaHQgPSAkbGlzdC5pbm5lckhlaWdodCgpXG4gICAgICAgIGlmICh0b3AgLSAkbGlzdC5zY3JvbGxUb3AoKSA8IDApIHtcbiAgICAgICAgICAkbGlzdC5zY3JvbGxUb3AodG9wKVxuICAgICAgICB9XG4gICAgICAgIGlmIChib3R0b20gLSAkbGlzdC5zY3JvbGxUb3AoKSA+IHZpZXdfaGVpZ2h0KSB7XG4gICAgICAgICAgJGxpc3Quc2Nyb2xsVG9wKGJvdHRvbSAtIHZpZXdfaGVpZ2h0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzY3JvbGxJbnRvVmlldyhhKVxuICAgIH1cbiAgfVxuICBcbiAgbW9kZWwuaXRlbXNfY2hhbmdlZC5hZGQodmlldy51cGRhdGVJdGVtcylcbiAgbW9kZWwuY3Vyc29yX21vdmVkLmFkZCh2aWV3LnVwZGF0ZUN1cnNvcilcbiAgXG4gIC8vIHdoZW4gaXRlbSB3YXMgc2VsZWN0ZWRcbiAgJGxpc3Qub24oXCJjbGlja1wiLCBcImFcIiwgZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIG1vZGVsLnNlbGVjdCgkKGUudGFyZ2V0KS5kYXRhKFwicGF0aFwiKSlcbiAgfSlcbiAgXG4gIC8vIHByZXZlbnQgZnJvbSBsb29zaW5nIGZvY3VzXG4gICRsaXN0Lm9uKFwibW91c2Vkb3duXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIH0pXG4gIFxuICByZXR1cm4gdmlld1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RWaWV3XG4iLCJ2YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcblxudmFyIEZpbmRlclN1Z2dlc3QgPSBmdW5jdGlvbihmaW5kZXIpIHtcbiAgdmFyIG1vZGVsID0ge1xuICAgIGl0ZW1zOiBbXSxcbiAgICBjdXJzb3I6IG51bGwsIC8vIGhpZ2hsaWdodGVkIGl0ZW1cbiAgICBcbiAgICBpdGVtc19jaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgY3Vyc29yX21vdmVkOiBuZXcgU2lnbmFsKCksXG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgIHVybDogXCIvZmluZGVyLnBocFwiLFxuICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJmYWlsZWQgdG8gZmV0Y2ggc3VnZ2VzdCBmb3IgdGhlIHBhdGg6IFwiICsgcGF0aClcbiAgICAgIH0pLmRvbmUoZnVuY3Rpb24ocmVwbHkpIHtcbiAgICAgICAgbW9kZWwuc2V0SXRlbXMocmVwbHkuaXRlbXMubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICByZXR1cm4gcmVwbHkuYmFzZSArIGlcbiAgICAgICAgfSkpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgc2V0SXRlbXM6IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IobnVsbClcbiAgICAgIG1vZGVsLml0ZW1zID0gaXRlbXNcbiAgICAgIG1vZGVsLml0ZW1zX2NoYW5nZWQuZGlzcGF0Y2gobW9kZWwuaXRlbXMpXG4gICAgfSxcbiAgICBcbiAgICBnZXRJdGVtczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuaXRlbXNcbiAgICB9LFxuICAgIFxuICAgIGdldEN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuY3Vyc29yXG4gICAgfSxcbiAgICBcbiAgICBzZXRDdXJzb3I6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIGlmIChwYXRoID09PSBtb2RlbC5jdXJzb3IpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtb2RlbC5jdXJzb3IgPSBwYXRoXG4gICAgICBtb2RlbC5jdXJzb3JfbW92ZWQuZGlzcGF0Y2gobW9kZWwuY3Vyc29yKVxuICAgIH0sXG4gICAgXG4gICAgbW92ZUN1cnNvcjogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmN1cnNvciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAobW9kZWwuaXRlbXMubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbMF0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gbW9kZWwuaXRlbXMuaW5kZXhPZihtb2RlbC5jdXJzb3IpXG4gICAgICBpZHggKz0gbmV4dCA/ICsxIDogLTFcbiAgICAgIGlkeCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vZGVsLml0ZW1zLmxlbmd0aCAtIDEsIGlkeCkpXG4gICAgICBtb2RlbC5zZXRDdXJzb3IobW9kZWwuaXRlbXNbaWR4XSlcbiAgICB9LFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0Q3Vyc29yKHBhdGgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci52aXNpYmlsaXR5X2NoYW5nZWQuYWRkKGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgbW9kZWwudXBkYXRlKGZpbmRlci5nZXRQYXRoKCkpXG4gICAgfVxuICB9KVxuICBcbiAgZmluZGVyLnBhdGhfY2hhbmdlZC5hZGQoXy5kZWJvdW5jZShtb2RlbC51cGRhdGUsIDI1MCkpXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJTdWdnZXN0XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBNb3VzZXRyYXAgPSByZXF1aXJlKFwibW91c2V0cmFwXCIpXG52YXIgRmFsc2UgPSByZXF1aXJlKFwiLi9yZXR1cm4tZmFsc2VcIilcbnZhciBJbnB1dFdhdGNoZXIgPSByZXF1aXJlKFwiLi9pbnB1dC13YXRjaGVyXCIpXG52YXIgRmluZGVyU3VnZ2VzdFZpZXcgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdC12aWV3XCIpXG5cbnZhciBGaW5kZXJWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIGZpbmRlcikge1xuICB2YXIgJHBhdGhfaW5wdXQgPSAkKFxuICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cImZpbmRlci1wYXRoXCIgY2xhc3M9XCJtb3VzZXRyYXBcIiBhdXRvY29tcGxldGU9XCJvZmZcIiB2YWx1ZT1cIi9cIj4nXG4gICkuYXBwZW5kVG8oJHJvb3QpXG4gIFxuICB2YXIgcGF0aF93YXRjaGVyID0gSW5wdXRXYXRjaGVyKCRwYXRoX2lucHV0LCA1MClcbiAgcGF0aF93YXRjaGVyLmNoYW5nZWQuYWRkKGZpbmRlci5zZXRQYXRoKVxuICBcbiAgdmFyIHZpZXcgPSB7XG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICAkcm9vdC5hZGRDbGFzcyhcImFjdGl2ZVwiKVxuICAgICAgJHBhdGhfaW5wdXQuZm9jdXMoKVxuICAgICAgcGF0aF93YXRjaGVyLnN0YXJ0KClcbiAgICB9LFxuICAgIFxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgJHJvb3QucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIilcbiAgICAgIHBhdGhfd2F0Y2hlci5zdG9wKClcbiAgICB9LFxuICB9XG4gIFxuICAvLyBoaWRlIG9uIGJsdXJcbiAgJHBhdGhfaW5wdXQuYmx1cihmaW5kZXIuaGlkZSgpKVxuICBcbiAgZmluZGVyLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICB2aWV3LnNob3coKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZpZXcuaGlkZSgpXG4gICAgfVxuICB9KVxuICBcbiAgZmluZGVyLnBhdGhfY2hhbmdlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgICRwYXRoX2lucHV0LnZhbChwYXRoKVxuICB9KVxuICBcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwiZW50ZXJcIiwgRmFsc2UoZmluZGVyLmVudGVyKSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwidGFiXCIsIEZhbHNlKGZpbmRlci50YWIpKVxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJlc2NcIiwgRmFsc2UoZmluZGVyLmhpZGUpKVxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJkb3duXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zdWdnZXN0Lm1vdmVDdXJzb3IodHJ1ZSlcbiAgfSkpXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcInVwXCIsIEZhbHNlKGZ1bmN0aW9uKCkge1xuICAgIGZpbmRlci5zdWdnZXN0Lm1vdmVDdXJzb3IoZmFsc2UpXG4gIH0pKVxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJtb2QrdVwiLCBGYWxzZShcbiAgICBmaW5kZXIuZ29Ub1BhcmVudERpcmVjdG9yeVxuICApKVxuICBcbiAgLy8gc3VnZ2VzdCB2aWV3XG4gIHZhciAkaXRlbXMgPSAkKCc8ZGl2IGlkPVwiZmluZGVyLWl0ZW1zXCI+JykuYXBwZW5kVG8oJHJvb3QpXG4gIEZpbmRlclN1Z2dlc3RWaWV3KCRpdGVtcywgZmluZGVyLnN1Z2dlc3QpXG4gIFxuICByZXR1cm4gdmlld1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclZpZXdcbiIsInZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcbnZhciBGaW5kZXJTdWdnZXN0ID0gcmVxdWlyZShcIi4vZmluZGVyLXN1Z2dlc3RcIilcblxudmFyIEZpbmRlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgc2VsZWN0ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBwYXRoX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICB2aXNpYmlsaXR5X2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBcbiAgICBwYXRoOiBcIlwiLFxuICAgIHZpc2libGU6IGZhbHNlLFxuICAgIFxuICAgIHNlbGVjdDogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChwYXRoKVxuICAgICAgaWYgKHBhdGguc3Vic3RyKC0xKSA9PSBcIi9cIikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmhpZGUoKVxuICAgICAgbW9kZWwuc2VsZWN0ZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwudmlzaWJsZSA9IHRydWVcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gZmFsc2VcbiAgICAgIG1vZGVsLnZpc2liaWxpdHlfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC52aXNpYmxlKVxuLy8gICAgICAgZWRpdG9yX21hbmFnZXIuYWN0aXZhdGUoZWRpdG9yX21hbmFnZXIuZ2V0QWN0aXZlKCkpXG4gICAgfSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5wYXRoXG4gICAgfSxcbiAgICBcbiAgICBzZXRQYXRoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5wYXRoID0gcGF0aFxuICAgICAgbW9kZWwucGF0aF9jaGFuZ2VkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgICBcbiAgICBnb1RvUGFyZW50RGlyZWN0b3J5OiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnNldFBhdGgoXG4gICAgICAgIG1vZGVsLnBhdGgucmVwbGFjZShuZXcgUmVnRXhwKFwiW14vXSovPyRcIiksIFwiXCIpXG4gICAgICApXG4gICAgfSxcbiAgICBcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGF0aCA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICAgIG1vZGVsLnNlbGVjdChwYXRoID8gcGF0aCA6IG1vZGVsLnBhdGgpXG4gICAgfSxcbiAgICBcbiAgICB0YWI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHN1Z2dlc3QuZ2V0Q3Vyc29yKClcbiAgICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgbW9kZWwuc2V0UGF0aChjdXJzb3IpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGl0ZW1zID0gc3VnZ2VzdC5nZXRJdGVtcygpXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgbW9kZWwuc2V0UGF0aChpdGVtc1swXSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBzdWdnZXN0LnVwZGF0ZShtb2RlbC5wYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIHZhciBzdWdnZXN0ID0gbW9kZWwuc3VnZ2VzdCA9IEZpbmRlclN1Z2dlc3QobW9kZWwpXG4gIHN1Z2dlc3Quc2VsZWN0ZWQuYWRkKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBtb2RlbC5zZWxlY3QocGF0aClcbiAgfSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclxuIiwidmFyIFJvdGF0ZSA9IHJlcXVpcmUoXCIuL3JvdGF0ZVwiKVxuXG52YXIgSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICByZXR1cm4gUm90YXRlKFtcIjRTUFwiLCBcIjJTUFwiLCBcIlRBQlwiXSwgdHlwZSlcbn1cblxuSW5kZW50LmRldGVjdEluZGVudFR5cGUgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIGlmIChjb250ZW50Lm1hdGNoKC9bXFxyXFxuXStcXHQvKSkge1xuICAgIHJldHVybiBcIlRBQlwiXG4gIH1cbiAgdmFyIGxpbmVzID0gY29udGVudC5zcGxpdCgvW1xcclxcbl0rLylcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpbmRlbnQgPSBsaW5lc1tpXS5yZXBsYWNlKC9eKCAqKS4qLywgXCIkMVwiKVxuICAgIGlmIChpbmRlbnQubGVuZ3RoID09IDIpIHtcbiAgICAgIHJldHVybiBcIjJTUFwiXG4gICAgfVxuICB9XG4gIHJldHVybiBcIjRTUFwiXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kZW50XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcblxudmFyIElucHV0V2F0Y2hlciA9IGZ1bmN0aW9uKGlucHV0LCBpbnRlcnZhbCkge1xuICBpbnB1dCA9ICQoaW5wdXQpXG4gIFxuICB2YXIgbW9kZWwgPSB7XG4gICAgY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIGlucHV0OiBpbnB1dCxcbiAgICBpbnRlcnZhbDogaW50ZXJ2YWwsXG4gICAgbGFzdF92YWx1ZTogaW5wdXQudmFsKCksXG4gICAgdGltZXI6IG51bGwsXG4gICAgXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc3RvcCgpXG4gICAgICBtb2RlbC50aW1lciA9IHNldEludGVydmFsKG1vZGVsLmNoZWNrLCBtb2RlbC5pbnRlcnZhbClcbiAgICB9LFxuICAgIFxuICAgIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgICAgY2xlYXJJbnRlcnZhbChtb2RlbC50aW1lcilcbiAgICAgIG1vZGVsLnRpbWVyID0gbnVsbFxuICAgIH0sXG4gICAgXG4gICAgY2hlY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnJlbnQgPSBtb2RlbC5pbnB1dC52YWwoKVxuICAgICAgaWYgKGN1cnJlbnQgPT0gbW9kZWwubGFzdF92YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmNoYW5nZWQuZGlzcGF0Y2goY3VycmVudCwgbW9kZWwubGFzdF92YWx1ZSlcbiAgICAgIG1vZGVsLmxhc3RfdmFsdWUgPSBjdXJyZW50XG4gICAgfSxcbiAgICBcbiAgICBrZXlEb3duOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChtb2RlbC50aW1lcikge1xuICAgICAgICBtb2RlbC5jaGVjaygpXG4gICAgICB9XG4gICAgfSxcbiAgfVxuICBcbiAgaW5wdXQua2V5ZG93bihtb2RlbC5rZXlEb3duKVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXRXYXRjaGVyXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcbnZhciBFZGl0b3JNYW5hZ2VyVmlldyA9IHJlcXVpcmUoXCIuL2VkaXRvci1tYW5hZ2VyLXZpZXdcIilcbnZhciBGaW5kZXJWaWV3ID0gcmVxdWlyZShcIi4vZmluZGVyLXZpZXdcIilcblxudmFyIE1haW5WaWV3ID0gZnVuY3Rpb24oZWRpdG9yX21nciwgZmluZGVyKSB7XG4gIHZhciAkbWFpbiA9ICQoXCJtYWluXCIpXG4gIEVkaXRvck1hbmFnZXJWaWV3KFxuICAgICQoJzxkaXYgaWQ9XCJlZGl0b3JfbWFuYWdlclwiPicpLmFwcGVuZFRvKCRtYWluKSxcbiAgICBlZGl0b3JfbWdyXG4gIClcbiAgRmluZGVyVmlldyhcbiAgICAkKCc8Zm9ybSBpZD1cImZpbmRlclwiPicpLmFwcGVuZFRvKCRtYWluKSxcbiAgICBmaW5kZXJcbiAgKVxuICBcbiAgLy8gc2hvcnRjdXQga2V5c1xuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrXCIsIFwibW9kKz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IubmV4dEZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3NoaWZ0K1wiLCBcIm1vZCtzaGlmdCs9XCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnByZXZGaWxlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCt3XCIsIFwibW9kK2tcIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IuY2xvc2UoZWRpdG9yX21nci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCtyXCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLnJlbG9hZChlZGl0b3JfbWdyLmdldEFjdGl2ZSgpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNYWluVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBvYnNlcnZhYmxlID0gbmV3IFNpZ25hbCgpXG4gIE9iamVjdC5hc3NpZ24ob2JzZXJ2YWJsZSwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUgPT09IG5ld192YWx1ZSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBvbGRfdmFsdWUgPSB2YWx1ZVxuICAgICAgdmFsdWUgPSBuZXdfdmFsdWVcbiAgICAgIG9ic2VydmFibGUuZGlzcGF0Y2godmFsdWUsIG9sZF92YWx1ZSwgb2JzZXJ2YWJsZSlcbiAgICB9LFxuICAgIG9ic2VydmU6IG9ic2VydmFibGUuYWRkLCAvLyBhbGlhc1xuICB9KVxuICByZXR1cm4gb2JzZXJ2YWJsZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9ic2VydmFibGVcbiIsInZhciByZXR1cm5GYWxzZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmV0dXJuRmFsc2VcbiIsInZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJ2YWJsZVwiKVxuXG52YXIgUm90YXRlID0gZnVuY3Rpb24odmFsdWVzLCB2YWx1ZSkge1xuICB2YXIgaXNWYWxpZFZhbHVlID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZXMuaW5kZXhPZih2KSAhPSAtMVxuICB9XG4gIFxuICB2YXIgY2hlY2tWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoIWlzVmFsaWRWYWx1ZSh2KSkge1xuICAgICAgdGhyb3cgXCJpbnZhbGlkIHZhbHVlOiBcIiArIHZcbiAgICB9XG4gIH1cbiAgY2hlY2tWYWx1ZSh2YWx1ZSlcbiAgXG4gIHZhciByb3RhdGUgPSBPYnNlcnZhYmxlKHZhbHVlKVxuICBcbiAgcm90YXRlLmdldFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB2YWx1ZXNcbiAgfVxuICBcbiAgdmFyIF9zZXQgPSByb3RhdGUuc2V0XG4gIHJvdGF0ZS5zZXQgPSBmdW5jdGlvbihuZXdfdmFsdWUpIHtcbiAgICBjaGVja1ZhbHVlKG5ld192YWx1ZSlcbiAgICBfc2V0KG5ld192YWx1ZSlcbiAgfVxuICBcbiAgcm90YXRlLnJvdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHZhciBpZHggPSB2YWx1ZXMuaW5kZXhPZih2YWx1ZSlcbiAgICBpZHggPSAoaWR4ICsgMSkgJSB2YWx1ZXMubGVuZ3RoXG4gICAgcm90YXRlLnNldCh2YWx1ZXNbaWR4XSlcbiAgfVxuICBcbiAgcmV0dXJuIHJvdGF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdGF0ZVxuIiwidmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbnZhciBFZGl0b3JNYW5hZ2VyID0gcmVxdWlyZShcIi4vZWRpdG9yLW1hbmFnZXJcIilcbnZhciBGaW5kZXIgPSByZXF1aXJlKFwiLi9maW5kZXJcIilcbnZhciBNYWluVmlldyA9IHJlcXVpcmUoXCIuL21haW4tdmlld1wiKVxuXG5tb2R1bGUuZXhwb3J0cy5ydW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGZpbmRlciA9IEZpbmRlcigpXG4gIHZhciBlZGl0b3JfbWdyID0gRWRpdG9yTWFuYWdlcihmaW5kZXIpXG4gIHZhciB2aWV3ID0gTWFpblZpZXcoZWRpdG9yX21nciwgZmluZGVyKVxuICBcbiAgdmFyIHNhdmVGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaWxlcyA9IGVkaXRvcl9tZ3IuZ2V0RmlsZXMoKVxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwib3Blbi1maWxlc1wiLCBKU09OLnN0cmluZ2lmeShmaWxlcykpXG4gIH1cbiAgdmFyIGxvYWRGaWxlTGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwib3Blbi1maWxlc1wiKSB8fCBcIltdXCIpXG4gIH1cbiAgbG9hZEZpbGVMaXN0KCkuZm9yRWFjaChmdW5jdGlvbihwYXRoKSB7XG4gICAgZWRpdG9yX21nci5vcGVuKHBhdGgpXG4gIH0pXG4gIFxuICBlZGl0b3JfbWdyLm9wZW5lZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBlZGl0b3JfbWdyLmNsb3NlZC5hZGQoc2F2ZUZpbGVMaXN0KVxuICBcbiAgLy8gc2hvdyBmaW5kZXJcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK29cIiwgXCJtb2QrcFwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZmluZGVyLnNob3coKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbn1cbiJdfQ==
