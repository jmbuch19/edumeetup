const fs = require('fs');
const path = require('path');

const baseDir = process.cwd();

function getFiles(dir, match) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            results = results.concat(getFiles(fullPath, match));
        } else if (match.test(item.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

const apiFiles = getFiles(path.join(baseDir, 'app', 'api'), /route\.ts$/);
const allFiles = [...apiFiles, path.join(baseDir, 'app', 'actions.ts')];

const uniDir = path.join(baseDir, 'app', 'university');
const uniActionFiles = getFiles(uniDir, /actions\.ts$/);
allFiles.push(...uniActionFiles);

console.log('| File / Action | Auth Guard |');
console.log('|---|---|');

for (const file of allFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(baseDir, file).replace(/\\\\/g, '/');

    if (relPath.includes('route.ts')) {
        let guard = 'NONE';
        if (content.includes('requireAdmin(') || content.includes('requireAdmin')) guard = 'requireAdmin()';
        else if (content.includes('requireRole(') || content.includes('requireRole')) guard = 'requireRole()';
        else if (content.includes('requireUser(') || content.includes('requireUser')) guard = 'requireUser()';
        else if (content.includes('auth()') || content.includes('getServerSession(')) guard = 'auth()';
        else if (content.includes('process.env.ADMIN_SECRET')) guard = 'ADMIN_SECRET (env)';
        else if (content.includes('process.env.ENABLE_DEV_LOGIN')) guard = 'DEV_ONLY';

        console.log(`| ${relPath} | ${guard} |`);
    } else {
        const regex = /export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const funcName = match[1];
            const bodyStart = match.index;
            const bodyBlock = content.substring(bodyStart, bodyStart + 500);
            
            let guard = 'NONE';
            if (bodyBlock.includes('requireAdmin(') || bodyBlock.includes('requireAdmin')) guard = 'requireAdmin()';
            else if (bodyBlock.includes('requireRole(') || bodyBlock.includes('requireRole')) guard = 'requireRole()';
            else if (bodyBlock.includes('requireUser(') || bodyBlock.includes('requireUser')) guard = 'requireUser()';
            else if (bodyBlock.includes('requireUniversity(') || bodyBlock.includes('requireUniversity')) guard = 'requireUniversity() -> auth()';
            else if (bodyBlock.includes('requireUniversityUser(') || bodyBlock.includes('requireUniversityUser')) guard = 'requireUniversityUser() -> auth()';
            else if (bodyBlock.includes('getUniversityOrThrow(') || bodyBlock.includes('getUniversityOrThrow')) guard = 'getUniversityOrThrow() -> auth()';
            else if (bodyBlock.includes('auth()')) guard = 'auth()';
            else if (bodyBlock.includes('signIn(')) guard = 'NextAuth signIn';
            else if (bodyBlock.includes('sendMagicLink(')) guard = 'Auth generation endpoint';

            console.log(`| ${relPath} : ${funcName}() | ${guard} |`);
        }
    }
}
