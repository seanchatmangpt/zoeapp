const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/components');
const destDir = path.join(__dirname, 'src/framework/ui');

fs.mkdirSync(destDir, { recursive: true });

const files = [
  'Themed.tsx',
  'StyledText.tsx',
  'TransitionOverlay.tsx',
  'AvatarRelativeProjection.tsx',
  'OfflineBanner.tsx'
];

files.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file);
  
  if (fs.existsSync(srcPath)) {
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // Update imports
    content = content.replace(/'\.\/useColorScheme'/g, "'../../components/useColorScheme'");
    content = content.replace(/'\.\.\/utils\/cn'/g, "'../../utils/cn'");
    content = content.replace(/'\.\.\/lib\/truex\/avatar\/types'/g, "'../../lib/truex/avatar/types'");
    content = content.replace(/'\.\.\/lib\/truex\/avatar\/matrix'/g, "'../../lib/truex/avatar/matrix'");
    
    fs.writeFileSync(destPath, content);
    
    // Create proxy file in src/components
    fs.writeFileSync(srcPath, `export * from '../framework/ui/${file.replace('.tsx', '')}';\n`);
  }
});

const indexContent = files.map(f => `export * from './${f.replace('.tsx', '')}';`).join('\n') + '\n';
fs.writeFileSync(path.join(destDir, 'index.ts'), indexContent);

console.log('Migration complete.');
