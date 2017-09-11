const fs = require("fs")
const browserify = require("browserify")
const babelify = require("babelify")

const error = function(message) {
    console.log(message)
    process.exit(1)
}

// const listFiles = (path) => {
//     if (fs.statSync(path).isDirectory()) {
//         let items = []
//         fs.readdirSync(path).forEach((item) => {
//             items = items.concat(listFiles(path + "/" + item))
//         })
//         return items
//     }
//     return [path]
// }

// const js = listFiles("js")
// .filter(i => i.match(/\.jsx?$/))
// .map((i) => i.replace(/^js\//, ""))

const vendors = Object.keys(
    require("./package.json").dependencies
)
vendors.push("codemirror-addon")

browserify({debug: true})
.external(vendors)
.transform(require("babelify"), {presets: ["es2015", "react"]})
.require("./js/main.js", {expose: "app"})
.bundle(function(err, code) {
    if (err) {
        error(err)
    }
    fs.writeFileSync("pub/app.js", code)
})
