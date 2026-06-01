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

function fixImports(content, filePath) {
    let original = content;

    // Fix relative and old alias lib imports to @/src/lib/
    content = content.replace(/from ['"](\.\.\/)+src\/lib\/(.*?)['"]/g, "from '@/src/lib/$2'");
    content = content.replace(/from ['"](\.\.\/)+lib\/(.*?)['"]/g, "from '@/src/lib/$2'");
    // Also truex paths
    content = content.replace(/from ['"](\.\.\/)+truex\/(.*?)['"]/g, "from '@/src/lib/truex/$2'");

    // For VkgProvider, we will import it from props or type, but wait... 
    // If a component imports VkgProvider, how do we fix it? We don't have it.
    
    return content;
}

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let fixed = fixImports(content, file);
    if (content !== fixed) {
        fs.writeFileSync(file, fixed);
    }
}
console.log("Done");
