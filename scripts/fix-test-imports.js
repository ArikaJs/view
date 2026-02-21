const fs = require('fs');
const path = require('path');

function fixImports(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            fixImports(fullPath);
        } else if (file.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/require\("\.\.\/src"\)/g, 'require("../src/index")');
            content = content.replace(/require\("\.\.\/src\/(.+?)"\)/g, 'require("../src/$1")');
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    }
}

const distTestsDir = path.join(__dirname, '..', 'dist', 'tests');
if (fs.existsSync(distTestsDir)) {
    fixImports(distTestsDir);
}
