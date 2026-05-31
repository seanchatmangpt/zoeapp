# Holographic UI Module (`ui-holographic`)

The `ui-holographic` module is a high-fidelity visual package within the **Zoe 2030 Innovation Peak**. It introduces spatial-aware user interface components that respond dynamically to physical device motion. By bridging raw hardware sensor data with responsive UI layouts, this module realizes the vision of a tactile, adaptive, and ambient projection membrane.

---

## 1. Overview & Core Features

In modern mobile computing, flat interfaces create a cognitive disconnect between the user and the digital environment. The `ui-holographic` module remedies this by implementing three core interactive concepts:

```
            +-------------------------------------------+
            |         Physical Device Sensors           |
            |   (Gyroscope + Accelerometer + Compass)   |
            +---------------------+---------------------+
                                  |
                                  | [16ms Polling Interval]
                                  v
            +---------------------+---------------------+
            |        useHolographicSensors Hook         |
            |     - Fusion: SensorType.ROTATION         |
            +---------------------+---------------------+
                                  |
                                  | [Shared via Context]
                                  v
            +---------------------+---------------------+
            |        HolographicContainer Provider      |
            |      - Multi-Component Coordination       |
            +---------------------+---------------------+
                                  |
                                  +-------------------+
                                  |                   |
                                  v                   v
            +---------------------+-----+       +-----+---------------------+
            |    3D Depth Tilt / Parallax       |   Glassmorphism v2 Glare  |
            |    - Translate X / Y              |   - Specular Skew (20°)   |
            |    - Subtle Rotate X / Y (0.1 rad)|   - Dynamic Opacity Shift |
            +-----------------------------------+---------------------------+
```

### 1.1 Gyroscope-based 3D Depth Tilt
Traditional tilt effects rely on raw accelerometer values, which suffer from high-frequency noise and environmental vibrations. This module utilizes a fused **Rotation Sensor** (`SensorType.ROTATION`) to capture stable physical values for **roll** (rotation around the longitudinal axis) and **pitch** (rotation around the lateral axis). 
- **Parallax Offset**: Content elements are translated horizontally (`translateX`) and vertically (`translateY`) in the opposite direction of the tilt, creating a layered depth simulation.
- **Perspective Distortion**: A subtle 3D rotational tilt (`rotateX` and `rotateY`) is applied at a `0.1` scaling factor to mimic real-world physical perspective distortion as the viewing angle changes.

### 1.2 Glassmorphism v2 Cards
Standard glassmorphism uses frosted glass overlays, borders, and static background blurs. Glassmorphism v2 advances this with a **dynamic glare layer**:
- **Specular Highlight**: A white gradient sheen (`rgba(255,255,255,0.3)`) is rendered inside the card, skewed at `20deg`.
- **Directional Sheen Movement**: The glare translation shifts laterally (`glareTranslateX`) based on the device's roll, simulating light source reflection.
- **Intensity Modulation**: The opacity of the glare is dynamically calculated as a sum of the absolute roll and pitch deviations, brightening the highlights as the tilt angle steepens.

### 1.3 High-Performance Sensor Fusion
To guarantee jitter-free rendering at 60Hz and 120Hz display refresh rates, the module relies on `react-native-reanimated` worklets. Raw hardware values are processed and interpolated directly on the UI/Render thread, bypassing the React Native asynchronous bridge. This ensures zero-latency feedback loop between wrist movement and screen redraws.

---

## 2. Architectural & Philosophical Mapping

The `ui-holographic` module strictly implements the **Receipted Chatman Equation** to ensure safety, state determinism, and deterministic visual output:

$$\mathcal{R} \vdash \mathcal{A} = \mu(\mathcal{O}^*)$$

Where:

*   **$\mathcal{O}^*$ (Lawful Closure Ontology)**: Represents the admissible state space. In this module, $\mathcal{O}^*$ is defined by the physical limits of device rotation in Euler space ($\text{Roll} \in [-\pi/2, \pi/2]$ and $\text{Pitch} \in [-\pi/2, \pi/2]$), coupled with the default properties of the system context.
*   **$\mu$ (Transformation/Interpolation Function)**: The deterministic transformation logic encapsulated inside the Reanimated styles. It maps raw radian inputs to clamped translation and rotation outputs. The safety bounds are strictly enforced using clamping functions:
    $$\mu_{\text{trans}}(x) = \text{interpolate}(x, [-\frac{\pi}{4}, \frac{\pi}{4}], [\text{Intensity}, -\text{Intensity}], \text{Clamp})$$
