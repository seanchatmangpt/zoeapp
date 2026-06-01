const fs = require('fs');
const path = require('path');

const targetDir = '/Users/sac/pcp/src/framework';

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath);
    }
  });
}

// 1. Replace strings in all files
walkSync(targetDir, (filepath) => {
  // Only process text files (rudimentary check, or just try-catch)
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    // Ensure we are reading text
    if (content.includes('\0')) return; // skip binary

    let newContent = content
      .replace(/Zoe/g, 'Pcp')
      .replace(/zoe/g, 'pcp')
      .replace(/ZOE/g, 'PCP');

    if (content !== newContent) {
      fs.writeFileSync(filepath, newContent, 'utf8');
      console.log(`Updated content: ${filepath}`);
    }
  } catch (e) {
    console.error(`Error reading/writing ${filepath}:`, e);
  }
});

// 2. Rename files and directories (bottom-up to avoid path issues)
function renameWalkSync(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      renameWalkSync(filepath);
    }
    
    if (file.includes('Zoe') || file.includes('zoe') || file.includes('ZOE')) {
      const newFileName = file
        .replace(/Zoe/g, 'Pcp')
        .replace(/zoe/g, 'pcp')
        .replace(/ZOE/g, 'PCP');
      const newFilepath = path.join(dir, newFileName);
      fs.renameSync(filepath, newFilepath);
      console.log(`Renamed: ${filepath} -> ${newFilepath}`);
    }
  });
}

renameWalkSync(targetDir);
