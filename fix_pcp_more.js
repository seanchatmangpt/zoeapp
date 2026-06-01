const fs = require('fs');

// 1. PredictiveActionLayer.test.ts
const testPath = '/Users/sac/pcp/src/framework/2030/predictive/__tests__/PredictiveActionLayer.test.ts';
let testContent = fs.readFileSync(testPath, 'utf8');

// Add idempotencyKey to all CommandEnvelope mocks
testContent = testContent.replace(/payload: (.*),\n      principal: mockPrincipal,\n/g, "payload: $1,\n      principal: mockPrincipal,\n      idempotencyKey: 'test-key',\n");

// Add queries to ActorBehavior
testContent = testContent.replace(/commands: \{/g, "queries: {} as any,\n      commands: {");
fs.writeFileSync(testPath, testContent, 'utf8');
console.log('Updated PredictiveActionLayer.test.ts');

// 2. process-mining.test.ts
const pmTestPath = '/Users/sac/pcp/src/framework/2030/process-mining/__tests__/process-mining.test.ts';
let pmTestContent = fs.readFileSync(pmTestPath, 'utf8');
pmTestContent = pmTestContent.replace(/function generateFuzzedTraces\(count: number, anomalyRate: number\): string\[\]\[\] \{/g, "function generateFuzzedTraces(count: number, anomalyRate: number): Transition[][] {");
pmTestContent = pmTestContent.replace(/const traces: string\[\]\[\] = \[\];/g, "const traces: Transition[][] = [];");
fs.writeFileSync(pmTestPath, pmTestContent, 'utf8');
console.log('Updated process-mining.test.ts');

// 3. ExtremeFusionSyncEngine.ts
const extremeSyncPath = '/Users/sac/pcp/src/framework/2030/sync-extreme/ExtremeFusionSyncEngine.ts';
let extremeSyncContent = fs.readFileSync(extremeSyncPath, 'utf8');
extremeSyncContent = extremeSyncContent.replace(/private compression: any;/g, "private _compression: any;");
extremeSyncContent = extremeSyncContent.replace(/this\.compression = config\.compression;/g, "this._compression = config.compression;");
extremeSyncContent = extremeSyncContent.replace(/this\.compression\.decompress/g, "this._compression.decompress");
extremeSyncContent = extremeSyncContent.replace(/this\.compression\.compress/g, "this._compression.compress");
fs.writeFileSync(extremeSyncPath, extremeSyncContent, 'utf8');
console.log('Updated ExtremeFusionSyncEngine.ts');
