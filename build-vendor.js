const fs = require("fs")
const browserify = require("browserify")
const uglify = require("uglify-es")
const uglifyify = require("uglifyify")

const error = function(message) {
    console.log(message)
    process.exit(1)
}

const vendors = Object.keys(
    require("./package.json").dependencies
)

const release = process.argv.indexOf("--release") != -1

const b = browserify({debug: !release})
if (release) {
    b.transform(uglifyify, {global: true})
}
b.require(vendors)
b.require("./js/codemirror-addon", {expose: "codemirror-addon"})
b.bundle(function(err, code) {
    if (err) {
        error(err)
    }
    if (release) {
        const minified = uglify.minify(code.toString())
        if (minified.error) {
            error(minified.error)
        }
        code = minified.code
    }
    else {
        code = code.toString()
    }
    fs.writeFileSync("pub/vendor" + (release ? "-min" : "") + ".js", code)
})
