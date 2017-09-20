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
      const body = new URLSearchParams()
      body.set("path", path)
      
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
      const body = new URLSearchParams()
      body.set("path", path)
      body.set("encoding", file.encoding.get())
      body.set("content", text.replace(/\n/g, file.eol.get()))
      
      return fetch("/write.php", {
        method: "post",
        body,
      })
      .then(response => response.json())
      .then(response => {
        if (response != "ok") {
          return Promise.reject(response.error)
        }
      })
    },
  }
  return file
}

module.exports = File
