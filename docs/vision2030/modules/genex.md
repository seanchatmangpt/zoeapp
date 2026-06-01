# GenEx Module: Generative UI & Dynamic Adaptive Layouts

The **GenEx (Generative Experience)** module is a key frontier capability of the **Zoe 2030 Innovation Peak**. It leverages on-device LLMs (Local Inference Engines) to dynamically reshape the application's user interface configuration based on the operator's real-time behavioral biometric metrics (specifically the **Trust Score**) and navigation history.

---

## 1. Overview

In the Zoe 2030 runtime, the user interface is no longer a static layout. GenEx introduces a generative, self-adapting UX paradigm that responds dynamically to changes in context:
* **High Trust Scores ($\ge 0.8$)**: The layout relaxes, expanding to display fluid, rich aesthetics, increased white space, and larger borders. This represents an "unlocked" state suited for optimal flow.
* **Low Trust Scores ($\le 0.4$)**: The layout automatically contracts, changing to a compact, high-contrast, security-focused layout. Interactive fields become denser, forcing careful input and structured verification steps.
* **Ambient Intelligence**: By combining continuous behavioral biometrics with local execution, GenEx ensures zero network latency and maximum privacy preservation.

---

## 2. Architectural & Philosophical Mapping

GenEx maps directly to the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:

| Term | Equation Variable | GenEx Mapping & Conformance |
| :--- | :--- | :--- |
| **Lawful Closure Ontology** | $O^*$ | Defined in `types.ts` as the set of allowable UI layout states (`compact` \| `relaxed` \| `focused` \| `expansive`) and aesthetic constraint boundaries (spacing scales, color hex codes, and border radii). |
| **Transformation Function** | $\mu$ | Implemented by `GenExEngine` (prompting the local on-device LLM) and coordinated by `useGenExAutoAdapt`. It transforms raw behavioral trust scores and navigation paths into a valid UI configuration. |
| **Emitted Consequence** | $A$ | The actual rendering of the adapted UI container via CSS custom properties injected by `GenExDynamicWrapper`. |
| **Receipt Lineage** | $R$ | The audit trail of trust score shifts and layout regenerations maintained in the engine's `history` log, proving the UI adapted strictly in accordance with security policies. |

```
                       [ Behavioral Biometrics / Navigation ]
                                        │
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │          Transformation Function         │
                  │              μ(trustScore)               │
                  └─────────────────────┬────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │          Lawful Closure Ontology         │
                  │             GenExVariant (O*)            │
                  └─────────────────────┬────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │            Emitted Consequence           │
                  │         GenExDynamicWrapper (A)          │
                  └──────────────────────────────────────────┘
```

---

## 3. Source Code Structure

The module is located at `src/framework/2030/genex/` and comprises the following files:

