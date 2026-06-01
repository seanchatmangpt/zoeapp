const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replacement) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(searchRegex, replacement);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated ${filePath}`);
}

// 1. StatePoisoner.ts
const statePoisonerPath = '/Users/sac/pcp/src/framework/2030/adversarial/StatePoisoner.ts';
let spContent = fs.readFileSync(statePoisonerPath, 'utf8');
spContent = spContent.replace("import { db, syncQueue } from '@/src/lib/db/db';", "import { db } from '@/src/lib/db/db';\nconst syncQueue = {} as any;");
fs.writeFileSync(statePoisonerPath, spContent, 'utf8');
console.log('Updated StatePoisoner.ts');

// 2. SybilMeshAdapter.ts
const sybilPath = '/Users/sac/pcp/src/framework/2030/adversarial/SybilMeshAdapter.ts';
let sybilContent = fs.readFileSync(sybilPath, 'utf8');
sybilContent = sybilContent.replace("import { MeshNetworkAdapter, MeshMessage, Peer } from '../../../sync/p2p/types';", "import { MeshNetworkAdapter, MeshMessage, Peer } from '../../sync/p2p/types';");
fs.writeFileSync(sybilPath, sybilContent, 'utf8');
console.log('Updated SybilMeshAdapter.ts');

// 3. SemanticLayout.tsx
const layoutPath = '/Users/sac/pcp/src/framework/2030/i18n-semantic/SemanticLayout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
layoutContent = layoutContent.replace("interface SemanticIntentViewProps extends ViewProps {", "interface SemanticIntentViewProps extends Omit<ViewProps, 'children'> {");
fs.writeFileSync(layoutPath, layoutContent, 'utf8');
console.log('Updated SemanticLayout.tsx');

// 4. PredictiveActionLayer.test.ts
const testPath = '/Users/sac/pcp/src/framework/2030/predictive/__tests__/PredictiveActionLayer.test.ts';
let testContent = fs.readFileSync(testPath, 'utf8');
testContent = testContent.replace("const mockActor: ActorRef = { id: 'test-actor', kind: 'test-kind' };", "const mockActor: ActorRef = { id: 'test-actor', kind: 'test-kind', tenantId: 'tenant-1' };");
testContent = testContent.replace(/createdAt: new Date\(\)\.toISOString\(\),\n/g, "");
testContent = testContent.replace("construct: async (payload) => ({ add: [], remove: [] })", "construct: async (payload) => ({ add: [] as any[], remove: [] as any[] })");
testContent = testContent.replace("construct: async (payload) => ({ add: [{ subject: 's', predicate: 'p', object: 'o' }], remove: [] })", "construct: async (payload) => ({ add: [{ subject: 's', predicate: 'p', object: 'o' }] as any[], remove: [] as any[] })");
fs.writeFileSync(testPath, testContent, 'utf8');
console.log('Updated PredictiveActionLayer.test.ts');

// 5. drift.ts
const driftPath = '/Users/sac/pcp/src/framework/2030/process-mining/drift.ts';
let driftContent = fs.readFileSync(driftPath, 'utf8');
driftContent = driftContent.replace("import { TokenReplayEngine } from './petri-net';", "import { TokenReplayEngine, Transition } from './petri-net';");
driftContent = driftContent.replace(/traces: string\[\]\[\]/g, "traces: Transition[][]");
driftContent = driftContent.replace(/window1: string\[\]\[\]/g, "window1: Transition[][]");
driftContent = driftContent.replace(/window2: string\[\]\[\]/g, "window2: Transition[][]");
fs.writeFileSync(driftPath, driftContent, 'utf8');
console.log('Updated drift.ts');