*   **$\mathcal{A}$ (Emitted Consequence)**: The resulting dynamic layout styles applied to the canvas—consisting of the parallax translation matrix and the glare sheen opacity matrix.
*   **$\mathcal{R}$ (Receipt Lineage)**: The cryptographic and architectural proof that the rendering occurred within safety thresholds:
    1.  **Polling Safety**: 16ms interval limits prevents CPU degradation.
    2.  **State Scoping**: The provider context is bounded; if `isEnabled` is false, it returns `null`, short-circuiting calculations to save CPU cycles.
    3.  **Boundary Safety**: Output translations are clamped using `Extrapolation.CLAMP` to prevent visual elements from escaping screen margins.

---

## 3. Source Code Structure

The module is self-contained and located at `/src/framework/2030/ui-holographic/`:

```
ui-holographic/
├── index.ts                 # Module entry point, public exports
├── types.ts                 # Strict TypeScript contracts and props definitions
├── useHolographicSensors.ts # Custom hook encapsulating Expo/Reanimated sensors
├── HolographicContainer.tsx # Context provider managing sensor subscriptions
├── HolographicGlassCard.tsx # Animated Glassmorphism v2 Card component
└── __tests__/
    └── Holographic.test.tsx # Unit tests validating math, context, and fallback states
```

### File Breakdown:
1.  **`index.ts`**: The export gateway exposing `HolographicContainer`, `HolographicGlassCard`, `useHolographicSensors`, and associated TypeScript interfaces.
2.  **`types.ts`**: Houses type definitions, including `HolographicSensorData`, `HolographicEffectProps`, container properties, and card attributes.
3.  **`useHolographicSensors.ts`**: Initializes the Reanimated rotation vector sensor. It is optimized to request data updates at a steady `16ms` rate.
4.  **`HolographicContainer.tsx`**: Creates a unified React context provider. By placing this at the feature root, multiple child cards share a single sensor listener subscription, preventing native memory leaks.
5.  **`HolographicGlassCard.tsx`**: Renders a standard `GlassCard` wrapper, injecting a absolute-positioned glare layer and a nested animated wrapper layer to perform parallax translation.
6.  **`__tests__/Holographic.test.tsx`**: Contains testing suites to assert math validity, inverted logic, and deactivated states.

---

## 4. Public Interfaces & API Contracts

Below are the typescript declarations representing the public API boundaries:

### 4.1 Interface Definitions

```typescript
import { ViewProps } from 'react-native';
import { GlassCardProps } from '../../ui/glassmorphism/types';

export interface HolographicSensorData {
  roll: number;  // Rotation around X axis (radians)
  pitch: number; // Rotation around Y axis (radians)
  yaw: number;   // Rotation around Z axis (radians)
}

export interface HolographicEffectProps {
  /**
   * Magnitude of the parallax translation.
   * Higher values mean more horizontal and vertical drift.
   * @default 15
   */
  parallaxIntensity?: number;

  /**
   * Maximum opacity of the dynamic light sheen (glare).
   * @default 0.6
   */
  glareIntensity?: number;

  /**
   * Inverts the directional movement of the parallax effect.
   * @default false
   */
  inverted?: boolean;
}

export interface HolographicContainerProps extends ViewProps {
  /**
   * Toggle sensor listeners and animation triggers on or off.
   * If false, child cards fall back to static layouts instantly.
   * @default true
   */
  isEnabled?: boolean;
}

export interface HolographicGlassCardProps extends GlassCardProps, HolographicEffectProps {}
```

### 4.2 Component & Hook Contracts

```typescript
/**
 * Root context provider. Wraps your view tree.
 */
export const HolographicContainer: React.FC<HolographicContainerProps & { children: React.ReactNode }>;

/**
 * Accesses parent container sensor data.
 */
export const useHolographicContext: () => ReturnType<typeof useHolographicSensors> | null;

/**
 * Visual element combining Glassmorphism with parallax & glare.
 */
export const HolographicGlassCard: React.FC<HolographicGlassCardProps>;
```

