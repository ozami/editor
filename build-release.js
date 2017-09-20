const fs = require("fs")
const uglify = require("uglify-js")

const error = function(message) {
    console.log(message)
    process.exit(1)
}
const app = fs.readFileSync("pub/app.js")
const minified = uglify.minify(app.toString())
if (minified.error) {
    error(minified.error)
}

fs.createReadStream("pub/vendor-min.js")
.pipe(fs.createWriteStream("pub/index.js"))
.on("finish", function() {
    fs.appendFileSync("pub/index.js", minified.code)
})
