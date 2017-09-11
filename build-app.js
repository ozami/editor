const fs = require("fs")
const _ = require("underscore")
const browserify = require("browserify")

const error = function(message) {
    console.log(message)
    process.exit(1)
}

const vendors = _.keys(
    require("./package.json").dependencies
)
vendors.push("codemirror-addon")

browserify({debug: true})
.external(vendors)
.require("./js/main.js", {expose: "app"})
.bundle(function(err, code) {
    if (err) {
        error(err)
    }
    fs.writeFileSync("pub/app.js", code)
})
