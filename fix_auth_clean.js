const fs = require('fs');

const authPath = '/Users/sac/pcp/src/framework/auth/__tests__/authResiliencySimulator.test.tsx';
let authCode = fs.readFileSync(authPath, 'utf8');
authCode = authCode.replace(/let verifyResult: any;/g, "let verifyResult: { verified: boolean } | undefined;");
authCode = authCode.replace(/expect\(verifyResult\.verified\)/g, "expect(verifyResult?.verified)");
fs.writeFileSync(authPath, authCode);

console.log("Done auth clean up");
