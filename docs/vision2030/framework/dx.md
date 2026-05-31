# Developer Experience (DX) & Experimentation Module

The **Developer Experience (DX) & Experimentation** module is a foundational capability of the **Zoe 2030 Innovation Peak**. It integrates runtime A/B testing infrastructure with developer-centric CLI scaffolding templates to accelerate the creation of semantic interfaces, dynamic layouts, and sync behaviors.

---

## 1. Overview

In the Zoe 2030 runtime, the user interface and data routing must remain highly adaptable and auditable. The `dx` module provides:
1. **Deterministic A/B Testing**: Enables declarative, weighted, and persistent feature variant assignment to users, powered by fast local persistence via MMKV.
2. **Auto-Scaffolding Templates**: Provides structured templates for generating Schema.org-compatible TypeScript interfaces, semantic hooks, React Native UI components, and sync engines, minimizing developer overhead and maintaining strict architectural conformance.

---

## 2. Architectural & Philosophical Mapping

The `dx` module is structured to enforce the core Truex architecture (Membrane, Intake, Projection, Supervision) and aligns directly with the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

### 1. Architectural Mapping

```
                 ┌────────────────────────────────────────────────────────┐
                 │                       SUPERVISION                      │
                 │   - Validates experiment declarations & context bounds │
                 │   - Safeguards missing configs & undefined boundaries  │
                 └──────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                        MEMBRANE                        │
                 │   - Ensures variants are restricted to allowed bounds  │
                 │   - Governs stickiness and sandboxes experiments       │
                 └──────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                         INTAKE                         │
                 │   - Ingests config arrays, weights, and URL overrides  │
                 │   - Pulls persisted variants from MMKV storage         │
                 └──────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                       PROJECTION                       │
                 │   - Declaratively projects variants via JSX Elements   │
                 │   - Inject generated templates into source codebase    │
                 └────────────────────────────────────────────────────────┘
```

* **Intake**: Ingests configuration matrices (`ExperimentConfig`), variant weight distributions, and retrieves persisted state strings from local storage.
* **Membrane**: Confirms that any assigned or forced variant remains strictly within the bounds defined by the experiment's declared ontology. Out-of-bounds attempts are intercepted and rejected.
* **Projection**: Renders matching React elements based on variant assignment via `<Experiment>` and `<Variant>` components, or outputs code artifacts from CLI templates to match the runtime environment.
* **Supervision**: Actively monitors that hooks are called within matching context providers and halts execution with descriptive assertions if an experiment is unregistered or undefined.

### 2. Chatman Equation Conformance

| Term | Equation Variable | DX Module Conformance |
| :--- | :--- | :--- |
| **Lawful Closure Ontology** | $O^*$ | **A/B Testing**: Defined via `ExperimentConfig` as the bounded set of allowable variants and their associated weights.<br>**CLI Scaffold**: Defined as the Schema.org RDF type definitions and structural code requirements. |
| **Transformation Function** | $\mu$ | **A/B Testing**: The `assignVariant` selector function that computes variant assignments based on probability weights or random distribution.<br>**CLI Scaffold**: Generator functions that translate an entity identifier (`name`) into ready-to-run source code files. |
| **Emitted Consequence** | $A$ | **A/B Testing**: The specific user interface variant layout or logic branch projected onto the user screen.<br>**CLI Scaffold**: The generated, fully realized files integrated directly into the application's runtime. |
| **Receipt Lineage** | $R$ | **A/B Testing**: Sticky assignment receipts persisted directly in MMKV storage, guaranteeing user consistency across sessions.<br>**CLI Scaffold**: Creation and verification logs indicating successful generation under the predefined schema rules. |

---

## 3. Source Code Structure

