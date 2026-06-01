const fs = require('fs');
const path = require('path');
const pcpPath = '/Users/sac/pcp';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(pcpPath, 'src/framework'));
console.log(`Found ${files.length} files in framework`);
let updated = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We will just log all imports for now to see what we are dealing with.
    const importRegex = /from ['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const imp = match[1];
        if (imp.includes('lib') || imp.includes('context') || imp.includes('components')) {
            console.log(`${file}: ${imp}`);
        }
    }
}
