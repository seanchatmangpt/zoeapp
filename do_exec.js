const fs = require('fs');
const { execSync } = require('child_process');

// Read the base64 output
const b64 = fs.readFileSync('/Users/sac/zoeapp/temp_vuln.b64', 'utf8').trim();

// Execute the required command format
const cmd = `node -e "const fs=require('fs'); fs.mkdirSync('/Users/sac/process-intelligence/prompts/execution-plans', {recursive:true}); fs.writeFileSync('/Users/sac/process-intelligence/prompts/execution-plans/lifecycle-state-authority.md', Buffer.from('${b64}', 'base64').toString('utf8'));"`;

execSync(cmd, { stdio: 'inherit' });
