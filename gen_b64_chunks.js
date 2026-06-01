const fs = require('fs');
const content = fs.readFileSync('/Users/sac/zoeapp/ocel_blueprint.md');
const b64 = content.toString('base64');
const chunks = b64.match(/.{1,80}/g);
fs.writeFileSync('/Users/sac/zoeapp/b64_chunks.txt', chunks.join('\n'));