* **[index.ts](file:///Users/sac/zoeapp/src/framework/2030/genex/index.ts)**: The unified module exporter exposing types, components, and React hooks.
* **[types.ts](file:///Users/sac/zoeapp/src/framework/2030/genex/types.ts)**: Declares typescript interfaces for aesthetics, layout variants, provider states, and configuration options.
* **[GenExEngine.ts](file:///Users/sac/zoeapp/src/framework/2030/genex/GenExEngine.ts)**: Core logic engine responsible for compiling prompting contexts, querying `ILocalInferenceEngine`, parsing JSON responses, and executing heuristic fallback rules.
* **[GenExProvider.tsx](file:///Users/sac/zoeapp/src/framework/2030/genex/GenExProvider.tsx)**: React Context Provider initializing the singleton `GenExEngine` and managing runtime state, including history lists and regeneration states.
* **[GenExDynamicWrapper.tsx](file:///Users/sac/zoeapp/src/framework/2030/genex/GenExDynamicWrapper.tsx)**: React component wrapper that maps active layout variants to CSS custom variables (`--genex-primary-color`, etc.) and custom class names.
* **[useGenExAutoAdapt.ts](file:///Users/sac/zoeapp/src/framework/2030/genex/useGenExAutoAdapt.ts)**: Adaptive React hook connecting `useGenEx` with continuous biometric telemetry from `useBehavioralAuth`.

---

## 4. Public Interfaces & API Contracts

### Types (`types.ts`)

```typescript
export interface GenExAesthetic {
  primaryColor: string;     // Hex or CSS variable
  backgroundColor: string;  // Hex or CSS variable
  spacingScale: number;     // Multiplier (e.g. 1.0, 1.2)
  borderRadius: number;     // Border radius in pixels
}

export interface GenExVariant {
  id: string;
  name: string;
  aesthetic: GenExAesthetic;
  layoutType: 'compact' | 'relaxed' | 'focused' | 'expansive';
}

export interface GenExState {
  currentVariant: GenExVariant;
  lastTrustScore: number;
  history: GenExVariant[];
  isGenerating: boolean;
}

export interface GenExOptions {
  engineId?: string;
  adaptationStrategy: 'eager' | 'lazy' | 'manual';
}

export interface GenExContextValue extends GenExState {
  regenerate: (trustScore: number, navHistory: string[]) => Promise<void>;
  setVariant: (variant: GenExVariant) => void;
}
```

### The Engine (`GenExEngine.ts`)

Encapsulates LLM prompt construction and heuristics fallbacks.

```typescript
export class GenExEngine {
  constructor(private inferenceEngine: ILocalInferenceEngine);

  /**
   * Generates a new UI variant configuration based on trust context and history.
   */
  async generateVariant(trustScore: number, navHistory: string[]): Promise<GenExVariant>;
}
```

### The Auto-Adaptation Hook (`useGenExAutoAdapt.ts`)

```typescript
export function useGenExAutoAdapt(
  currentPath: string, 
  options?: {
    ignorePaths?: string[];
    trustThreshold?: number; // Minimum trust change delta to trigger adaptation (Default: 0.1)
  }
): {
  trustScore: number;
  navHistory: string[];
};
```

---

## 5. Usage Guide

This guide demonstrates how to wrap your application, listen to behavioral telemetry, and render elements using CSS custom properties injected by the `GenExDynamicWrapper`.

```tsx
import React from 'react';
import { 
  Zoe2030 
} from '../../core/Zoe2030';
import { 
  GenExProvider, 
  GenExDynamicWrapper, 
  useGenExAutoAdapt, 
  useGenEx 
} from '../genex';
import { defaultLocalInferenceEngine } from '../../ai/on-device/LocalInferenceEngine';

// 1. Root Orchestrator Wrapper
export function ZoeRootApp() {
  return (
    <Zoe2030 inferenceEngine={defaultLocalInferenceEngine}>
      <GenExProvider initialTrustScore={1.0}>
        <GenExDynamicWrapper>
          <AdaptiveDashboard currentPath="/dashboard" />
        </GenExDynamicWrapper>
      </GenExProvider>
    </Zoe2030>
  );
}

// 2. Child View Executing Autoadaptation
interface AdaptiveDashboardProps {
  currentPath: string;
}

export function AdaptiveDashboard({ currentPath }: AdaptiveDashboardProps) {
  // Bind UI regeneration to navigation and trust score changes
  const { trustScore, navHistory } = useGenExAutoAdapt(currentPath, {
    trustThreshold: 0.05,
  });

  const { currentVariant, isGenerating } = useGenEx();

  return (
    <div className="dashboard-container" style={localStyles.container}>
      <header style={localStyles.header}>
        <h3>Zoe 2030 Generative Portal</h3>
        {isGenerating && <span className="loader">Regenerating UX...</span>}
      </header>

      <section style={localStyles.metricsBox}>
        <p><strong>Security Trust Index:</strong> {(trustScore * 100).toFixed(0)}%</p>
        <p><strong>Aesthetic Variant:</strong> {currentVariant.name} ({currentVariant.layoutType})</p>
        <p><strong>Nav Chain:</strong> {navHistory.join(' → ')}</p>
      </section>

      {/* Renders content styled with custom CSS properties injected by GenExDynamicWrapper */}
      <main style={localStyles.cardGrid}>
        <div style={localStyles.adaptiveCard} className="adaptive-card">
          <h4>Transactional Panel</h4>
          <p>
            This card automatically shifts spacing, border-radius, and theme colors
            locally without layout reflow glitches.
          </p>
          <button style={localStyles.button}>Verify Proof</button>
        </div>
      </main>
    </div>
  );
}

// 3. Local Dynamic Styling utilizing CSS custom properties
const localStyles = {
  container: {
    backgroundColor: 'var(--genex-background-color)',
    padding: 'calc(2 * var(--genex-spacing-unit))',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--genex-primary-color)',
    paddingBottom: 'var(--genex-spacing-unit)',
  },
  metricsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 'var(--genex-spacing-unit)',
    borderRadius: 'var(--genex-border-radius)',
    margin: 'var(--genex-spacing-unit) 0',
  },
  cardGrid: {
    marginTop: 'calc(2 * var(--genex-spacing-unit))',
  },
  adaptiveCard: {
    border: '1px solid var(--genex-primary-color)',
    borderRadius: 'var(--genex-border-radius)',
    padding: 'calc(1.5 * var(--genex-spacing-unit))',
    maxWidth: '400px',
  },
  button: {
    backgroundColor: 'var(--genex-primary-color)',
    color: '#fff',
    border: 'none',
    padding: 'var(--genex-spacing-unit) calc(2 * var(--genex-spacing-unit))',
    borderRadius: 'calc(0.5 * var(--genex-border-radius))',
    cursor: 'pointer',
  },
};
```

---

## 6. Test Suite & Integration

GenEx integration is validated as part of the core Zoe 2030 suite.

### Core Integration Test (`Zoe2030.test.tsx`)
The core setup checks that `GenExEngine` is instantiated correctly with the local inference provider:

```typescript
it('should provide genEx and predictive engines', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Zoe2030 inferenceEngine={mockInferenceEngine}>
      {children}
    </Zoe2030>
  );

  const { result } = renderHook(() => useZoe2030(), { wrapper });

  expect(result.current.genEx).toBeDefined();
  expect(result.current.version).toBe('2030.1.1-ultimate');
});
```

### Suggested Unit Test Pattern
To isolate and verify `GenExEngine`'s parsing and fallback heuristics, use the following pattern:

```typescript
import { GenExEngine } from '../GenExEngine';

describe('GenExEngine Heuristics & Parsing', () => {
  const mockInferenceEngine = {
    infer: jest.fn().mockResolvedValue({
      text: '{"name": "Custom High Trust", "aesthetic": {"primaryColor": "#ff00ff", "backgroundColor": "#000000", "spacingScale": 1.5, "borderRadius": 24}, "layoutType": "expansive"}',
    }),
  } as any;

  it('correctly constructs variants from valid LLM response', async () => {
    const engine = new GenExEngine(mockInferenceEngine);
    const result = await engine.generateVariant(0.9, ['/home', '/dashboard']);
    
    expect(result.layoutType).toBe('expansive');
    expect(result.aesthetic.primaryColor).toBe('#ff00ff');
  });

  it('gracefully falls back to heuristics on LLM error/garbage response', async () => {
    const brokenInferenceEngine = {
      infer: jest.fn().mockRejectedValue(new Error('Device Out of Memory')),
    } as any;

    const engine = new GenExEngine(brokenInferenceEngine);
    const result = await engine.generateVariant(0.15, ['/home']);
    
    // Low trust threshold score triggers Secure Focus layout (compact & focused)
    expect(result.layoutType).toBe('focused');
    expect(result.aesthetic.borderRadius).toBe(4);
  });
});
```

> [!NOTE]
> All dynamic style adaptations rely on standardized CSS custom properties starting with the `--genex-` prefix. This isolates performance impacts and avoids triggering full layout recalculation (reflows) on style change.

> [!IMPORTANT]
> When implementing components within the `GenExDynamicWrapper`, avoid static layout hardcoding (e.g. fixed layout positions or explicit pixel sizes) to ensure elements can adapt fluidly.
