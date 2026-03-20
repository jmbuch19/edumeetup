const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./app');

let modifiedFiles = 0;
files.forEach(file => {
    const original = fs.readFileSync(file, 'utf8');
    let content = original;
    
    // Replace: console.error(..., error) or console.error(..., err)
    content = content.replace(/console\.error\(([^,]+?),\s*(?:error|err|e)\s*\)/g, 'console.error($1)');
    
    // Replace: stand-alone console.error(error)
    content = content.replace(/console\.error\(\s*(?:error|err|e)\s*\)/g, "console.error('[ERROR] Details redacted due to security policy')");
    
    // Replace: console.log(..., error/err/e)
    content = content.replace(/console\.log\(([^,]+?),\s*(?:error|err|e)\s*\)/g, 'console.log($1)');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        modifiedFiles++;
    }
});
console.log(`Log cleanup complete. Modified ${modifiedFiles} files.`);
