// Fix static output css bug
const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
    let content = fs.readFileSync(filePath, { encoding: "utf8" });
    content = content.replace(/([^\.]|^)(\/_next\/)/g, (match, p1) => {
        if (p1.endsWith('.')) return match;
        return `${p1}./_next/`;
    });
    fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath);
        } else if (entry.isFile()) {
            patchFile(fullPath);
        }
    }
}

const outDir = path.join(__dirname, "client", "out");
walkDir(outDir);

console.log("Patched next.js output files to fix file references. Thanks next.js");