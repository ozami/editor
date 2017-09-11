const fs = require("fs")
const _ = require("underscore")
const browserify = require("browserify")
const envify = require("envify/custom")
const uglify = require("uglify-js")
const uglifyify = require("uglifyify")

const error = function(message) {
    console.log(message)
    process.exit(1)
}

const vendors = _.keys(
    require("./package.json").dependencies
)

browserify()
.transform(envify({_: "purge", NODE_ENV: "production"}), {global: true})
.transform(uglifyify, {global: true})
.require(vendors)
.require("./js/codemirror-addon", {expose: "codemirror-addon"})
.bundle(function(err, code) {
    if (err) {
        error(err)
    }
    const minified = uglify.minify(code.toString())
    //const minified = {code: code}
    if (minified.error) {
        error(minified.error)
    }
    fs.writeFileSync("pub/vendor.js", minified.code)
})