The module is located at [dx](file:///Users/sac/zoeapp/src/framework/dx) and comprises the following files:

### A/B Testing Submodule
* **[types.ts](file:///Users/sac/zoeapp/src/framework/dx/ab-testing/types.ts)**: Declares configuration interfaces, hook return shapes, and context value structures for the A/B testing framework.
* **[ExperimentProvider.tsx](file:///Users/sac/zoeapp/src/framework/dx/ab-testing/ExperimentProvider.tsx)**: React Context Provider managing A/B experiment assignments, variant weighting calculations, and sticky storage persistence.
* **[useExperiment.ts](file:///Users/sac/zoeapp/src/framework/dx/ab-testing/useExperiment.ts)**: Custom React hook supplying components with their assigned variant, configuration, and manual overrides.
* **[ExperimentComponents.tsx](file:///Users/sac/zoeapp/src/framework/dx/ab-testing/ExperimentComponents.tsx)**: Declarative layout components (`Experiment`, `Variant`) allowing conditional rendering based on assigned variants.
* **[index.ts](file:///Users/sac/zoeapp/src/framework/dx/ab-testing/index.ts)**: Unified entry-point exposing the A/B testing APIs.
* **[ab-testing.test.tsx](file:///Users/sac/zoeapp/src/framework/dx/ab-testing/__tests__/ab-testing.test.tsx)**: Full test suite validating weights, persistence, fallbacks, and rendering behaviors.

### CLI Scaffolding Submodule
* **[templates.ts](file:///Users/sac/zoeapp/src/framework/dx/cli-scaffold/templates.ts)**: Code templates generating Schema.org interfaces, React hooks, UI card components, and framework sync handlers.

---

## 4. Public Interfaces & API Contracts

### 1. Types (`types.ts`)

#### `ExperimentConfig<T>`
Configuration parameters for registering an individual A/B experiment.
```typescript
export interface ExperimentConfig<T extends string = string> {
  id: string;          // Unique identifier for the experiment
  variants: T[];       // List of variants (e.g. ['A', 'B'])
  weights?: number[];  // Probability weights for variants (must sum to 1)
  description?: string;// Optional description
  sticky?: boolean;    // If true, persists assignment in local storage (default: true)
}
```

#### `ExperimentAssignment<T>`
Details of a user's assigned variant.
```typescript
export interface ExperimentAssignment<T extends string = string> {
  variant: T;          // Assigned variant value
  isForced: boolean;   // Whether the assignment was manually overridden
}
```

#### `UseExperimentReturn<T>`
Payload returned by the `useExperiment` hook.
```typescript
export interface UseExperimentReturn<T extends string = string> {
  variant: T;
  setVariant: (variant: T) => void;
  config: ExperimentConfig<T>;
}
```

---

### 2. Context & Provider (`ExperimentProvider.tsx`)

#### `ExperimentProvider`
Context provider initializing experiments and storing active assignments.
```typescript
interface ExperimentProviderProps {
  children: React.ReactNode;
  configs: ExperimentConfig[];
  initialAssignments?: Record<string, string>; // Optional assignments (testing/SSR)
}

export const ExperimentProvider: React.FC<ExperimentProviderProps>;
```

---

### 3. Declarative Components (`ExperimentComponents.tsx`)

#### `Experiment`
Wraps variant options and renders the matching child.
```typescript
interface ExperimentProps {
  id: string;
  children: React.ReactNode;
}

export const Experiment: React.FC<ExperimentProps>;
```

#### `Variant`
Container for variant-specific code blocks. Must be a direct child of `Experiment`.
```typescript
interface VariantProps {
  name: string;
  children: React.ReactNode;
}

export const Variant: React.FC<VariantProps>;
```

---

### 4. CLI Scaffold Templates (`templates.ts`)

* **`semanticTypeTemplate(name: string): string`**: Generates a standard interface extending `GraphNode` with a specific Schema.org type mapping.
* **`hookTemplate(name: string): string`**: Generates a semantic React hook linked to the Virtual Knowledge Graph (VKG).
* **`uiTemplate(name: string): string`**: Generates a React Native UI component displaying the entity data.
* **`syncTemplate(name: string): string`**: Generates a `FrameworkSyncEngine` implementation handling create/update sync transactions.

---

## 5. Usage Guide

Below is a complete, production-ready, copy-pasteable TypeScript code block demonstrating how to define configurations, wrap the application with the `ExperimentProvider`, use the hook and declarative components, and execute scaffolding template generators.

```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText } from '../ui/StyledText';

// 1. Import A/B testing resources
import { 
  ExperimentProvider, 
  useExperiment, 
  Experiment, 
  Variant, 
  ExperimentConfig 
} from './ab-testing';

// 2. Import Scaffold templates
import { 
  semanticTypeTemplate, 
  hookTemplate, 
  uiTemplate, 
  syncTemplate 
} from './cli-scaffold/templates';

// Define Experiment Configurations
const appExperiments: ExperimentConfig[] = [
  {
    id: 'onboarding-cta-color',
    variants: ['classic-blue', 'neon-green', 'secure-amber'],
    weights: [0.4, 0.4, 0.2], // 40% blue, 40% green, 20% amber
    description: 'A/B test onboarding button colors to optimize conversion rates.',
    sticky: true
  },
  {
    id: 'feature-flag-vkg-sync',
    variants: ['enabled', 'disabled'],
    weights: [0.5, 0.5],
    sticky: false // Assignments recalculate every reload
  }
];

// App entry-point wrapping tree in provider
export function RootDxProviderWrapper() {
  return (
    <ExperimentProvider configs={appExperiments}>
      <ExperimentDashboard />
    </ExperimentProvider>
  );
}

function ExperimentDashboard() {
  // Access experiment assignment programmatically via hook
  const { variant: ctaColor, setVariant: setCtaColor } = useExperiment<'classic-blue' | 'neon-green' | 'secure-amber'>('onboarding-cta-color');

  const getButtonColor = () => {
    switch (ctaColor) {
      case 'neon-green': return '#10B981';
      case 'secure-amber': return '#F59E0B';
      case 'classic-blue':
      default:
        return '#3B82F6';
    }
  };

  return (
    <View style={styles.container}>
      <StyledText style={styles.header}>Zoe 2030 Experiment Board</StyledText>
      
      {/* Dynamic Styling Consequence of the Assignment */}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: getButtonColor() }]} 
        onPress={() => console.log('CTA Pressed under variant:', ctaColor)}
      >
        <StyledText style={styles.buttonText}>Submit Application</StyledText>
      </TouchableOpacity>

      {/* Manual Override Option */}
      <TouchableOpacity 
        style={styles.overrideButton} 
        onPress={() => setCtaColor('secure-amber')}
      >
        <StyledText style={styles.overrideText}>Force Amber Variant</StyledText>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Declarative Component-Level A/B rendering */}
      <StyledText style={styles.subHeader}>Declarative Component Test</StyledText>
      <Experiment id="feature-flag-vkg-sync">
        <Variant name="enabled">
          <View style={styles.featureBox}>
            <StyledText>✨ Advanced VKG Sync Panel (Enabled)</StyledText>
          </View>
        </Variant>
        <Variant name="disabled">
          <View style={styles.featureBox}>
            <StyledText>ℹ️ VKG Sync is currently disabled.</StyledText>
          </View>
        </Variant>
      </Experiment>
    </View>
  );
}

// Example demonstrating programmatic usage of cli-scaffold templates
export function runProgrammaticScaffold(name: string): Record<string, string> {
  return {
    interfaceFile: semanticTypeTemplate(name),
    hookFile: hookTemplate(name),
    uiFile: uiTemplate(name),
    syncFile: syncTemplate(name)
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },
  subHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: '#374151',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  overrideButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  overrideText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  featureBox: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  }
});
```

---

## 6. Testing

The reliability of A/B assignments, weight models, and persistence is validated by a robust Jest test suite located at [ab-testing.test.tsx](file:///Users/sac/zoeapp/src/framework/dx/ab-testing/__tests__/ab-testing.test.tsx).

### 1. How to run tests

To run the suite in the project environment, run:

```bash
npm test src/framework/dx/ab-testing/__tests__/ab-testing.test.tsx
```

### 2. Test Coverage

The test suite thoroughly validates:
* **Storage Retrieval**: Asserts that if a variant is already in the MMKV storage, it gets returned directly without re-calculating or rewriting.
* **New Assignments**: Mocks `Math.random` to confirm the deterministic selection of variants, and checks that sticky variants are written to storage.
* **Weighted Distributions**: Validates that extreme weights (e.g. `[0, 1]`) guarantee the targeted variant is selected.
* **Non-Sticky Experiments**: Confirms that non-sticky configurations are not saved back to MMKV.
* **Error Bounds**: Verifies that calling hooks outside the provider context, or querying missing/undefined experiments, immediately raises precise errors to prevent runtime errors.
* **Declarative Rendering**: Asserts that only the children matching the assigned variant are mounted and rendered, ignoring non-Variant children components.
