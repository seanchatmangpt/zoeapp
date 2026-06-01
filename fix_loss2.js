const fs = require('fs');
const file = '/Users/sac/wasm4pm-compat/src/loss.rs';
let text = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Manual \`Clone\`\/\`Debug\`.+?    pub fn is_lossless/s;

text = text.replace(regex, `impl LossReport {\n    pub fn is_lossless`);

fs.writeFileSync(file, text);
console.log("Fixed loss.rs part 2");