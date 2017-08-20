"use strict"

const error = function(message) {
    console.log(message)
    process.exit(1)
}

const vendors = require("underscore").keys(
    require("./package.json").dependencies
)

require("browserify")()
.require(vendors)
.require("./js/codemirror-addon.js", {expose: "codemirror-addon"})
.bundle(function(err, code) {
    if (err) {
        error(err)
    }
    const minified = require("uglify-js").minify(code.toString())
    //const minified = {code: code}
    if (minified.error) {
        error(minified.error)
    }
    require("fs").writeFileSync("pub/vendor.js", minified.code)
})
