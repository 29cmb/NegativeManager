// Fix static output css bug
const fs = require('fs')
const path = require('path')

const files = fs.readdirSync(path.join(__dirname, "client", "out"))
for(const file of files) {
    const stat = fs.statSync(path.join(__dirname, "client", "out", file))
    if(stat.isDirectory()) continue;
    
    var content = fs.readFileSync(path.join(__dirname, "client", "out", file), { encoding: "utf8" })
    content = content.replaceAll("/_next/", "./_next/")
    fs.writeFileSync(path.join(__dirname, "client", "out", file), content, { encoding: "utf8" })
}

console.log("Patched next.js output files to fix file references. Thanks next.js")