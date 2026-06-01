const fs = require('fs');
const cp = require('child_process');

const path = '/Users/sac/zoeapp/process-intelligence/research/open-ontologies-integration/emitted/integration_strategy.md';
const content = `# Open Ontologies Integration Strategy

## 1. Interaction Strategy
The \`process-intelligence\` repository acts as the operational brain, continuously interacting with \`open-ontologies\`. The interaction is strictly unidirectional for execution definition: \`open-ontologies\` provides the declarative schemas, semantic laws, and process definitions, while \`process-intelligence\` consumes them to enact process governance, analysis, and execution.

## 2. Public Schema Repository
\`open-ontologies\` serves as the public schema repository. It is the definitive source of truth for the ontology.

## 3. Law Manufacturing (A = μ(O*))
\`process-intelligence\` uses \`ggen\` to manufacture execution law from the schemas in \`open-ontologies\`. This relationship is formalized by the Chatman Equation:
**A = μ(O*)**

Where:
- **A** (Application/Execution) is the resulting executable behavior within \`process-intelligence\`.
- **μ** (Manufacturing function) is the \`ggen\` generative pipeline.
- **O*** (Ontology) is the set of schemas, semantic laws, and process definitions hosted in \`open-ontologies\`.

By treating \`open-ontologies\` as the invariant source, \`ggen\` guarantees that the generated execution code (A) strictly adheres to the defined ontological constraints (O*), establishing deterministic law closure.
`;

const b64 = Buffer.from(content).toString('base64');
const cmd = `node -e "const fs=require('fs'); fs.mkdirSync(require('path').dirname('${path}'), {recursive: true}); fs.writeFileSync('${path}', Buffer.from('${b64}', 'base64').toString('utf8'))"`;

console.log("Running command: " + cmd);
cp.execSync(cmd, {stdio: 'inherit'});
