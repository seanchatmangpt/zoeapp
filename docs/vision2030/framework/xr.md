# XR Spatial Module (`xr`)

The `xr` module is a core element of the **Zoe 2030 Innovation Peak** framework. It introduces spatial-aware user interface primitives and transformation states that map gracefully to standard 2D environments while supplying extended reality (XR) platforms with absolute 3D positioning metadata.

---

## 1. Overview & Core Features

As application runtimes expand into spatial environments (such as Apple VisionOS, WebXR, and dedicated headsets), flat UI layouts must adapt to three-dimensional boundaries. The `xr` module provides the abstractions necessary to describe, update, and project three-dimensional layouts within the Zoe Framework.

### Key Capabilities:
- **Unified 3D Coordinate Space:** Establishes representations for positions (`Vector3`), Euler rotations, and scales.
- **Dynamic Spatial State Hooks:** Manages continuous transform updates, coordinate transformations, and tracking configurations using React hooks.
- **Ambient Spatial Context:** Propagates environment scale factor constraints and global transforms down the React tree using React Context.
- **Cross-Platform Holographic Projection:** Implements a fallback translation layer that collapses 3D coordinates into standard React Native 2D transformation matrices (via translations, scales, and rotation angles in radians) while passing absolute 3D metadata directly to high-fidelity target runtimes.

---

## 2. Architectural & Philosophical Mapping

The `xr` module integrates with the core pillars of the **Truex Architecture** and aligns with the mathematical safety proofs defined by the **Receipted Chatman Equation**.

### 2.1 The Truex Architectural Pillars

```
             ┌────────────────────────────────────────────────────────┐
             │                  Truex Pillars in XR                   │
             └───────────────┬────────────────────────┬───────────────┘
                             │                        │
                             ▼                        ▼
                       ┌───────────┐            ┌───────────┐
                       │ Membrane  │            │  Intake   │
                       │ (Context) │            │ (Update)  │
                       └─────┬─────┘            └─────┬─────┘
                             │                        │
                             ▼                        ▼
                       ┌───────────┐            ┌───────────┐
                       │Projection │            │Supervision│
                       │ (Render)  │            │  (Safety) │
                       └───────────┘            └───────────┘
```

