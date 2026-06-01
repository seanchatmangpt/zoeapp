const fs = require('fs');

// Task 2: PinchToZoom
const pinchPath = '/Users/sac/pcp/src/framework/ui/gestures/PinchToZoom.tsx';
let pinchContent = fs.readFileSync(pinchPath, 'utf8');
pinchContent = pinchContent.replace(/\.onUpdate\(\(event\) => \{/g, '.onUpdate((event: any) => {');
fs.writeFileSync(pinchPath, pinchContent);

// Task 2: SwipeToDismiss
const swipePath = '/Users/sac/pcp/src/framework/ui/gestures/SwipeToDismiss.tsx';
let swipeContent = fs.readFileSync(swipePath, 'utf8');
swipeContent = swipeContent.replace(/\.onUpdate\(\(event\) => \{/g, '.onUpdate((event: any) => {');
swipeContent = swipeContent.replace(/\.onEnd\(\(event\) => \{/g, '.onEnd((event: any) => {');
fs.writeFileSync(swipePath, swipeContent);

// Task 3: analyzer.ts
const analyzerPath = '/Users/sac/pcp/src/framework/ui/auto-fix/analyzer.ts';
let analyzerContent = fs.readFileSync(analyzerPath, 'utf8');
analyzerContent = analyzerContent.replace(
  `import { MMKV } from 'react-native-mmkv';\n\nconst storage = new (MMKV as any)();`,
  `import { mmkvInstance } from '../../../lib/store/mmkvStorage';`
);
analyzerContent = analyzerContent.replace(/storage\.clearAll\(\);/g, 'mmkvInstance.clearAll();');
fs.writeFileSync(analyzerPath, analyzerContent);

// Task 4: non-euclidean.test.ts
const testPath = '/Users/sac/pcp/src/framework/v30/post-cyberpunk/non-euclidean-state/__tests__/non-euclidean.test.ts';
let testContent = fs.readFileSync(testPath, 'utf8');
testContent = testContent.replace(
  /React\.createElement\(\s*Observer,\s*\{\s*state:\s*state\s*as\s*any\s*\},\s*\(\s*value:\s*any\s*\)\s*=>\s*React\.createElement\(\s*Text,\s*\{\s*testID:\s*"observed-value"\s*\},\s*String\(value\)\)\s*\)/g,
  `React.createElement(Observer, { state: state as any, children: (value: any) => React.createElement(Text, { testID: "observed-value" }, String(value)) })`
);
fs.writeFileSync(testPath, testContent);

console.log("All tasks fixed.");
