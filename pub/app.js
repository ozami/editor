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
      $('<button class="editor-eol link" type="button">'),
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
    var idx = values.indexOf(rotate.get())
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb2RlbWlycm9yL2luZGVudC1hZnRlci1wYXN0ZS5qcyIsImpzL2NvZGVtaXJyb3IvaW5kZXguanMiLCJqcy9jb2RlbWlycm9yL21hcmsuanMiLCJqcy9jb2RlbWlycm9yL3NlbGVjdC1saW5lLmpzIiwianMvY29kZW1pcnJvci9zZWxlY3Qtd29yZC5qcyIsImpzL2NvZGVtaXJyb3Ivc3BsaXQtaW50by1saW5lcy5qcyIsImpzL2NvZGVtaXJyb3IvdGV4dC1tb2RlLmpzIiwianMvZWRpdG9yLW1hbmFnZXItdmlldy5qcyIsImpzL2VkaXRvci1tYW5hZ2VyLmpzIiwianMvZWRpdG9yLXZpZXcuanMiLCJqcy9lZGl0b3IuanMiLCJqcy9lb2wuanMiLCJqcy9maWxlLmpzIiwianMvZmluZGVyLXN1Z2dlc3Qtdmlldy5qcyIsImpzL2ZpbmRlci1zdWdnZXN0LmpzIiwianMvZmluZGVyLXZpZXcuanMiLCJqcy9maW5kZXIuanMiLCJqcy9pbmRlbnQuanMiLCJqcy9pbnB1dC13YXRjaGVyLmpzIiwianMvbWFpbi12aWV3LmpzIiwianMvb2JzZXJ2YWJsZS5qcyIsImpzL3JldHVybi1mYWxzZS5qcyIsImpzL3JvdGF0ZS5qcyIsImpzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG52YXIgaW5kZW50QWZ0ZXJQYXN0ZSA9IGZ1bmN0aW9uKGNtLCBjaGFuZ2UpIHtcbiAgaWYgKGNoYW5nZS5vcmlnaW4gIT0gXCJwYXN0ZVwiKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKENvZGVNaXJyb3IuY21wUG9zKGNoYW5nZS5mcm9tLCBjaGFuZ2UudG8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gY2hlY2sgaWYgdGhlIGluc2VydGlvbiBwb2ludCBpcyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gIHZhciBkZXN0ID0gY20uZ2V0TGluZShjaGFuZ2UuZnJvbS5saW5lKVxuICBpZiAoZGVzdC5sZW5ndGggIT0gY2hhbmdlLmZyb20uY2gpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvLyBjaGVjayBpZiB0aGUgbGluZSBjb25zaXN0cyBvZiBvbmx5IHdoaXRlIHNwYWNlc1xuICBpZiAoZGVzdC5tYXRjaCgvW14gXFx0XS8pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gcmVtb3ZlIHRoZSBsYXN0IGVtcHR5IGxpbmVcbiAgaWYgKGNoYW5nZS50ZXh0W2NoYW5nZS50ZXh0Lmxlbmd0aCAtIDFdID09IFwiXCIpIHtcbiAgICBjaGFuZ2UudGV4dC5wb3AoKVxuICB9XG4gIHZhciBiYXNlX2luZGVudCA9IGNoYW5nZS50ZXh0WzBdLm1hdGNoKC9eWyBcXHRdKi8pWzBdXG4gIGNoYW5nZS50ZXh0ID0gY2hhbmdlLnRleHQubWFwKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICBsaW5lID0gbGluZS5tYXRjaCgvXihbIFxcdF0qKSguKikvKVxuICAgIHZhciBpbmRlbnQgPSBsaW5lWzFdXG4gICAgdmFyIHRleHQgPSBsaW5lWzJdXG4gICAgaW5kZW50ID0gKGRlc3QgKyBpbmRlbnQpLnN1YnN0cigwLCBkZXN0Lmxlbmd0aCArIGluZGVudC5sZW5ndGggLSBiYXNlX2luZGVudC5sZW5ndGgpXG4gICAgcmV0dXJuIGluZGVudCArIHRleHRcbiAgfSlcbiAgY2hhbmdlLnRleHRbMF0gPSBjaGFuZ2UudGV4dFswXS5zdWJzdHIoZGVzdC5sZW5ndGgpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5kZW50QWZ0ZXJQYXN0ZVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxucmVxdWlyZShcImNvZGVtaXJyb3ItYWRkb25cIilcbnJlcXVpcmUoXCIuL21hcmtcIilcbnJlcXVpcmUoXCIuL3NlbGVjdC1saW5lXCIpXG5yZXF1aXJlKFwiLi9zZWxlY3Qtd29yZFwiKVxucmVxdWlyZShcIi4vc3BsaXQtaW50by1saW5lc1wiKVxucmVxdWlyZShcIi4vdGV4dC1tb2RlXCIpXG5cbk9iamVjdC5hc3NpZ24oQ29kZU1pcnJvci5kZWZhdWx0cywge1xuICBsaW5lTnVtYmVyczogdHJ1ZSxcbiAgdGFiU2l6ZTogNCxcbiAgc2hvd0N1cnNvcldoZW5TZWxlY3Rpbmc6IHRydWUsXG4gIGF1dG9DbG9zZUJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaEJyYWNrZXRzOiB0cnVlLFxuICBtYXRjaFRhZ3M6IHRydWUsXG4gIGF1dG9DbG9zZVRhZ3M6IHRydWUsXG4gIHN0eWxlQWN0aXZlTGluZToge25vbkVtcHR5OiB0cnVlfSxcbiAgc3R5bGVTZWxlY3RlZFRleHQ6IHRydWUsXG4gIGRyYWdEcm9wOiBmYWxzZSxcbiAgZXh0cmFLZXlzOiB7XG4gICAgXCJDdHJsLVNwYWNlXCI6IFwiYXV0b2NvbXBsZXRlXCIsXG4gICAgXCJDdHJsLVVcIjogXCJhdXRvY29tcGxldGVcIixcbiAgICBcIkN0cmwtL1wiOiBcInRvZ2dsZUNvbW1lbnRcIixcbiAgICBcIkNtZC0vXCI6IFwidG9nZ2xlQ29tbWVudFwiLFxuICAgIFwiVGFiXCI6IFwiaW5kZW50QXV0b1wiLFxuICAgIFwiQ3RybC1EXCI6IGZhbHNlLFxuICAgIFwiQ21kLURcIjogZmFsc2UsXG4gIH0sXG59KVxuXG5Db2RlTWlycm9yLmRlZmluZUluaXRIb29rKGZ1bmN0aW9uKGNtKSB7XG4gIC8vIG1haW50YWluIGluZGVudGF0aW9uIG9uIHBhc3RlXG4gIGNtLm9uKFwiYmVmb3JlQ2hhbmdlXCIsIHJlcXVpcmUoXCIuL2luZGVudC1hZnRlci1wYXN0ZVwiKSlcbiAgXG4gIC8vIGtleSBiaW5kaW5nc1xuICB2YXIgaW5wdXQgPSBjbS5nZXRJbnB1dEZpZWxkKClcbiAgaW5wdXQuY2xhc3NOYW1lICs9IFwiIG1vdXNldHJhcFwiIC8vIGVuYWJsZSBob3RrZXlcbiAgdmFyIGtleW1hcCA9IHtcbiAgICBcImFsdCtiXCI6IFwiZ29Xb3JkTGVmdFwiLFxuICAgIFwiYWx0K2ZcIjogXCJnb1dvcmRSaWdodFwiLFxuICAgIFwiYWx0K2hcIjogXCJkZWxXb3JkQmVmb3JlXCIsXG4gICAgXCJhbHQrZFwiOiBcImRlbFdvcmRBZnRlclwiLFxuICAgIFwibW9kK21cIjogXCJtYXJrXCIsXG4gICAgXCJtb2QrZFwiOiBcInNlbGVjdFdvcmRcIixcbiAgICBcIm1vZCtsXCI6IFwic2VsZWN0TGluZVwiLFxuICAgIFwibW9kK3NoaWZ0K2xcIjogXCJzcGxpdEludG9MaW5lc1wiLFxuICB9XG4gIF8uZWFjaChrZXltYXAsIGZ1bmN0aW9uKGNvbW1hbmQsIGtleSkge1xuICAgIE1vdXNldHJhcChpbnB1dCkuYmluZChrZXksIGZ1bmN0aW9uKCkge1xuICAgICAgY20uZXhlY0NvbW1hbmQoY29tbWFuZClcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pXG4gIH0pXG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVNaXJyb3JcbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5kZWZpbmVJbml0SG9vayhmdW5jdGlvbihjbSkge1xuICBjbS5tYXJrcyA9IFtdXG59KVxuXG5Db2RlTWlycm9yLmNvbW1hbmRzLm1hcmsgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgY3Vyc29yID0gY20uZ2V0Q3Vyc29yKClcbiAgaWYgKG1hcmtzLmxlbmd0aCkge1xuICAgIHZhciBsYXN0ID0gY20ubWFya3NbY20ubWFya3MubGVuZ3RoIC0gMV1cbiAgICBpZiAobGFzdC5saW5lID09IGN1cnNvci5saW5lICYmIGxhc3QuY2ggPT0gY3Vyc29yLmNoKSB7XG4gICAgICBjbS5zZXRTZWxlY3Rpb25zKGNtLm1hcmtzLm1hcChmdW5jdGlvbihtKSB7XG4gICAgICAgIHJldHVybiB7aGVhZDogbSwgYW5jaG9yOiBtfVxuICAgICAgfSksIGNtLm1hcmtzLmxlbmd0aCAtIDEpXG4gICAgICBjbS5tYXJrcyA9IFtdXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgY20ubWFya3MucHVzaChjdXJzb3IpXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc2VsZWN0TGluZSA9IGZ1bmN0aW9uKGNtKSB7XG4gIGNtLnNldFNlbGVjdGlvbnMoXG4gICAgY20ubGlzdFNlbGVjdGlvbnMoKS5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW5jaG9yOiB7XG4gICAgICAgICAgbGluZTogaS5oZWFkLmxpbmUgKyAxLFxuICAgICAgICAgIGNoOiAwLFxuICAgICAgICB9LFxuICAgICAgICBoZWFkOiB7XG4gICAgICAgICAgbGluZTogaS5hbmNob3IubGluZSxcbiAgICAgICAgICBjaDogMCxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIClcbn1cbiIsInZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcImNvZGVtaXJyb3JcIilcblxuQ29kZU1pcnJvci5jb21tYW5kcy5zZWxlY3RXb3JkID0gZnVuY3Rpb24oY20pIHtcbiAgY20uc2V0U2VsZWN0aW9ucyhcbiAgICBjbS5saXN0U2VsZWN0aW9ucygpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gY20uZmluZFdvcmRBdChpLmFuY2hvcilcbiAgICB9KVxuICApXG59XG4iLCJ2YXIgQ29kZU1pcnJvciA9IHJlcXVpcmUoXCJjb2RlbWlycm9yXCIpXG5cbkNvZGVNaXJyb3IuY29tbWFuZHMuc3BsaXRJbnRvTGluZXMgPSBmdW5jdGlvbihjbSkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGNtLmxpc3RTZWxlY3Rpb25zKClcbiAgaWYgKHNlbGVjdGlvbnMubGVuZ3RoICE9IDEpIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gICAgcmV0dXJuXG4gIH1cbiAgdmFyIGFuY2hvciA9IHNlbGVjdGlvbnNbMF0uYW5jaG9yXG4gIHZhciBoZWFkID0gc2VsZWN0aW9uc1swXS5oZWFkXG4gIHZhciBuZXdfc2VsZWN0aW9ucyA9IFtdXG4gIGZvciAodmFyIGkgPSBhbmNob3IubGluZTsgaSA8PSBoZWFkLmxpbmU7ICsraSkge1xuICAgIG5ld19zZWxlY3Rpb25zLnB1c2goe1xuICAgICAgYW5jaG9yOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGFuY2hvci5saW5lID8gYW5jaG9yLmNoIDogMCxcbiAgICAgIH0sXG4gICAgICBoZWFkOiB7XG4gICAgICAgIGxpbmU6IGksXG4gICAgICAgIGNoOiBpID09IGhlYWQubGluZSA/IGhlYWQuY2ggOiBJbmZpbml0eSxcbiAgICAgIH0sXG4gICAgfSlcbiAgfVxuICBjbS5zZXRTZWxlY3Rpb25zKG5ld19zZWxlY3Rpb25zKVxufVxuIiwidmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiY29kZW1pcnJvclwiKVxuXG5Db2RlTWlycm9yLmRlZmluZVNpbXBsZU1vZGUoXCJ0ZXh0XCIsIHtcbiAgc3RhcnQ6IFtdLFxuICBjb21tZW50OiBbXSxcbiAgbWV0YToge30sXG59KVxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgRWRpdG9yVmlldyA9IHJlcXVpcmUoXCIuL2VkaXRvci12aWV3XCIpXG5cbnZhciBFZGl0b3JNYW5hZ2VyVmlldyA9IGZ1bmN0aW9uKCRyb290LCBlZGl0b3JfbWdyKSB7XG4gIHZhciBlZGl0b3JzID0ge31cbiAgdmFyICR0YWJzID0gJChcIjxkaXY+XCIpLmF0dHIoXCJpZFwiLCBcImZpbGVzXCIpLmFwcGVuZFRvKCRyb290KVxuICB2YXIgJGVkaXRvcnMgPSAkKFwiPGRpdj5cIikuYXR0cihcImlkXCIsIFwiZWRpdG9yc1wiKS5hcHBlbmRUbygkcm9vdClcbiAgXG4gIGVkaXRvcl9tZ3Iub3BlbmVkLmFkZChmdW5jdGlvbihlZGl0b3IpIHtcbiAgICB2YXIgcGF0aCA9IGVkaXRvci5nZXRQYXRoKClcbiAgICB2YXIgZGlyID0gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKyRcIiksIFwiXCIpXG4gICAgdmFyIG5hbWUgPSBwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChcIi4qL1wiKSwgXCJcIilcbiAgICB2YXIgJHRhYiA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImZpbGUtaXRlbVwiKS5hcHBlbmQoXG4gICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJkaXJcIikudGV4dChkaXIpLFxuICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwibmFtZVwiKS50ZXh0KG5hbWUpLFxuICAgICAgJCgnPGRpdiBjbGFzcz1cInN0YXR1cyBjbGVhblwiPicpXG4gICAgKS5hcHBlbmRUbygkdGFicylcbiAgICAvLyBzdGF0dXMgaW4gdGFiXG4gICAgZWRpdG9yLnN0YXR1cy5vYnNlcnZlKGZ1bmN0aW9uKHN0YXR1cykge1xuICAgICAgJHRhYi5maW5kKFwiLnN0YXR1c1wiKS5yZW1vdmVDbGFzcyhcImNsZWFuIGVycm9yIG1vZGlmaWVkXCIpLmFkZENsYXNzKHN0YXR1cylcbiAgICB9KVxuICAgIC8vIGVkaXRvciB2aWV3XG4gICAgdmFyICRlZGl0b3IgPSAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJlZGl0b3JcIikuYXBwZW5kVG8oJGVkaXRvcnMpXG4gICAgdmFyIGVkaXRvcl92aWV3ID0gRWRpdG9yVmlldygkZWRpdG9yLCBlZGl0b3IsIGVkaXRvcl9tZ3IpXG4gICAgXG4gICAgZWRpdG9yc1twYXRoXSA9IHtcbiAgICAgICR0YWI6ICR0YWIsXG4gICAgICAkZWRpdG9yOiAkZWRpdG9yLFxuICAgIH1cbiAgfSlcbiAgXG4gIGVkaXRvcl9tZ3IuY2xvc2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgZWRpdG9yc1twYXRoXS4kdGFiLnJlbW92ZSgpXG4gICAgZWRpdG9yc1twYXRoXS4kZWRpdG9yLnJlbW92ZSgpXG4gICAgZGVsZXRlIGVkaXRvcnNbcGF0aF1cbiAgfSlcbiAgXG4gIGVkaXRvcl9tZ3IuYWN0aXZhdGVkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgJHRhYnMuZmluZChcIi5maWxlLWl0ZW0uYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBlZGl0b3JzW3BhdGhdLiR0YWIuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgfSlcbiAgXG4gICR0YWJzLm9uKFwiY2xpY2tcIiwgXCIuZmlsZS1pdGVtXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICB2YXIgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuICAgIHZhciBwYXRoID0gXy5maW5kS2V5KGVkaXRvcnMsIGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBpLiR0YWIuaXMoJHRhcmdldClcbiAgICB9KVxuICAgIGVkaXRvcl9tZ3IuYWN0aXZhdGUocGF0aClcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JNYW5hZ2VyVmlld1xuIiwidmFyIHNpZ25hbHMgPSByZXF1aXJlKFwic2lnbmFsc1wiKVxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKVxudmFyIEZpbGUgPSByZXF1aXJlKFwiLi9maWxlXCIpXG52YXIgRWRpdG9yID0gcmVxdWlyZShcIi4vZWRpdG9yXCIpXG5cbnZhciBFZGl0b3JNYW5hZ2VyID0gZnVuY3Rpb24oZmluZGVyKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBvcGVuZWQ6IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgIGNsb3NlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgYWN0aXZhdGVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICBcbiAgICBhY3RpdmU6IG51bGwsIC8vIHBhdGggb2YgYWN0aXZlIGZpbGVcbiAgICBlZGl0b3JzOiBbXSxcbiAgICBcbiAgICBnZXRGaWxlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZWRpdG9ycy5tYXAoZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgICAgIHJldHVybiBlZGl0b3IuZ2V0UGF0aCgpXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgb3BlbjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgXCJUaGUgcGF0aCBpcyBudWxsXCJcbiAgICAgIH1cbiAgICAgIC8vIHRyeSB0byBhY3RpdmF0ZSBhbHJlYWR5IG9wZW5lZCBmaWxlc1xuICAgICAgaWYgKG1vZGVsLmFjdGl2YXRlKHBhdGgpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIGVkaXRvciA9IEVkaXRvcihGaWxlKHBhdGgpKVxuICAgICAgZWRpdG9yLmxvYWQoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RlbC5lZGl0b3JzLnB1c2goZWRpdG9yKVxuICAgICAgICBtb2RlbC5vcGVuZWQuZGlzcGF0Y2goZWRpdG9yKVxuICAgICAgICBtb2RlbC5hY3RpdmF0ZShwYXRoKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGdldEFjdGl2ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbW9kZWwuYWN0aXZlXG4gICAgfSxcbiAgICBcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgICAgaWYgKHBhdGggIT09IG51bGwgJiYgbW9kZWwuaW5kZXhPZihwYXRoKSA9PSAtMSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFjdGl2ZSA9IHBhdGhcbiAgICAgIG1vZGVsLmFjdGl2YXRlZC5kaXNwYXRjaChwYXRoKVxuICAgICAgZmluZGVyLnNldFBhdGgocGF0aClcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSxcbiAgICBcbiAgICBuZXh0RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKHRydWUpXG4gICAgfSxcbiAgICBcbiAgICBwcmV2RmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5yb3RhdGVGaWxlKGZhbHNlKVxuICAgIH0sXG4gICAgXG4gICAgcm90YXRlRmlsZTogZnVuY3Rpb24obmV4dCkge1xuICAgICAgaWYgKG1vZGVsLmVkaXRvcnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaWR4XG4gICAgICBpZiAobW9kZWwuYWN0aXZlID09PSBudWxsKSB7XG4gICAgICAgIGlkeCA9IG5leHQgPyAwIDogbW9kZWwuZWRpdG9ycy5sZW5ndGggLSAxXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWR4ID0gbW9kZWwuaW5kZXhPZihtb2RlbC5hY3RpdmUpXG4gICAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgICBpZHggPSAoaWR4ICsgbW9kZWwuZWRpdG9ycy5sZW5ndGgpICUgbW9kZWwuZWRpdG9ycy5sZW5ndGhcbiAgICAgIH1cbiAgICAgIG1vZGVsLmFjdGl2YXRlKG1vZGVsLmVkaXRvcnNbaWR4XS5nZXRQYXRoKCkpXG4gICAgfSxcbiAgICBcbiAgICBjbG9zZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgdmFyIGlkeCA9IG1vZGVsLmluZGV4T2YocGF0aClcbiAgICAgIGlmIChpZHggPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBpZiAocGF0aCA9PT0gbW9kZWwuYWN0aXZlKSB7XG4gICAgICAgIGlmIChtb2RlbC5lZGl0b3JzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgbW9kZWwuYWN0aXZhdGUobnVsbClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtb2RlbC5wcmV2RmlsZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG1vZGVsLmVkaXRvcnMuc3BsaWNlKGlkeCwgMSlcbiAgICAgIG1vZGVsLmNsb3NlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgcmVsb2FkOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5jbG9zZShwYXRoKVxuICAgICAgbW9kZWwub3BlbihwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgaW5kZXhPZjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgcmV0dXJuIG1vZGVsLmdldEZpbGVzKCkuaW5kZXhPZihwYXRoKVxuICAgIH0sXG4gIH1cbiAgXG4gIGZpbmRlci5zZWxlY3RlZC5hZGQobW9kZWwub3BlbilcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvck1hbmFnZXJcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIENvZGVNaXJyb3IgPSByZXF1aXJlKFwiLi9jb2RlbWlycm9yXCIpXG5cbnZhciBFZGl0b3JWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIGVkaXRvciwgZWRpdG9yX21ncikge1xuICB2YXIgZmlsZSA9IGVkaXRvci5nZXRGaWxlKClcbiAgXG4gIHZhciBjbSA9IENvZGVNaXJyb3IoJHJvb3RbMF0sIHtcbiAgICB2YWx1ZTogZWRpdG9yLnRleHQuZ2V0KCksXG4gICAgbW9kZTogZWRpdG9yLm1vZGUuZ2V0KCksXG4gIH0pXG4gIFxuICAvLyBmb290ZXJcbiAgJHJvb3QuYXBwZW5kKFxuICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItZm9vdFwiPicpLmFwcGVuZChcbiAgICAgICQoJzxkaXYgY2xhc3M9XCJlZGl0b3ItbWVzc2FnZVwiPicpLFxuICAgICAgJCgnPGJ1dHRvbiBjbGFzcz1cImVkaXRvci1pbmRlbnQgbGlua1wiIHR5cGU9XCJidXR0b25cIj4nKSxcbiAgICAgICQoJzxidXR0b24gY2xhc3M9XCJlZGl0b3ItZW9sIGxpbmtcIiB0eXBlPVwiYnV0dG9uXCI+JyksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLWVuY29kaW5nXCI+JyksXG4gICAgICAkKCc8ZGl2IGNsYXNzPVwiZWRpdG9yLW1vZGVcIj4nKVxuICAgIClcbiAgKVxuICBcbiAgLy8gc2F2ZVxuICB2YXIgbGFzdF9nZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBnZW5lcmF0aW9uID0gY20uY2hhbmdlR2VuZXJhdGlvbih0cnVlKVxuICAgIGVkaXRvci5zYXZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGxhc3RfZ2VuZXJhdGlvbiA9IGdlbmVyYXRpb25cbiAgICB9KVxuICB9XG4gIGNtLm9uKFwiY2hhbmdlc1wiLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IudGV4dC5zZXQoY20uZ2V0VmFsdWUoKSlcbiAgICBlZGl0b3Iuc3RhdHVzLnNldChcbiAgICAgIGNtLmlzQ2xlYW4obGFzdF9nZW5lcmF0aW9uKSA/IFwiY2xlYW5cIiA6IFwibW9kaWZpZWRcIlxuICAgIClcbiAgfSlcbiAgZWRpdG9yLnRleHQub2JzZXJ2ZShmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKHRleHQgIT0gY20uZ2V0VmFsdWUoKSkge1xuICAgICAgY20uc2V0VmFsdWUodGV4dClcbiAgICB9XG4gIH0pXG5cbiAgLy8gbW9kZVxuICB2YXIgdXBkYXRlTW9kZSA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICBjbS5zZXRPcHRpb24oXCJtb2RlXCIsIG1vZGUpXG4gICAgQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcImhpbnRXb3Jkc1wiLCBtb2RlLCBudWxsKVxuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLW1vZGVcIikudGV4dChtb2RlKVxuICB9XG4gIGVkaXRvci5tb2RlLm9ic2VydmUodXBkYXRlTW9kZSlcbiAgdXBkYXRlTW9kZShlZGl0b3IubW9kZS5nZXQoKSlcbiAgXG4gIC8vIGluZGVudFxuICB2YXIgdXBkYXRlSW5kZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICAgICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS50ZXh0KHR5cGUpXG4gICAgaWYgKHR5cGUgPT0gXCJUQUJcIikge1xuICAgICAgY20uc2V0T3B0aW9uKFwiaW5kZW50V2l0aFRhYnNcIiwgdHJ1ZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgNClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjbS5zZXRPcHRpb24oXCJpbmRlbnRXaXRoVGFic1wiLCBmYWxzZSlcbiAgICAgIGNtLnNldE9wdGlvbihcImluZGVudFVuaXRcIiwgTnVtYmVyKHR5cGUucmVwbGFjZShcIlNQXCIsIFwiXCIpKSlcbiAgICB9XG4gIH1cbiAgZWRpdG9yLmluZGVudC5vYnNlcnZlKHVwZGF0ZUluZGVudClcbiAgdXBkYXRlSW5kZW50KGVkaXRvci5pbmRlbnQuZ2V0KCkpXG4gICRyb290LmZpbmQoXCIuZWRpdG9yLWluZGVudFwiKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICBlZGl0b3IuaW5kZW50LnJvdGF0ZSgpXG4gIH0pXG4gIFxuICAvLyBsaW5lIHNlcHJhdG9yXG4gIHZhciB1cGRhdGVFb2wgPSBmdW5jdGlvbihlb2wpIHtcbiAgICB2YXIgbmFtZXMgPSB7XG4gICAgICBcIlxcclwiOiBcIkNSXCIsXG4gICAgICBcIlxcblwiOiBcIkxGXCIsXG4gICAgICBcIlxcclxcblwiOiBcIkNSTEZcIixcbiAgICB9XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW9sXCIpLnRleHQobmFtZXNbZW9sXSlcbiAgfVxuICBmaWxlLmVvbC5vYnNlcnZlKHVwZGF0ZUVvbClcbiAgdXBkYXRlRW9sKGZpbGUuZW9sLmdldCgpKVxuICAkcm9vdC5maW5kKFwiLmVkaXRvci1lb2xcIikuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgZmlsZS5lb2wucm90YXRlKClcbiAgfSlcbiAgXG4gIC8vIGVuY29kaW5nXG4gIHZhciB1cGRhdGVFbmNvZGluZyA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItZW5jb2RpbmdcIikudGV4dChlbmNvZGluZylcbiAgfVxuICBmaWxlLmVuY29kaW5nLmFkZCh1cGRhdGVFbmNvZGluZylcbiAgdXBkYXRlRW5jb2RpbmcoZmlsZS5lbmNvZGluZy5nZXQoKSlcbiAgXG4gIC8vIG1lc3NhZ2VcbiAgZWRpdG9yLm1lc3NhZ2Uub2JzZXJ2ZShmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgJHJvb3QuZmluZChcIi5lZGl0b3ItbWVzc2FnZVwiKS50ZXh0KG1lc3NhZ2UpXG4gIH0pXG4gIFxuICAvLyBhY3RpdmVcbiAgZWRpdG9yX21nci5hY3RpdmF0ZWQuYWRkKGZ1bmN0aW9uKGFjdGl2ZSkge1xuICAgIGlmIChhY3RpdmUgPT0gZmlsZS5nZXRQYXRoKCkpIHtcbiAgICAgICRyb290LmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICBjbS5mb2N1cygpXG4gICAgICBjbS5yZWZyZXNoKClcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkcm9vdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgIH1cbiAgfSlcbiAgXG4gIC8vIHNhdmUgd2l0aCBjb21tYW5kLXNcbiAgTW91c2V0cmFwKCRyb290WzBdKS5iaW5kKFwibW9kK3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2F2ZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yVmlld1xuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcbnZhciBDb2RlTWlycm9yID0gcmVxdWlyZShcIi4vY29kZW1pcnJvclwiKVxudmFyIEluZGVudCA9IHJlcXVpcmUoXCIuL2luZGVudFwiKVxuXG52YXIgRWRpdG9yID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgZWRpdG9yID0ge1xuICAgIHRleHQ6IE9ic2VydmFibGUoXCJcIiksXG4gICAgc3RhdHVzOiBPYnNlcnZhYmxlKFwiY2xlYW5cIiksXG4gICAgbW9kZTogT2JzZXJ2YWJsZShcInRleHRcIiksXG4gICAgaW5kZW50OiBJbmRlbnQoKSxcbiAgICBtZXNzYWdlOiBPYnNlcnZhYmxlKFwiXCIpLFxuICAgIFxuICAgIGdldEZpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZpbGVcbiAgICB9LFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZpbGUuZ2V0UGF0aCgpXG4gICAgfSxcbiAgICBcbiAgICBsb2FkOiBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICByZXR1cm4gZmlsZS5yZWFkKCkudGhlbihmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgIGVkaXRvci5pbmRlbnQuc2V0KEluZGVudC5kZXRlY3RJbmRlbnRUeXBlKHRleHQpKVxuICAgICAgICBlZGl0b3IudGV4dC5zZXQodGV4dClcbiAgICAgICAgZWRpdG9yLm1lc3NhZ2Uuc2V0KFwiTG9hZGVkLlwiKVxuICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHNhdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZpbGUud3JpdGUoZWRpdG9yLnRleHQuZ2V0KCkpLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGVkaXRvci5tZXNzYWdlLnNldChcIlNhdmUgZmFpbGVkLiBcIiArIHJlcGx5LmVycm9yKVxuICAgICAgICBlZGl0b3Iuc3RhdHVzLnNldChcImVycm9yXCIpXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBlZGl0b3Iuc3RhdHVzLnNldChcImNsZWFuXCIpXG4gICAgICAgIGVkaXRvci5tZXNzYWdlLnNldChcIlNhdmVkLlwiKVxuICAgICAgfSlcbiAgICB9LFxuICB9XG4gIFxuICB2YXIgZGV0ZWN0TW9kZSA9IChmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IHBhdGgucmVwbGFjZSgvLipbLl0oLispJC8sIFwiJDFcIilcbiAgICB2YXIgbW9kZSA9IHtcbiAgICAgIGh0bWw6IFwicGhwXCIsXG4gICAgICB0YWc6IFwicGhwXCIsXG4gICAgfVtleHRlbnNpb25dXG4gICAgaWYgKG1vZGUpIHtcbiAgICAgIHJldHVybiBtb2RlXG4gICAgfVxuICAgIG1vZGUgPSBDb2RlTWlycm9yLmZpbmRNb2RlQnlFeHRlbnNpb24oZXh0ZW5zaW9uKVxuICAgIGlmIChtb2RlKSB7XG4gICAgICByZXR1cm4gbW9kZS5tb2RlXG4gICAgfVxuICAgIHJldHVybiBcInRleHRcIlxuICB9KVxuICBlZGl0b3IubW9kZS5zZXQoZGV0ZWN0TW9kZShmaWxlLmdldFBhdGgoKSkpXG4gIFxuICAvLyBhdXRvIHNhdmVcbiAgZWRpdG9yLnRleHQub2JzZXJ2ZShfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuICAgIGlmIChlZGl0b3Iuc3RhdHVzLmdldCgpICE9IFwiY2xlYW5cIikge1xuICAgICAgZWRpdG9yLnNhdmUoKVxuICAgIH1cbiAgfSwgNDAwMCkpXG4gIFxuICByZXR1cm4gZWRpdG9yXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yXG4iLCJ2YXIgUm90YXRlID0gcmVxdWlyZShcIi4vcm90YXRlXCIpXG5cbnZhciBFb2wgPSBmdW5jdGlvbihlb2wpIHtcbiAgcmV0dXJuIFJvdGF0ZShbXCJcXG5cIiwgXCJcXHJcXG5cIiwgXCJcXHJcIl0sIGVvbClcbn1cblxuRW9sLmRldGVjdCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgaWYgKHRleHQubWF0Y2goXCJcXHJcXG5cIikpIHtcbiAgICByZXR1cm4gXCJcXHJcXG5cIlxuICB9XG4gIGlmICh0ZXh0Lm1hdGNoKFwiXFxyXCIpKSB7XG4gICAgcmV0dXJuIFwiXFxyXCJcbiAgfVxuICByZXR1cm4gXCJcXG5cIlxufVxuXG5Fb2wucmVndWxhdGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoLyhcXHJcXG58XFxyKS8sIFwiXFxuXCIpXG59LFxuXG5tb2R1bGUuZXhwb3J0cyA9IEVvbFxuIiwidmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpXG52YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcbnZhciBFb2wgPSByZXF1aXJlKFwiLi9lb2xcIilcblxudmFyIEZpbGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBmaWxlID0ge1xuICAgIGVvbDogRW9sKCksXG4gICAgZW5jb2Rpbmc6IE9ic2VydmFibGUoKSxcbiAgICBcbiAgICBnZXRQYXRoOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwYXRoXG4gICAgfSxcbiAgICBcbiAgICByZWFkOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICBtZXRob2Q6IFwicG9zdFwiLFxuICAgICAgICAgIHVybDogXCIvcmVhZC5waHBcIixcbiAgICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICAgIH0pLmZhaWwocmVqZWN0KS5kb25lKGZ1bmN0aW9uKHJlcGx5KSB7XG4gICAgICAgICAgZmlsZS5lbmNvZGluZy5zZXQocmVwbHkuZW5jb2RpbmcpXG4gICAgICAgICAgZmlsZS5lb2wuc2V0KEVvbC5kZXRlY3QocmVwbHkuY29udGVudCkpXG4gICAgICAgICAgdmFyIGNvbnRlbnQgPSBFb2wucmVndWxhdGUocmVwbHkuY29udGVudClcbiAgICAgICAgICByZXNvbHZlKGNvbnRlbnQpXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgd3JpdGU6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB1cmw6IFwiL3dyaXRlLnBocFwiLFxuICAgICAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgZW5jb2Rpbmc6IGZpbGUuZW5jb2RpbmcuZ2V0KCksXG4gICAgICAgICAgICBjb250ZW50OiB0ZXh0LnJlcGxhY2UoL1xcbi9nLCBmaWxlLmVvbC5nZXQoKSlcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICAgIGlmIChyZXBseSA9PSBcIm9rXCIpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChyZXBseS5lcnJvcilcbiAgICAgICAgICB9XG4gICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmVqZWN0KFwiXCIpXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0sXG4gIH1cbiAgcmV0dXJuIGZpbGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIilcblxudmFyIEZpbmRlclN1Z2dlc3RWaWV3ID0gZnVuY3Rpb24oJHJvb3QsIG1vZGVsKSB7XG4gIHZhciAkbGlzdCA9ICRyb290XG4gIFxuICB2YXIgdmlldyA9IHtcbiAgICB1cGRhdGVJdGVtczogZnVuY3Rpb24oaXRlbXMpIHtcbiAgICAgICRsaXN0LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpLmVtcHR5KClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSAmJiBpdGVtc1swXSA9PSBtb2RlbC5nZXRDdXJzb3IoKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBuYW1lX3J4ID0gbmV3IFJlZ0V4cChcIi8oW14vXSovPykkXCIpXG4gICAgICAkbGlzdC5hcHBlbmQoaXRlbXMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgdmFyIG5hbWUgPSBuYW1lX3J4LmV4ZWMoaXRlbSlbMV1cbiAgICAgICAgcmV0dXJuICQoXCI8YT5cIikudGV4dChuYW1lKS5kYXRhKFwicGF0aFwiLCBpdGVtKVxuICAgICAgfSkpXG4gICAgICAkbGlzdC5zY3JvbGxUb3AoMCkuYWRkQ2xhc3MoXCJhY3RpdmVcIilcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUN1cnNvcjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJGxpc3QuZmluZChcImEuc2VsZWN0ZWRcIikucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKVxuICAgICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgYSA9ICRsaXN0LmZpbmQoXCJhXCIpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICQodGhpcykuZGF0YShcInBhdGhcIikgPT0gcGF0aFxuICAgICAgfSlcbiAgICAgIGlmIChhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgYS5hZGRDbGFzcyhcInNlbGVjdGVkXCIpXG5cbiAgICAgIC8vIHNjcm9sbCB0aGUgbGlzdCB0byBtYWtlIHRoZSBzZWxlY3RlZCBpdGVtIHZpc2libGVcbiAgICAgIHZhciBzY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGFyZ2V0LmhlaWdodCgpXG4gICAgICAgIHZhciB0b3AgPSB0YXJnZXQucHJldkFsbCgpLmxlbmd0aCAqIGhlaWdodFxuICAgICAgICB2YXIgYm90dG9tID0gdG9wICsgaGVpZ2h0XG4gICAgICAgIHZhciB2aWV3X2hlaWdodCA9ICRsaXN0LmlubmVySGVpZ2h0KClcbiAgICAgICAgaWYgKHRvcCAtICRsaXN0LnNjcm9sbFRvcCgpIDwgMCkge1xuICAgICAgICAgICRsaXN0LnNjcm9sbFRvcCh0b3ApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvdHRvbSAtICRsaXN0LnNjcm9sbFRvcCgpID4gdmlld19oZWlnaHQpIHtcbiAgICAgICAgICAkbGlzdC5zY3JvbGxUb3AoYm90dG9tIC0gdmlld19oZWlnaHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNjcm9sbEludG9WaWV3KGEpXG4gICAgfVxuICB9XG4gIFxuICBtb2RlbC5pdGVtc19jaGFuZ2VkLmFkZCh2aWV3LnVwZGF0ZUl0ZW1zKVxuICBtb2RlbC5jdXJzb3JfbW92ZWQuYWRkKHZpZXcudXBkYXRlQ3Vyc29yKVxuICBcbiAgLy8gd2hlbiBpdGVtIHdhcyBzZWxlY3RlZFxuICAkbGlzdC5vbihcImNsaWNrXCIsIFwiYVwiLCBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgbW9kZWwuc2VsZWN0KCQoZS50YXJnZXQpLmRhdGEoXCJwYXRoXCIpKVxuICB9KVxuICBcbiAgLy8gcHJldmVudCBmcm9tIGxvb3NpbmcgZm9jdXNcbiAgJGxpc3Qub24oXCJtb3VzZWRvd25cIiwgXCJhXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgfSlcbiAgXG4gIHJldHVybiB2aWV3XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyU3VnZ2VzdFZpZXdcbiIsInZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIilcbnZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgRmluZGVyU3VnZ2VzdCA9IGZ1bmN0aW9uKGZpbmRlcikge1xuICB2YXIgbW9kZWwgPSB7XG4gICAgaXRlbXM6IFtdLFxuICAgIGN1cnNvcjogbnVsbCwgLy8gaGlnaGxpZ2h0ZWQgaXRlbVxuICAgIFxuICAgIGl0ZW1zX2NoYW5nZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBjdXJzb3JfbW92ZWQ6IG5ldyBTaWduYWwoKSxcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgdXJsOiBcIi9maW5kZXIucGhwXCIsXG4gICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICB9LFxuICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImZhaWxlZCB0byBmZXRjaCBzdWdnZXN0IGZvciB0aGUgcGF0aDogXCIgKyBwYXRoKVxuICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXBseSkge1xuICAgICAgICBtb2RlbC5zZXRJdGVtcyhyZXBseS5pdGVtcy5tYXAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgIHJldHVybiByZXBseS5iYXNlICsgaVxuICAgICAgICB9KSlcbiAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBzZXRJdGVtczogZnVuY3Rpb24oaXRlbXMpIHtcbiAgICAgIG1vZGVsLnNldEN1cnNvcihudWxsKVxuICAgICAgbW9kZWwuaXRlbXMgPSBpdGVtc1xuICAgICAgbW9kZWwuaXRlbXNfY2hhbmdlZC5kaXNwYXRjaChtb2RlbC5pdGVtcylcbiAgICB9LFxuICAgIFxuICAgIGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5pdGVtc1xuICAgIH0sXG4gICAgXG4gICAgZ2V0Q3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5jdXJzb3JcbiAgICB9LFxuICAgIFxuICAgIHNldEN1cnNvcjogZnVuY3Rpb24ocGF0aCkge1xuICAgICAgaWYgKHBhdGggPT09IG1vZGVsLmN1cnNvcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIG1vZGVsLmN1cnNvciA9IHBhdGhcbiAgICAgIG1vZGVsLmN1cnNvcl9tb3ZlZC5kaXNwYXRjaChtb2RlbC5jdXJzb3IpXG4gICAgfSxcbiAgICBcbiAgICBtb3ZlQ3Vyc29yOiBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBpZiAobW9kZWwuY3Vyc29yID09PSBudWxsKSB7XG4gICAgICAgIGlmIChtb2RlbC5pdGVtcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1swXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBpZHggPSBtb2RlbC5pdGVtcy5pbmRleE9mKG1vZGVsLmN1cnNvcilcbiAgICAgIGlkeCArPSBuZXh0ID8gKzEgOiAtMVxuICAgICAgaWR4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW9kZWwuaXRlbXMubGVuZ3RoIC0gMSwgaWR4KSlcbiAgICAgIG1vZGVsLnNldEN1cnNvcihtb2RlbC5pdGVtc1tpZHhdKVxuICAgIH0sXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRDdXJzb3IocGF0aClcbiAgICAgIG1vZGVsLnNlbGVjdGVkLmRpc3BhdGNoKHBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgZmluZGVyLnZpc2liaWxpdHlfY2hhbmdlZC5hZGQoZnVuY3Rpb24odmlzaWJsZSkge1xuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICBtb2RlbC51cGRhdGUoZmluZGVyLmdldFBhdGgoKSlcbiAgICB9XG4gIH0pXG4gIFxuICBmaW5kZXIucGF0aF9jaGFuZ2VkLmFkZChfLmRlYm91bmNlKG1vZGVsLnVwZGF0ZSwgMjUwKSlcbiAgXG4gIHJldHVybiBtb2RlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlclN1Z2dlc3RcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoXCJtb3VzZXRyYXBcIilcbnZhciBGYWxzZSA9IHJlcXVpcmUoXCIuL3JldHVybi1mYWxzZVwiKVxudmFyIElucHV0V2F0Y2hlciA9IHJlcXVpcmUoXCIuL2lucHV0LXdhdGNoZXJcIilcbnZhciBGaW5kZXJTdWdnZXN0VmlldyA9IHJlcXVpcmUoXCIuL2ZpbmRlci1zdWdnZXN0LXZpZXdcIilcblxudmFyIEZpbmRlclZpZXcgPSBmdW5jdGlvbigkcm9vdCwgZmluZGVyKSB7XG4gIHZhciAkcGF0aF9pbnB1dCA9ICQoXG4gICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiZmluZGVyLXBhdGhcIiBjbGFzcz1cIm1vdXNldHJhcFwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiIHZhbHVlPVwiL1wiPidcbiAgKS5hcHBlbmRUbygkcm9vdClcbiAgXG4gIHZhciBwYXRoX3dhdGNoZXIgPSBJbnB1dFdhdGNoZXIoJHBhdGhfaW5wdXQsIDUwKVxuICBwYXRoX3dhdGNoZXIuY2hhbmdlZC5hZGQoZmluZGVyLnNldFBhdGgpXG4gIFxuICB2YXIgdmlldyA9IHtcbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgICRyb290LmFkZENsYXNzKFwiYWN0aXZlXCIpXG4gICAgICAkcGF0aF9pbnB1dC5mb2N1cygpXG4gICAgICBwYXRoX3dhdGNoZXIuc3RhcnQoKVxuICAgIH0sXG4gICAgXG4gICAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgICAkcm9vdC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKVxuICAgICAgcGF0aF93YXRjaGVyLnN0b3AoKVxuICAgIH0sXG4gIH1cbiAgXG4gIC8vIGhpZGUgb24gYmx1clxuICAkcGF0aF9pbnB1dC5ibHVyKGZpbmRlci5oaWRlKCkpXG4gIFxuICBmaW5kZXIudmlzaWJpbGl0eV9jaGFuZ2VkLmFkZChmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIHZpZXcuc2hvdygpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmlldy5oaWRlKClcbiAgICB9XG4gIH0pXG4gIFxuICBmaW5kZXIucGF0aF9jaGFuZ2VkLmFkZChmdW5jdGlvbihwYXRoKSB7XG4gICAgJHBhdGhfaW5wdXQudmFsKHBhdGgpXG4gIH0pXG4gIFxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJlbnRlclwiLCBGYWxzZShmaW5kZXIuZW50ZXIpKVxuICBNb3VzZXRyYXAoJHBhdGhfaW5wdXRbMF0pLmJpbmQoXCJ0YWJcIiwgRmFsc2UoZmluZGVyLnRhYikpXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcImVzY1wiLCBGYWxzZShmaW5kZXIuaGlkZSkpXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcImRvd25cIiwgRmFsc2UoZnVuY3Rpb24oKSB7XG4gICAgZmluZGVyLnN1Z2dlc3QubW92ZUN1cnNvcih0cnVlKVxuICB9KSlcbiAgTW91c2V0cmFwKCRwYXRoX2lucHV0WzBdKS5iaW5kKFwidXBcIiwgRmFsc2UoZnVuY3Rpb24oKSB7XG4gICAgZmluZGVyLnN1Z2dlc3QubW92ZUN1cnNvcihmYWxzZSlcbiAgfSkpXG4gIE1vdXNldHJhcCgkcGF0aF9pbnB1dFswXSkuYmluZChcIm1vZCt1XCIsIEZhbHNlKFxuICAgIGZpbmRlci5nb1RvUGFyZW50RGlyZWN0b3J5XG4gICkpXG4gIFxuICAvLyBzdWdnZXN0IHZpZXdcbiAgdmFyICRpdGVtcyA9ICQoJzxkaXYgaWQ9XCJmaW5kZXItaXRlbXNcIj4nKS5hcHBlbmRUbygkcm9vdClcbiAgRmluZGVyU3VnZ2VzdFZpZXcoJGl0ZW1zLCBmaW5kZXIuc3VnZ2VzdClcbiAgXG4gIHJldHVybiB2aWV3XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyVmlld1xuIiwidmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxudmFyIEZpbmRlclN1Z2dlc3QgPSByZXF1aXJlKFwiLi9maW5kZXItc3VnZ2VzdFwiKVxuXG52YXIgRmluZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtb2RlbCA9IHtcbiAgICBzZWxlY3RlZDogbmV3IFNpZ25hbCgpLFxuICAgIHBhdGhfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIHZpc2liaWxpdHlfY2hhbmdlZDogbmV3IFNpZ25hbCgpLFxuICAgIFxuICAgIHBhdGg6IFwiXCIsXG4gICAgdmlzaWJsZTogZmFsc2UsXG4gICAgXG4gICAgc2VsZWN0OiBmdW5jdGlvbihwYXRoKSB7XG4gICAgICBtb2RlbC5zZXRQYXRoKHBhdGgpXG4gICAgICBpZiAocGF0aC5zdWJzdHIoLTEpID09IFwiL1wiKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuaGlkZSgpXG4gICAgICBtb2RlbC5zZWxlY3RlZC5kaXNwYXRjaChwYXRoKVxuICAgIH0sXG4gICAgXG4gICAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC52aXNpYmxlID0gdHJ1ZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4gICAgfSxcbiAgICBcbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIG1vZGVsLnZpc2libGUgPSBmYWxzZVxuICAgICAgbW9kZWwudmlzaWJpbGl0eV9jaGFuZ2VkLmRpc3BhdGNoKG1vZGVsLnZpc2libGUpXG4vLyAgICAgICBlZGl0b3JfbWFuYWdlci5hY3RpdmF0ZShlZGl0b3JfbWFuYWdlci5nZXRBY3RpdmUoKSlcbiAgICB9LFxuICAgIFxuICAgIGdldFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1vZGVsLnBhdGhcbiAgICB9LFxuICAgIFxuICAgIHNldFBhdGg6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIG1vZGVsLnBhdGggPSBwYXRoXG4gICAgICBtb2RlbC5wYXRoX2NoYW5nZWQuZGlzcGF0Y2gocGF0aClcbiAgICB9LFxuICAgIFxuICAgIGdvVG9QYXJlbnREaXJlY3Rvcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgbW9kZWwuc2V0UGF0aChcbiAgICAgICAgbW9kZWwucGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXi9dKi8/JFwiKSwgXCJcIilcbiAgICAgIClcbiAgICB9LFxuICAgIFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXRoID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgbW9kZWwuc2VsZWN0KHBhdGggPyBwYXRoIDogbW9kZWwucGF0aClcbiAgICB9LFxuICAgIFxuICAgIHRhYjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gc3VnZ2VzdC5nZXRDdXJzb3IoKVxuICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGN1cnNvcilcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgaXRlbXMgPSBzdWdnZXN0LmdldEl0ZW1zKClcbiAgICAgIGlmIChpdGVtcy5sZW5ndGggPT0gMSkge1xuICAgICAgICBtb2RlbC5zZXRQYXRoKGl0ZW1zWzBdKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHN1Z2dlc3QudXBkYXRlKG1vZGVsLnBhdGgpXG4gICAgfSxcbiAgfVxuICBcbiAgdmFyIHN1Z2dlc3QgPSBtb2RlbC5zdWdnZXN0ID0gRmluZGVyU3VnZ2VzdChtb2RlbClcbiAgc3VnZ2VzdC5zZWxlY3RlZC5hZGQoZnVuY3Rpb24ocGF0aCkge1xuICAgIG1vZGVsLnNlbGVjdChwYXRoKVxuICB9KVxuICBcbiAgcmV0dXJuIG1vZGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyXG4iLCJ2YXIgUm90YXRlID0gcmVxdWlyZShcIi4vcm90YXRlXCIpXG5cbnZhciBJbmRlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHJldHVybiBSb3RhdGUoW1wiNFNQXCIsIFwiMlNQXCIsIFwiVEFCXCJdLCB0eXBlKVxufVxuXG5JbmRlbnQuZGV0ZWN0SW5kZW50VHlwZSA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgaWYgKGNvbnRlbnQubWF0Y2goL1tcXHJcXG5dK1xcdC8pKSB7XG4gICAgcmV0dXJuIFwiVEFCXCJcbiAgfVxuICB2YXIgbGluZXMgPSBjb250ZW50LnNwbGl0KC9bXFxyXFxuXSsvKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGluZGVudCA9IGxpbmVzW2ldLnJlcGxhY2UoL14oICopLiovLCBcIiQxXCIpXG4gICAgaWYgKGluZGVudC5sZW5ndGggPT0gMikge1xuICAgICAgcmV0dXJuIFwiMlNQXCJcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFwiNFNQXCJcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbmRlbnRcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIFNpZ25hbCA9IHJlcXVpcmUoXCJzaWduYWxzXCIpLlNpZ25hbFxuXG52YXIgSW5wdXRXYXRjaGVyID0gZnVuY3Rpb24oaW5wdXQsIGludGVydmFsKSB7XG4gIGlucHV0ID0gJChpbnB1dClcbiAgXG4gIHZhciBtb2RlbCA9IHtcbiAgICBjaGFuZ2VkOiBuZXcgU2lnbmFsKCksXG4gICAgXG4gICAgaW5wdXQ6IGlucHV0LFxuICAgIGludGVydmFsOiBpbnRlcnZhbCxcbiAgICBsYXN0X3ZhbHVlOiBpbnB1dC52YWwoKSxcbiAgICB0aW1lcjogbnVsbCxcbiAgICBcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC5zdG9wKClcbiAgICAgIG1vZGVsLnRpbWVyID0gc2V0SW50ZXJ2YWwobW9kZWwuY2hlY2ssIG1vZGVsLmludGVydmFsKVxuICAgIH0sXG4gICAgXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgICBjbGVhckludGVydmFsKG1vZGVsLnRpbWVyKVxuICAgICAgbW9kZWwudGltZXIgPSBudWxsXG4gICAgfSxcbiAgICBcbiAgICBjaGVjazogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3VycmVudCA9IG1vZGVsLmlucHV0LnZhbCgpXG4gICAgICBpZiAoY3VycmVudCA9PSBtb2RlbC5sYXN0X3ZhbHVlKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbW9kZWwuY2hhbmdlZC5kaXNwYXRjaChjdXJyZW50LCBtb2RlbC5sYXN0X3ZhbHVlKVxuICAgICAgbW9kZWwubGFzdF92YWx1ZSA9IGN1cnJlbnRcbiAgICB9LFxuICAgIFxuICAgIGtleURvd246IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKG1vZGVsLnRpbWVyKSB7XG4gICAgICAgIG1vZGVsLmNoZWNrKClcbiAgICAgIH1cbiAgICB9LFxuICB9XG4gIFxuICBpbnB1dC5rZXlkb3duKG1vZGVsLmtleURvd24pXG4gIFxuICByZXR1cm4gbW9kZWxcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dFdhdGNoZXJcbiIsInZhciAkID0gcmVxdWlyZShcImpxdWVyeVwiKVxudmFyIEVkaXRvck1hbmFnZXJWaWV3ID0gcmVxdWlyZShcIi4vZWRpdG9yLW1hbmFnZXItdmlld1wiKVxudmFyIEZpbmRlclZpZXcgPSByZXF1aXJlKFwiLi9maW5kZXItdmlld1wiKVxuXG52YXIgTWFpblZpZXcgPSBmdW5jdGlvbihlZGl0b3JfbWdyLCBmaW5kZXIpIHtcbiAgdmFyICRtYWluID0gJChcIm1haW5cIilcbiAgRWRpdG9yTWFuYWdlclZpZXcoXG4gICAgJCgnPGRpdiBpZD1cImVkaXRvcl9tYW5hZ2VyXCI+JykuYXBwZW5kVG8oJG1haW4pLFxuICAgIGVkaXRvcl9tZ3JcbiAgKVxuICBGaW5kZXJWaWV3KFxuICAgICQoJzxmb3JtIGlkPVwiZmluZGVyXCI+JykuYXBwZW5kVG8oJG1haW4pLFxuICAgIGZpbmRlclxuICApXG4gIFxuICAvLyBzaG9ydGN1dCBrZXlzXG4gIE1vdXNldHJhcC5iaW5kKFtcIm1vZCs7XCIsIFwibW9kKz1cIl0sIGZ1bmN0aW9uKCkge1xuICAgIGVkaXRvcl9tZ3IubmV4dEZpbGUoKVxuICAgIHJldHVybiBmYWxzZVxuICB9LCBcImtleWRvd25cIilcbiAgTW91c2V0cmFwLmJpbmQoW1wibW9kK3NoaWZ0KztcIiwgXCJtb2Qrc2hpZnQrPVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5wcmV2RmlsZSgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrd1wiLCBcIm1vZCtrXCJdLCBmdW5jdGlvbigpIHtcbiAgICBlZGl0b3JfbWdyLmNsb3NlKGVkaXRvcl9tZ3IuZ2V0QWN0aXZlKCkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxuICBNb3VzZXRyYXAuYmluZChbXCJtb2QrclwiXSwgZnVuY3Rpb24oKSB7XG4gICAgZWRpdG9yX21nci5yZWxvYWQoZWRpdG9yX21nci5nZXRBY3RpdmUoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSwgXCJrZXlkb3duXCIpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWFpblZpZXdcbiIsInZhciBTaWduYWwgPSByZXF1aXJlKFwic2lnbmFsc1wiKS5TaWduYWxcblxudmFyIE9ic2VydmFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgb2JzZXJ2YWJsZSA9IG5ldyBTaWduYWwoKVxuICBPYmplY3QuYXNzaWduKG9ic2VydmFibGUsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKG5ld192YWx1ZSkge1xuICAgICAgaWYgKHZhbHVlID09PSBuZXdfdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgb2xkX3ZhbHVlID0gdmFsdWVcbiAgICAgIHZhbHVlID0gbmV3X3ZhbHVlXG4gICAgICBvYnNlcnZhYmxlLmRpc3BhdGNoKHZhbHVlLCBvbGRfdmFsdWUsIG9ic2VydmFibGUpXG4gICAgfSxcbiAgICBvYnNlcnZlOiBvYnNlcnZhYmxlLmFkZCwgLy8gYWxpYXNcbiAgfSlcbiAgcmV0dXJuIG9ic2VydmFibGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZhYmxlXG4iLCJ2YXIgcmV0dXJuRmFsc2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJldHVybkZhbHNlXG4iLCJ2YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL29ic2VydmFibGVcIilcblxudmFyIFJvdGF0ZSA9IGZ1bmN0aW9uKHZhbHVlcywgdmFsdWUpIHtcbiAgdmFyIGlzVmFsaWRWYWx1ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2ID09PSB1bmRlZmluZWQgfHwgdmFsdWVzLmluZGV4T2YodikgIT0gLTFcbiAgfVxuICBcbiAgdmFyIGNoZWNrVmFsdWUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKCFpc1ZhbGlkVmFsdWUodikpIHtcbiAgICAgIHRocm93IFwiaW52YWxpZCB2YWx1ZTogXCIgKyB2XG4gICAgfVxuICB9XG4gIGNoZWNrVmFsdWUodmFsdWUpXG4gIFxuICB2YXIgcm90YXRlID0gT2JzZXJ2YWJsZSh2YWx1ZSlcbiAgXG4gIHJvdGF0ZS5nZXRWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdmFsdWVzXG4gIH1cbiAgXG4gIHZhciBfc2V0ID0gcm90YXRlLnNldFxuICByb3RhdGUuc2V0ID0gZnVuY3Rpb24obmV3X3ZhbHVlKSB7XG4gICAgY2hlY2tWYWx1ZShuZXdfdmFsdWUpXG4gICAgX3NldChuZXdfdmFsdWUpXG4gIH1cbiAgXG4gIHJvdGF0ZS5yb3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaWR4ID0gdmFsdWVzLmluZGV4T2Yocm90YXRlLmdldCgpKVxuICAgIGlkeCA9IChpZHggKyAxKSAlIHZhbHVlcy5sZW5ndGhcbiAgICByb3RhdGUuc2V0KHZhbHVlc1tpZHhdKVxuICB9XG4gIFxuICByZXR1cm4gcm90YXRlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUm90YXRlXG4iLCJ2YXIgTW91c2V0cmFwID0gcmVxdWlyZShcIm1vdXNldHJhcFwiKVxudmFyIEVkaXRvck1hbmFnZXIgPSByZXF1aXJlKFwiLi9lZGl0b3ItbWFuYWdlclwiKVxudmFyIEZpbmRlciA9IHJlcXVpcmUoXCIuL2ZpbmRlclwiKVxudmFyIE1haW5WaWV3ID0gcmVxdWlyZShcIi4vbWFpbi12aWV3XCIpXG5cbm1vZHVsZS5leHBvcnRzLnJ1biA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZmluZGVyID0gRmluZGVyKClcbiAgdmFyIGVkaXRvcl9tZ3IgPSBFZGl0b3JNYW5hZ2VyKGZpbmRlcilcbiAgdmFyIHZpZXcgPSBNYWluVmlldyhlZGl0b3JfbWdyLCBmaW5kZXIpXG4gIFxuICB2YXIgc2F2ZUZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpbGVzID0gZWRpdG9yX21nci5nZXRGaWxlcygpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJvcGVuLWZpbGVzXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzKSlcbiAgfVxuICB2YXIgbG9hZEZpbGVMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJvcGVuLWZpbGVzXCIpIHx8IFwiW11cIilcbiAgfVxuICBsb2FkRmlsZUxpc3QoKS5mb3JFYWNoKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBlZGl0b3JfbWdyLm9wZW4ocGF0aClcbiAgfSlcbiAgXG4gIGVkaXRvcl9tZ3Iub3BlbmVkLmFkZChzYXZlRmlsZUxpc3QpXG4gIGVkaXRvcl9tZ3IuY2xvc2VkLmFkZChzYXZlRmlsZUxpc3QpXG4gIFxuICAvLyBzaG93IGZpbmRlclxuICBNb3VzZXRyYXAuYmluZChbXCJtb2Qrb1wiLCBcIm1vZCtwXCJdLCBmdW5jdGlvbigpIHtcbiAgICBmaW5kZXIuc2hvdygpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sIFwia2V5ZG93blwiKVxufVxuIl19