1. **Membrane (Context Propagation):**
   The spatial environment is bounded by the [SpatialProvider](file:///Users/sac/zoeapp/src/framework/xr/spatial/SpatialContext.tsx), which maintains the absolute scaling factors and parent world coordinate space transform boundaries. This membrane ensures nested elements inherit spatial properties deterministically.
2. **Intake (State Capture):**
   User inputs, tracking updates, and hardware sensor alignments are ingested through [useSpatialPosition](file:///Users/sac/zoeapp/src/framework/xr/spatial/useSpatialPosition.ts). State setters ingest relative changes, which are processed against the current coordinate frame.
3. **Projection (Style Rendering):**
   The [SpatialView](file:///Users/sac/zoeapp/src/framework/xr/spatial/SpatialView.tsx) represents the rendering projection. It maps the abstract 3D configuration into physical pixels on 2D layouts using CSS transform arrays, while forwarding the un-collapsed 3D payload (`spatialTransform` and `isVolumetric` indicators) to native XR engine drivers.
4. **Supervision (Invariant Guarding):**
   The system guarantees that spatial layout parameters conform to structural invariants. Using TypeScript interfaces, clamped configuration ranges (such as `smoothingFactor`), and unit scale defaults, it prevents coordinate space calculations from executing out-of-bounds.

---

### 2.2 The Receipted Chatman Equation

The spatial module operationalizes the equation:

$$R \vdash A = \mu(O^*)$$

Where:
- **$O^*$ (Lawful Closure Ontology):** The set of all valid, safe spatial transforms defined by the [SpatialTransform](file:///Users/sac/zoeapp/src/framework/xr/spatial/types.ts) specification, combined with tracking configurations (e.g., `enableHaptics`, `smoothingFactor`).
- **$\mu$ (Manufacturing/Transformation Function):** The mathematical transformation that translates abstract coordinate variables into visual parameters. This includes the reactive hooks in `useSpatialPosition` and the 3D-to-2D projection inside `SpatialView`:
  
  $$\mu_{\text{project}}(T) \rightarrow \text{StyleProp<ViewStyle>}$$
  
  Which flattens 3D positions, rotations, and scales into readable React Native translation styles:
  
  $$\begin{aligned}
  \text{translateX} &= T.\text{position}.x \\
  \text{translateY} &= T.\text{position}.y \\
  \text{scale} &= T.\text{scale}.x \\
  \text{rotateX} &= T.\text{rotation}.x\,\text{rad} \\
  \text{rotateY} &= T.\text{rotation}.y\,\text{rad} \\
  \text{rotateZ} &= T.\text{rotation}.z\,\text{rad}
  \end{aligned}$$
  
- **$A$ (Emitted Consequence):** The resulting UI layout output, spatial z-index alignments, and native XR runtime attributes (`isVolumetric={isVolumetric}`).
- **$R$ (Receipt Lineage):** The cryptographic and verification pipeline. In this module, $R$ is verified through strict execution of Jest tests that validate coordinate bounds, mapping functions, and fallback states.

---

## 3. Source Code Structure

The module is housed inside the [xr directory](file:///Users/sac/zoeapp/src/framework/xr) and structured as follows:

```
src/framework/xr/
└── spatial/
    ├── types.ts                 # Type contracts and layout parameters
    ├── SpatialContext.tsx       # React Context provider & hook for environment state
    ├── SpatialView.tsx          # Component translating 3D coordinates to 2D styles & XR metadata
    ├── useSpatialPosition.ts    # React Hook managing position, rotation, scale mutations
    ├── index.ts                 # Export entrypoint for the spatial package
    └── __tests__/               # Testing suites
        ├── SpatialView.test.tsx # Tests style mappings, depth, and XR properties
        └── useSpatialPosition.test.ts # Tests state initialization, updates, and resets
```

### File Responsibilities:
- **[types.ts](file:///Users/sac/zoeapp/src/framework/xr/spatial/types.ts):** Defines types for positions, rotations, scale matrices, and tracking settings.
- **[SpatialContext.tsx](file:///Users/sac/zoeapp/src/framework/xr/spatial/SpatialContext.tsx):** Implements `SpatialProvider` and `useSpatialContext()`, maintaining global world-space transforms and meter-to-pixel unit scale factors.
- **[SpatialView.tsx](file:///Users/sac/zoeapp/src/framework/xr/spatial/SpatialView.tsx):** Implements `SpatialView` containing fallback projection rules for standard React Native views.
- **[useSpatialPosition.ts](file:///Users/sac/zoeapp/src/framework/xr/spatial/useSpatialPosition.ts):** Exposes `useSpatialPosition()` hook, offering isolated state management for single entity transformations.
- **[index.ts](file:///Users/sac/zoeapp/src/framework/xr/spatial/index.ts):** Re-exports all core interfaces, hooks, and components.
- **[SpatialView.test.tsx](file:///Users/sac/zoeapp/src/framework/xr/spatial/__tests__/SpatialView.test.tsx):** Asserts rendering children, 2D fallback matrix styles, depth-to-zIndex mappings, and XR raw prop mapping.
- **[useSpatialPosition.test.ts](file:///Users/sac/zoeapp/src/framework/xr/spatial/__tests__/useSpatialPosition.test.ts):** Asserts hook initialization defaults, partial mutations, updates, and resets.

---

## 4. API Contracts

### 4.1 Type Definitions

#### `Vector3`
Represents a coordinate point or direction vector in 3D space.
```typescript
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

#### `Euler`
Represents rotational state around three orthogonal axes using Euler angles (in radians).
```typescript
export interface Euler {
  x: number;
  y: number;
  z: number;
  order?: 'XYZ' | 'YZX' | 'ZXY' | 'XZY' | 'YXZ' | 'ZYX';
}
```

#### `SpatialTransform`
Combines position, rotation, and scale vectors into a unified coordinate frame transform.
```typescript
export interface SpatialTransform {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}
```

#### `SpatialTrackingConfig`
Specifies parameters for spatial tracking and coordination behavior.
```typescript
export interface SpatialTrackingConfig {
  /** If true, triggers physical haptic feedback on hand or cursor alignment */
  enableHaptics?: boolean;
  /** Smoothing factor for tracking coordinates, ranging from 0 to 1 */
  smoothingFactor?: number;
  /** The coordinate frame reference */
  coordinateSpace?: 'world' | 'local' | 'camera';
}
```

---

### 4.2 Context API

#### `SpatialContextValue`
Structure of the context value supplied to descendants.
```typescript
export interface SpatialContextValue {
  /** The current world-space transform of the container boundaries */
  worldTransform: SpatialTransform;
  /** The scale multiplier applied to convert 3D units to meters */
  unitScale: number;
}
```

#### `SpatialProvider`
React Context Provider mapping a `SpatialContextValue` to its children.
```typescript
export const SpatialProvider: React.FC<{
  value?: Partial<SpatialContextValue>;
  children: React.ReactNode;
}>;
```

#### `useSpatialContext()`
React Hook that grants access to the active environment transform context.
```typescript
export const useSpatialContext: () => SpatialContextValue;
```

---

### 4.3 Custom Hook

#### `useSpatialPosition`
Manages three-dimensional transforms dynamically.

```typescript
export function useSpatialPosition(
  initialTransform?: Partial<SpatialTransform>,
  config?: SpatialTrackingConfig
): {
  transform: SpatialTransform;
  setPosition: (position: Partial<Vector3>) => void;
  setRotation: (rotation: Partial<Euler>) => void;
  setScale: (scale: Partial<Vector3>) => void;
  resetTransform: () => void;
  config: SpatialTrackingConfig;
};
```

**Parameters:**
- `initialTransform` *(Optional)*: Partial values to initialize the transform matrix. Default is:
  - `position`: `{ x: 0, y: 0, z: 0 }`
  - `rotation`: `{ x: 0, y: 0, z: 0 }`
  - `scale`: `{ x: 1, y: 1, z: 1 }`
- `config` *(Optional)*: Configuration of type `SpatialTrackingConfig`.

---

### 4.4 Components

#### `SpatialView`
Primitive component representing a positioned 3D volumetric element.

```typescript
export interface SpatialViewProps extends ViewProps {
  /** The 3D transform applied to this view container */
  transform?: SpatialTransform;
  /** If true, tells the XR runtime to treat this view as a volumetric container */
  isVolumetric?: boolean;
  /** Layering priority equivalent to visual depth coordinate */
  depth?: number;
}

export const SpatialView: React.FC<SpatialViewProps>;
```

---

## 5. Usage Guide

The following example shows how to establish a spatial scope with `SpatialProvider`, track dynamic position alterations using `useSpatialPosition`, and display the holographic layout with `SpatialView` containing React Native interactive elements.

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  SpatialProvider,
  SpatialView,
  useSpatialPosition,
} from './spatial';

function InteractiveSpatialPanel() {
  // 1. Instantiate the spatial position manager hook
  const { transform, setPosition, setRotation, resetTransform } = useSpatialPosition(
    {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    {
      enableHaptics: true,
      smoothingFactor: 0.15,
      coordinateSpace: 'local',
    }
  );

  // 2. Event handlers modifying spatial state
  const handleShiftLeft = () => {
    setPosition({ x: transform.position.x - 20 });
  };

  const handleShiftRight = () => {
    setPosition({ x: transform.position.x + 20 });
  };

  const handleTiltY = () => {
    setRotation({ y: transform.rotation.y + 0.1 });
  };

  return (
    <View style={styles.container}>
      {/* 3. Projects spatial coordinates to the view hierarchy */}
      <SpatialView
        transform={transform}
        isVolumetric={true}
        depth={3}
        style={styles.spatialCard}
      >
        <Text style={styles.title}>Holographic Core</Text>
        <Text style={styles.stats}>
          X: {transform.position.x.toFixed(1)} | Y: {transform.rotation.y.toFixed(2)} rad
        </Text>
      </SpatialView>

      {/* 4. Controls to manipulate the 3D values */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleShiftLeft}>
          <Text style={styles.btnText}>Shift X-</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleTiltY}>
          <Text style={styles.btnText}>Rotate Y</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleShiftRight}>
          <Text style={styles.btnText}>Shift X+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetTransform}>
        <Text style={styles.btnText}>Reset Transform</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const globalContextValue = {
    worldTransform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    unitScale: 1.0, // 1 unit = 1 meter equivalence mapping
  };

  return (
    <SpatialProvider value={globalContextValue}>
      <InteractiveSpatialPanel />
    </SpatialProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0f1d',
  },
  spatialCard: {
    width: 280,
    height: 160,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00f0ff',
    marginBottom: 10,
  },
  stats: {
    fontSize: 14,
    color: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 12,
  },
  button: {
    backgroundColor: '#1f2438',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00f0ff',
  },
  resetButton: {
    backgroundColor: '#3b1824',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff0055',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

## 6. Testing

The module maintains full test coverage verifying coordinate logic, context boundaries, style mapping, and state transitions.

### 6.1 Test Suites

1. **`SpatialView.test.tsx`**
   - Asserts children render inside the view structure.
   - Validates translation of position elements (`translateX`, `translateY`), scales (`scale`), and rotation radians (`rotateX`, `rotateY`, `rotateZ`) to flat 2D style arrays.
   - Confirms that depth parameters are properly mapped as `zIndex` styles.
   - Checks that custom XR parameters (`isVolumetric`, `spatialTransform`) are passed safely to the root React Native node.

2. **`useSpatialPosition.test.ts`**
   - Validates that the hooks start with the designated transform defaults.
   - Verifies the state behavior after partial updates to positions, rotations, or scale elements.
   - Confirms that `resetTransform` correctly restores the original initial variables.

### 6.2 Executing the Tests

Run the following test command in the project root:

```bash
npm test src/framework/xr
```