---

## 5. Usage Guide

To use the holographic effects, wrap the relevant section of your application with a `HolographicContainer` and insert one or more `HolographicGlassCard` components.

Below is a complete, copy-pasteable TypeScript example:

```tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, Switch, SafeAreaView } from 'react-native';
import { 
  HolographicContainer, 
  HolographicGlassCard 
} from '@/src/framework/2030/ui-holographic';

export default function HolographicDemoScreen() {
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ambient Membrane HUD</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Holographics</Text>
          <Switch 
            value={effectsEnabled} 
            onValueChange={setEffectsEnabled} 
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={effectsEnabled ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Holographic context encapsulates the sensor lifecycle */}
      <HolographicContainer isEnabled={effectsEnabled} style={styles.container}>
        
        {/* Card 1: Standard Settings */}
        <HolographicGlassCard 
          intensity="medium" 
          tint="dark"
          style={styles.card}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Device Orientation HUD</Text>
            <Text style={styles.cardText}>
              Tilt your device to see the content glide and light reflect off the surface.
            </Text>
          </View>
        </HolographicGlassCard>

        {/* Card 2: High Parallax Sensitivity & Inverted Movement */}
        <HolographicGlassCard 
          intensity="high" 
          tint="light"
          parallaxIntensity={30}
          glareIntensity={0.8}
          inverted={true}
          style={styles.card}
        >
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, styles.lightText]}>Inverted Spatial Card</Text>
            <Text style={[styles.cardText, styles.lightText]}>
              This card uses inverted physics and high-intensity glare for an exaggerated 3D depth field.
            </Text>
          </View>
        </HolographicGlassCard>

      </HolographicContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#202024',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    color: '#a0a0ab',
    fontSize: 14,
  },
  container: {
    padding: 20,
    justifyContent: 'center',
    gap: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
  },
  cardContent: {
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardText: {
    fontSize: 14,
    color: '#d4d4d8',
    lineHeight: 20,
  },
  lightText: {
    color: '#18181b',
  },
});
```

---

## 6. Test Suite & Verification

The integrity, performance, and math bounds of the `ui-holographic` module are strictly verified by a Jest-based test runner.

### 6.1 Test Implementation Details (`Holographic.test.tsx`)
The test suite isolates component and hook lifecycles:
*   **Sensor Polling**: Verifies that the `useHolographicSensors` hook properly registers the Reanimated sensor using `SensorType.ROTATION` at a `16ms` update boundary.
*   **Dynamic Interpolation Math**: Simulates mock device rotation (e.g., positive `roll` of `0.2` and negative `pitch` of `-0.3`) and asserts:
    *   The horizontal layout shift is opposite to the tilt direction (move left for positive roll).
    *   The vertical layout shift matches orientation geometry (move down for negative pitch).
    *   Subtle 3D rotation degrees strictly correspond to `roll * 0.1` and `pitch * 0.1` respectively.
*   **Inversion Bounds**: Confirms that when the `inverted` prop is `true`, translation vectors scale by `-1`, correctly modifying the directional movement.
*   **Zero-Overhead Fallbacks**: Tests that when `HolographicContainer` has `isEnabled={false}` (or if the card is rendered outside of a container), the context falls back to `null` and components bypass all Reanimated updates (returning empty styles `{}`), preventing frame drops.

### 6.2 Running Verification

Execute the following terminal command to run the holographic test suite:

```bash
npx jest src/framework/2030/ui-holographic/__tests__/Holographic.test.tsx
```

Expected output:

```text
PASS src/framework/2030/ui-holographic/__tests__/Holographic.test.tsx
  Holographic Module
    useHolographicSensors
      ✓ calls useAnimatedSensor with ROTATION and interval (2 ms)
    HolographicContainer
      ✓ provides sensor data to descendants when enabled (13 ms)
      ✓ provides null to descendants when disabled (2 ms)
    HolographicGlassCard
      ✓ applies parallax translations and tilts based on sensor data (6 ms)
      ✓ inverts the translation when inverted prop is true (2 ms)
      ✓ renders with empty style when no sensor context is provided (1 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        1.052 s
```
