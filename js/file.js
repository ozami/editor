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
