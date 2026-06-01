# Zoe 2030 Core Module

The `core` module is the entry point of the **Zoe 2030 Innovation Peak** framework architecture. It provides the root runtime wrapper, initializes core frontier orchestration engines—namely **GenEx (Generative UX)** and **Prediction (PAL - Predictive Action Layer)**—and wraps the legacy layers to guarantee backward compatibility.

---

## 1. Overview

The `core` module serves as the primary coordination layer for Zoe 2030. It encapsulates execution state and provides sub-engines with access to ambient context, such as local inference engines. 

By wrapping the application in the `<Zoe2030 />` provider, developers expose autonomous user interface generation (`GenExEngine`) and anticipatory action prediction (`PredictionEngine`) to all downstream React components via the unified `useZoe2030()` hook.

---

## 2. Architectural & Philosophical Mapping

In the Zoe 2030 Peak architecture, execution trust and user interaction align with the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
* **$O^*$ (Lawful Closure Ontology):** The real-time application state and user intents bounded by the local client environment and safety constraints.
* **$\mu$ (Manufacturing/Transformation Function):** The engine orchestrator that translates system/user intent into consequence.
* **$A$ (Emitted Consequence):** The avatar-relative UI layout, database updates, or network transactions.
* **$R$ (Receipt Lineage):** The verifiable evidence sequence demonstrating execution compliance.

### Alignment of the Core Module:
1. **Host of $\mu$ components:** The `Zoe2030` provider initializes the instances of `GenExEngine` (which acts as a visual layout manufacturing function converting trust metrics and navigation history into dynamic layouts) and `PredictionEngine` (which anticipates next-step state transitions to ensure future actions stay within the bounds of $O^*$).
2. **Context Parity:** It ensures that every downstream component can leverage $\mu$ deterministically via React Context.
3. **Execution Membrane:** By wrapping the legacy `ZoeFrameworkProvider`, it preserves the database transaction hooks and offline-first synchronizers, ensuring that any dynamic layout adjustments or predicted actions are safely backed by state closed within $O^*$ and verified under $R$.

---

## 3. Source Code Structure

The module is composed of the following files:

