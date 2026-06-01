const fs = require('fs');

const readmePath = '/Users/sac/pcp/src/framework/README.md';
let readmeContent = fs.readFileSync(readmePath, 'utf8');

const oldQuickStart = `## 🚀 Quick Start: The \`Pcp2030\` Ultimate Wrapper

The \`Pcp2030\` provider is the singular entry point required to activate the full suite of 2030 capabilities. It orchestrates the on-device LLM engines, predictive action layers, and generative UI systems.

### 1. Wrap Your Application

At the root of your React Native or Web application, wrap your component tree with the \`<Pcp2030 />\` provider.

\`\`\`tsx
import React from 'react';
import { Pcp2030 } from '@/src/framework/2030/core';
import { myLocalLLMEngine } from './engines';

const App = () => {
  return (
    <Pcp2030 inferenceEngine={myLocalLLMEngine}>
      <RootNavigator />
    </Pcp2030>
  );
};
\`\`\`

### 2. Access the Unified Suite

Use the \`usePcp2030()\` hook to access sub-engines and framework state from any child component.

\`\`\`tsx
import { usePcp2030 } from '@/src/framework/2030/core';

const Dashboard = () => {
  const { genEx, predictive, version } = usePcp2030();

  // Trigger a predictive intent ingestion
  const handleAction = async (intent) => {
    await predictive.ingestIntent(intent);
  };

  return (
    <View>
      <Text>Pcp Framework v{version}</Text>
    </View>
  );
};
\`\`\``;

const newQuickStart = `## 🚀 Quick Start: Standalone Setup

The \`PcpFrameworkProvider\` is the singular entry point required to activate the framework. It operates as a standalone package providing error boundaries, theming, security (membrane), and suspense natively.

### 1. Installation

Install the package via your preferred package manager:

\`\`\`bash
npm install pcp
# or
yarn add pcp
\`\`\`

### 2. Wrap Your Application

At the root of your React Native or Web application, wrap your component tree with the \`<PcpFrameworkProvider>\` provider.

\`\`\`tsx
import React from 'react';
import { PcpFrameworkProvider } from 'pcp';

const App = () => {
  return (
    <PcpFrameworkProvider>
      <RootNavigator />
    </PcpFrameworkProvider>
  );
};
\`\`\``;

if (readmeContent.includes("Pcp2030")) {
  readmeContent = readmeContent.replace(oldQuickStart, newQuickStart);
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  console.log("README.md updated successfully.");
} else {
  console.log("Could not find old quick start in README.md. Maybe it's already updated?");
}

const providerPath = '/Users/sac/pcp/src/framework/core/PcpFrameworkProvider.tsx';
let providerContent = fs.readFileSync(providerPath, 'utf8');

const oldJSDoc = ` * - ErrorBoundary: Catch and handle rendering errors gracefully.
 * - ThemeProvider: Theming and visual styling logic natively.
 * - Suspense: Declarative data fetching and lazy loading boundary.
 * - SessionProvider: Authentication and user sessions.
 * - VkgProvider: Vector Knowledge Graph engine actor context.
 * - MembraneProvider: Security context and execution bounds.`;

const newJSDoc = ` * - ErrorBoundary: Catch and handle rendering errors gracefully.
 * - ThemeProvider: Theming and visual styling logic natively.
 * - Suspense: Declarative data fetching and lazy loading boundary.
 * - MembraneProvider: Security context and execution bounds.`;

if (providerContent.includes("SessionProvider")) {
  providerContent = providerContent.replace(oldJSDoc, newJSDoc);
  fs.writeFileSync(providerPath, providerContent, 'utf8');
  console.log("PcpFrameworkProvider.tsx updated successfully.");
} else {
  console.log("Could not find old JSDoc in PcpFrameworkProvider.tsx. Maybe it's already updated?");
}
