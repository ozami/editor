var Observable = require("./observable")
var Api = require("./api")
var Eol = require("./eol")

var File = function(path) {
  var file = {
    eol: Eol(),
    encoding: Observable(),
    path: Observable(path),
    
    read: function() {
      const body = new URLSearchParams()
      body.set("path", file.path.get())
      
      return fetch("/read.php", {
        method: "POST",
        body,
      })
      .then(response => response.json())
      .then(response => {
        if (response.error) {
          return Promise.reject(response.error)
        }
        file.encoding.set(response.encoding)
        file.eol.set(Eol.detect(response.content))
        return Eol.regulate(response.content)
      })
    },
    
    write: function(text) {
      return (new Api()).writeFile(
        file.path.get(),
        file.encoding.get(),
        text.replace(/\n/g, file.eol.get())
      )
    },
    
    move: function(to_path, text) {
      if (to_path == file.path.get()) {
        return Promise.resolve("ok")
      }
      const api = new Api()
      return api.writeFile(
        to_path,
        file.encoding.get(),
        text.replace(/\n/g, file.eol.get())
      ).then(function() {
        return api.deleteFile(
          file.path.get()
        )
      }).then(function() {
        file.path.set(to_path)
      })
    },
  }
  return file
}

module.exports = File
