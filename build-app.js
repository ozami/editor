"use strict"

const error = function(message) {
    console.log(message)
    process.exit(1)
}

const vendors = require("underscore").keys(
    require("./package.json").dependencies
)
vendors.push("codemirror-addon")

require("browserify")({debug: true})
.external(vendors)
.require("./js/main.js", {expose: "app"})
.bundle(function(err, code) {
    if (err) {
        error(err)
    }
    require("fs").writeFileSync("pub/app.js", code)
})
