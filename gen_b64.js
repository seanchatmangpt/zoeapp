const fs = require('fs');
const content = fs.readFileSync('/Users/sac/zoeapp/ocel_blueprint.md');
fs.writeFileSync('/Users/sac/zoeapp/b64.txt', content.toString('base64'));