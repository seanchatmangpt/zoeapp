import { IntelligenceRunner } from './src/lib/v2030/intelligence/runner';

console.log(IntelligenceRunner.name);

let MobileRunner: any;
const originalNodeVersion = process.versions.node;
Object.defineProperty(process.versions, 'node', { value: undefined, configurable: true });
MobileRunner = require('./src/lib/v2030/intelligence/runner').IntelligenceRunner;
Object.defineProperty(process.versions, 'node', { value: originalNodeVersion, configurable: true });

console.log(MobileRunner === IntelligenceRunner);
