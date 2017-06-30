"use strict"

const error = function(message) {
    console.log(message)
    process.exit(1)
}
const fs = require("fs")
const app = fs.readFileSync("pub/app.js")
const minified = require("uglify-js").minify(app.toString())
if (minified.error) {
    error(minified.error)
}

fs.createReadStream("pub/vendor.js")
.pipe(fs.createWriteStream("pub/index.js"))
.on("finish", function() {
    fs.appendFileSync("pub/index.js", minified.code)
})