* **[Zoe2030.tsx](file:///Users/sac/zoeapp/src/framework/2030/core/Zoe2030.tsx):** 
  Contains the definition of the React Context `Zoe2030Context`, the `<Zoe2030 />` provider component, and the `useZoe2030()` hook. It orchestrates engine instantiation with `useMemo`.
* **[index.ts](file:///Users/sac/zoeapp/src/framework/2030/core/index.ts):** 
  Re-exports the provider and hook for clean external imports.
* **[__tests__/Zoe2030.test.tsx](file:///Users/sac/zoeapp/src/framework/2030/core/__tests__/Zoe2030.test.tsx):** 
  Unit tests validating that engines are properly instantiated and error boundary checks are raised when hooks are used incorrectly.

---

## 4. Public Interfaces & API Contracts

### `Zoe2030ContextState`

Represents the shared runtime value provided to the React tree.

```typescript
export interface Zoe2030ContextState {
  /** The GenEx engine for autonomous UI generation */
  genEx: GenExEngine;
  /** The Prediction engine for anticipatory UX */
  predictive: PredictionEngine;
  /** Version of the 2030 frontier layer */
  version: string;
}
```

### `Zoe2030Props`

Props expected by the root provider component.

```typescript
export interface Zoe2030Props {
  children: React.ReactNode;
  /** On-device inference engine required for GenEx */
  inferenceEngine: ILocalInferenceEngine;
  /** Optional configuration overrides for the legacy framework */
  config?: any;
}
```

### `<Zoe2030 />`

A functional component wrapping the application. It initializes the `GenExEngine` and `PredictionEngine` with stable references and renders the `ZoeFrameworkProvider` inside the context tree.

### `useZoe2030()`

A custom React hook to consume the core context.

* **Returns:** `Zoe2030ContextState`
* **Throws:** An `Error` stating `"useZoe2030 must be used within a Zoe2030 provider"` if invoked in a component that is not a child of `<Zoe2030 />`.

---

## 5. Usage Guide

Below is a complete, copy-pasteable TypeScript integration illustrating how to initialize the provider with a local inference engine and consume the engines within a component.

```typescript
import React from 'react';
import { View, Text, Button } from 'react-native';
import { Zoe2030, useZoe2030 } from '../core';
import { ILocalInferenceEngine, RunInferenceOptions, LocalInferenceResult } from '../../ai/on-device/types';
import { CommandEnvelope } from '../../../lib/actor/types';

// 1. Implement or instantiate a compliant on-device inference engine
class LocalLLMEngine implements ILocalInferenceEngine {
  async infer(options: RunInferenceOptions): Promise<LocalInferenceResult> {
    // Returns a valid JSON aesthetic configuration corresponding to the prompt request
    return {
      text: JSON.stringify({
        name: "Dynamic Executive Variant",
        aesthetic: {
          primaryColor: "#0f172a",
          backgroundColor: "#f8fafc",
          spacingScale: 0.9,
          borderRadius: 6
        },
        layoutType: "focused"
      }),
      usage: {
        promptTokens: 42,
        completionTokens: 35,
        totalTokens: 77
      }
    };
  }

  async streamInfer(
    options: RunInferenceOptions, 
    onToken: (token: string) => void
  ): Promise<LocalInferenceResult> {
    const resultText = "Streaming is simulated for this example.";
    onToken(resultText);
    return {
      text: resultText,
      usage: {
        promptTokens: 10,
        completionTokens: 10,
        totalTokens: 20
      }
    };
  }
}

const inferenceEngineInstance = new LocalLLMEngine();

// 2. Child component consuming the Zoe 2030 Core Hook
export const DashboardComponent: React.FC = () => {
  const { genEx, predictive, version } = useZoe2030();

  const handleGenerateLayout = async () => {
    // Generate a layout variant based on user trust score (0.0 to 1.0) and navigation history
    const variant = await genEx.generateVariant(0.95, ['Home', 'Settings', 'Security']);
    console.log('Generated Aesthetic Variant ID:', variant.id);
    console.log('Primary Color Recommendation:', variant.aesthetic.primaryColor);
  };

  const handlePredictActions = () => {
    const sampleEnvelope: CommandEnvelope = {
      id: 'cmd_evt_991',
      command: 'ACTIVATE_BIO_LOCK',
      actor: { id: 'user_01', kind: 'OPERATOR' },
      payload: { target: 'vault_alpha' },
      createdAt: new Date().toISOString(),
      idempotencyKey: 'idemp_key_88291'
    };

    // Analyze transitions to receive predicted commands
    const predictions = predictive.analyze(sampleEnvelope);
    predictions.forEach((pred) => {
      console.log(`Predicted Command: ${pred.envelope.command} with probability ${pred.probability.toFixed(2)}`);
    });
  };

  return (
    <View style={{ padding: 24, backgroundColor: '#f1f5f9' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Zoe 2030 Workspace</Text>
      <Text style={{ marginVertical: 8 }}>Runtime Version: {version}</Text>
      
      <Button title="Generate UX Variant" onPress={handleGenerateLayout} />
      <View style={{ height: 12 }} />
      <Button title="Analyze & Predict Next Command" onPress={handlePredictActions} />
    </View>
  );
};

// 3. Application Root wrapping the view tree
export const RootApp: React.FC = () => {
  const frameworkConfig = {
    enableOfflineSync: true,
    dbName: 'zoe_operational_ledger'
  };

  return (
    <Zoe2030 inferenceEngine={inferenceEngineInstance} config={frameworkConfig}>
      <DashboardComponent />
    </Zoe2030>
  );
};
```

---

## 6. Test Suite

The core module is verified using Jest and `@testing-library/react-native` to guarantee runtime stability:

* **Engine Instantiation Verification:** Uses `renderHook` to verify that the `GenExEngine` and `PredictionEngine` are properly instantiated and available via context.
* **Property Inspection:** Confirms the version string exports matching the canonical version `2030.1.1-ultimate`.
* **Boundary Error Handling:** Assures that attempting to call `useZoe2030()` outside of a `<Zoe2030 />` provider parent raises a precise runtime Exception: `"useZoe2030 must be used within a Zoe2030 provider"`.

To run the core test suite manually:
```bash
npm run test src/framework/2030/core/
```
