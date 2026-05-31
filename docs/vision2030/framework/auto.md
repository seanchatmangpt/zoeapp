# Zoe Framework: Autonomous Module (`auto`)

The `auto` module in the Zoe Framework introduces autonomous user experience (`AutoUX`), self-healing developer workflows (`AutoDX`), dynamic accessibility/translations (`AutoI18n`), local-first state synchronization (`AutoState`), and multi-platform spatial rendering (`AutoXR`).

This module dynamically adapts applications to device conditions, network constraints, local consistency requirements, accessibility guidelines, and spatial platform requirements (VisionOS vs Android/iOS/Web).

---

## 1. Title & Overview

The `auto` module provides a framework-level layer that translates ambient metrics and metadata into self-configuring, resilient runtime interfaces. It operates across five key subdomains:

1. **AutoUX (`ux/adaptive`)**: Dynamically scales touch targets (`hitSlop`), animation speeds, and haptic feedback patterns by listening to behavioral biometrics (Behavioral Auth trust scores) and performance indicators (JS and UI FPS).
2. **AutoDX (`dx/scaffolding`)**: Resolves RDF semantic types to corresponding React components. If a component is not registered, it displays a dev-mode self-healing component (`AutoFixer`) to scaffold code templates locally.
3. **AutoI18n & Accessibility (`i18n/a11y`)**: Automates deep children translation, manages voice-to-intent mappings for voice controllers, and dynamically traps accessibility focus.
4. **AutoState (`state/orchestrator`)**: Combines CRDT map resolution (LWWMap) for consistency, MMKV storage for fast local persistence, and predictive prefetching using the Vector Knowledge Graph (VKG).
5. **AutoXR (`xr/spatial`)**: Renders flat components into a 3D cylindrical carousel in XR environments (e.g., VisionOS) or falls back to responsive 2D layouts on standard platforms.

---

## 2. Architectural & Philosophical Mapping

### Truex Core Architecture

The `auto` module integrates into the Truex core pillars:

* **Membrane (Security & Boundaries)**: Leverages `BehavioralAuth` trust scores to adjust component boundaries. If a user’s trust score drops, the membrane decreases the hit-slop values, demanding more motor-control precision to verify authenticity and prevent spoofed touches.
* **Intake (Telemetry Ingestion)**: Gathers telemetry such as FPS (`useAppVitals`) and CRDT state merges, feeding them to the adaptive controllers.
* **Projection (Representation & Layout)**: Projects abstract structures (like RDF schema URLs) into functional UIs (`useAutoScaffold`), and projects lists of children into 3D cylindrical space or 2D responsive grids.
* **Supervision (Resilience & Self-Healing)**: Supervises developers at runtime by catching missing dependencies/views and rendering the `AutoFixer` scaffold action.

### The Chatman Equation Mapping

The Chatman Equation defines runtime state adaptations as:

$$R \vdash A = \mu(O^*)$$

Where:
* $R$ represents the environment, constraints, and inputs (such as performance FPS, behavioral trustScore, target platform, RDF schemas).
* $A$ represents the resulting user experience adaptation, layout projection, rendering state, or sync cache.
* $\mu(O^*)$ represents the mapping function that optimizes the observables $O^*$ (like telemetry data, CRDT events) into adaptive parameters.

#### Subdomain Formula Mappings

| Subdomain | Inputs $O^*$ | Mapping Function $\mu(O^*)$ | Adaptation $A$ |
| :--- | :--- | :--- | :--- |
| **AutoUX** | `trustScore` $\in [0,1]$<br>`avgFps` $\in [0,60]$ | $\text{trustModifier} = 0.5 + (0.5 \times \text{trustScore})$<br>$\text{fpsModifier} = \begin{cases} 2.5 & \text{if } \text{avgFps} < 30 \\ 1.8 & \text{if } \text{avgFps} < 45 \\ 1.0 & \text{otherwise} \end{cases}$<br>$\text{hitSlop} = \text{round}(\text{baseHitSlop} \times \text{trustModifier} \times \text{fpsModifier})$ | Dynamic touch targets (`hitSlop`), custom haptic feedback patterns, and animation duration scaling. |
| **AutoDX** | RDF Semantic Type URI | Resolves component from `SemanticComponentRegistry`. If missing, returns `AutoFixer`. | Self-healing developer interface mapping RDF schemas to code templates. |
| **AutoI18n** | React nodes, `voiceIntent` | Recursively translates strings via `useTranslation` and prepends intent prefixes to voice overlays. | Fully translated and voice-control-accessible rendering tree. |
| **AutoState** | MMKV Cache, LWWMap state, Proximity URI | Hydrates LWWMap CRDT state from MMKV on start; pre-fetches surrounding schemas via VKG. | Multi-peer consistent, persisted, and predictively prefetched state. |
| **AutoXR** | children array, `Platform.OS` | If VisionOS/XR, projects coordinates onto a 3D cylinder cylinder using spatial layout vectors. Else, wraps with responsive 2D flex views. | Automatically adapting spatial layout projections. |

---

## 3. Source Code Structure

The directory is structured as follows:

```
src/framework/auto/
├── index.ts                           # Module entrypoint (exports submodules)
├── dx/
│   └── scaffolding/
│       ├── index.ts                   # Scaffolding index
│       ├── registry.ts                # Semantic RDF Component Registry
│       ├── useAutoScaffold.tsx        # Guarded component hook with Auto-Fixer fallback
│       └── AutoFixer.tsx              # CLI scaffold triggering UI (amber box)
├── i18n/
│   └── a11y/
│       ├── index.ts                   # Accessibility/translation index
│       ├── AutoInclusiveWrapper.tsx   # Higher-Order Component (withAutoInclusive)
│       └── __tests__/
│           └── AutoInclusiveWrapper.test.tsx
├── state/
│   └── orchestrator/
│       ├── index.ts                   # State orchestrator index
│       ├── AutoSyncState.ts           # CRDT + MMKV + Prefetching hook (useAutoSyncState)
│       └── __tests__/
│           └── AutoSyncState.test.ts
├── ux/
│   └── adaptive/
│       ├── index.ts                   # Adaptive UX index
│       ├── AdaptiveInteractionWrapper.tsx # Metrics-aware Context Provider
│       ├── AdaptivePressable.tsx      # Target & haptic adaptive button
│       ├── AdaptiveAnimation.tsx      # Adaptive reanimated worklet helpers
│       └── __tests__/
│           └── AdaptiveUX.test.tsx
└── xr/
    └── spatial/
        ├── index.ts                   # Spatial XR index
        └── AutoSpatialGrid.tsx        # 3D Cylinder / 2D Grid platform layout component
```

### Source File Links

* [index.ts](file:///Users/sac/zoeapp/src/framework/auto/index.ts): Root entrypoint that re-exports the APIs from `ux/adaptive`, `dx/scaffolding`, `i18n/a11y`, and `state/orchestrator`.
* [dx/scaffolding/registry.ts](file:///Users/sac/zoeapp/src/framework/auto/dx/scaffolding/registry.ts): In-memory mapper for semantic RDF types to React components.
* [dx/scaffolding/useAutoScaffold.tsx](file:///Users/sac/zoeapp/src/framework/auto/dx/scaffolding/useAutoScaffold.tsx): Core hook for resolving RDF types or yielding fallback triggers.
* [dx/scaffolding/AutoFixer.tsx](file:///Users/sac/zoeapp/src/framework/auto/dx/scaffolding/AutoFixer.tsx): Interactive React Native UI block indicating missing components. Shows button to execute template generators.
* [i18n/a11y/AutoInclusiveWrapper.tsx](file:///Users/sac/zoeapp/src/framework/auto/i18n/a11y/AutoInclusiveWrapper.tsx): Higher-Order Component injecting voice-to-intent commands, focus traps, and automated string translations.
* [state/orchestrator/AutoSyncState.ts](file:///Users/sac/zoeapp/src/framework/auto/state/orchestrator/AutoSyncState.ts): Connects CRDT map (LWWMap), MMKV storage persistence, and Vector Knowledge Graph prefetching.
* [ux/adaptive/AdaptiveInteractionWrapper.tsx](file:///Users/sac/zoeapp/src/framework/auto/ux/adaptive/AdaptiveInteractionWrapper.tsx): React Context Provider computing FPS and trust metrics to scale parameters.
* [ux/adaptive/AdaptivePressable.tsx](file:///Users/sac/zoeapp/src/framework/auto/ux/adaptive/AdaptivePressable.tsx): Pressable wrapper responding to hit-slop and haptic parameters.
* [ux/adaptive/AdaptiveAnimation.tsx](file:///Users/sac/zoeapp/src/framework/auto/ux/adaptive/AdaptiveAnimation.tsx): Utilities providing scaled Reanimated `withSpring` and `withTiming` hooks.
* [xr/spatial/AutoSpatialGrid.tsx](file:///Users/sac/zoeapp/src/framework/auto/xr/spatial/AutoSpatialGrid.tsx): Projects layout elements onto spatial planes for VisionOS or standard 2D grids.

---

## 4. API Contracts

### `ux/adaptive` (AutoUX)

#### `AdaptiveInteractionConfig` (Interface)
Defines parameters calculated dynamically for child components.
* `hitSlop`: `number` — Calculated target padding in pixels.
* `hapticProfile`: `HapticFeedbackPattern` — Pattern to trigger upon press events.
* `animationSpeedScale`: `number` — Speed modifier (where `1.0` is standard, `> 1.0` is slower).
* `trustScore`: `number` — Ingested user authentication trust rating (`0.0` to `1.0`).
* `fps`: `number` — Ingested device rendering frames per second.

#### `AdaptiveInteractionWrapper` (Component)
Tracks `useBehavioralAuth` and `useAppVitals` to provide `AdaptiveInteractionConfig`.
* Props:
  * `children`: `React.ReactNode` — React child elements.
  * `baseHitSlop?`: `number` (Default: `10`) — Base hit slop in pixels.

#### `AdaptivePressable` (Component)
Replaces React Native `Pressable` to apply dynamic padding and haptics.
* Props:
  * Extends standard `PressableProps`.
  * `enableHaptics?`: `boolean` (Default: `true`) — Toggle haptic trigger on press.

#### `useAdaptiveAnimation` (Hook)
Provides helper worklets that automatically adjust duration according to `animationSpeedScale`.
* Returns:
  * `adaptiveSpring`: `(value: number, config?: any) => AnimationObject`
  * `adaptiveTiming`: `(value: number, config?: any) => AnimationObject`
  * `animationSpeedScale`: `number`

---

### `dx/scaffolding` (AutoDX)

#### `semanticComponentRegistry` (Class Instance)
Registers and resolves React components based on RDF URIs.
* Methods:
  * `register(rdfType: string, component: ComponentType<any>): void`
  * `resolve(rdfType: string): ComponentType<any> | undefined`
  * `clear(): void`

#### `useAutoScaffold` (Hook)
Attempts to fetch components. Returns a fallback component containing `AutoFixer` if unregistered.
* Parameters:
  * `rdfType`: `string` — The RDF URL schema (e.g., `'https://schema.org/Person'`).
* Returns:
  * `component`: `ComponentType<any>` — Resolved component or `AutoFixer` fallback wrapper.
  * `isMissing`: `boolean` — Flag indicating whether resolving failed.
  * `type`: `string` — Handled RDF schema type.

---

### `i18n/a11y` (AutoI18n)

#### `AutoInclusiveOptions` (Interface)
Configuration for inclusivity layers.
* `autoTranslate?`: `boolean` (Default: `true`) — Translates children strings.
* `voiceIntent?`: `string` — Injects intentional prefixes into accessibility overlays for voice control.
* `focusTrap?`: `boolean` (Default: `false`) — Restricts screen-reader navigation boundaries.
* `accessibilityLabel?`: `string` — Custom string override.

#### `withAutoInclusive` (HOC)
Wraps components to inject translation, voice intent markers, and focus traps.
* Parameters:
  * `Component`: `ComponentType<P>`
* Returns:
  * `ComponentType<P & WithAutoInclusiveProps>`

---

### `state/orchestrator` (AutoState)

#### `AutoSyncOptions` (Interface)
Configuration settings for autonomous state variables.
* `key`: `number` — Unique identifier used to partition MMKV entries.
* `initialValue`: `V` — Fallback value when both MMKV and CRDT states are empty.
* `peerId`: `string` — Unique peer ID for LWWMap conflicts.
* `uri?`: `string` — Vector schema location used to preload neighboring nodes.
* `depth?`: `number` — Traversal distance for predictive preloading.

#### `useAutoSyncState` (Hook)
* Parameters:
  * `options`: `AutoSyncOptions<V>`
* Returns:
  * `[value, setValue, merge]` as a read-only tuple, where `merge` handles CRDT sync integrations.

---

### `xr/spatial` (AutoXR)

#### `AutoSpatialGridProps` (Interface)
* `children`: `React.ReactNode[]` — Flat array of child items.
* `isSpatial?`: `boolean` — Force spatial layout. Defaults to platform detection (VisionOS/XR).
* `radius?`: `number` (Default: `2`) — 3D cylinder carousel radius in meters.
* `gap?`: `number` (Default: `16`) — Flex element layout padding.
* `columns?`: `number` (Default: `3`) — Number of columns in standard 2D layout.
* `stagger?`: `number` (Default: `50`) — Animation staggered item delay in milliseconds.
* `style?`: `StyleProp<ViewStyle>` — Container style.
* `itemStyle?`: `StyleProp<ViewStyle>` — Child item wrapper style.

#### `AutoSpatialGrid` (Component)
Automatically maps React Native views to 3D cylinder placements on spatial platforms, or renders standard 2D columns on standard devices.

---

## 5. Usage Guide

Here is a complete, production-ready TypeScript component demonstrating how to use the entire `auto` module:

```tsx
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { 
  AdaptiveInteractionWrapper, 
  AdaptivePressable, 
  useAdaptiveAnimation,
  withAutoInclusive,
  useAutoSyncState,
  useAutoScaffold,
  semanticComponentRegistry
} from '@/src/framework/auto';
import { AutoSpatialGrid } from '@/src/framework/auto/xr/spatial';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

// 1. Setup Semantic Registry mapping for AutoDX
const PersonComponent = ({ name, email }: { name: string; email: string }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{name}</Text>
    <Text style={styles.cardSubtitle}>{email}</Text>
  </View>
);
semanticComponentRegistry.register('https://schema.org/Person', PersonComponent);

// 2. Wrap components with AutoInclusive HOC
const InclusiveText = withAutoInclusive(Text);
const InclusiveView = withAutoInclusive(View);

export default function AutonomousScreen() {
  // 3. Dynamic State with AutoState (persists in MMKV + CRDT synchronization)
  const [profileName, setProfileName, mergeState] = useAutoSyncState<string>({
    key: 'user-profile-name',
    initialValue: 'John Doe',
    peerId: 'peer-device-alpha',
    uri: 'zoe://vkg/profiles/user-profile-name',
    depth: 2,
  });

  // 4. Component Resolution with AutoDX
  // This resolves successfully because it is registered above
  const { component: PersonView } = useAutoScaffold('https://schema.org/Person');

  // This will render the AutoFixer (Amber Box) because it is not registered
  const { component: OrganizationView } = useAutoScaffold('https://schema.org/Organization');

  return (
    <AdaptiveInteractionWrapper baseHitSlop={12}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Title utilizing Inclusive HOC (auto-translation & voice intents) */}
        <InclusiveText 
          style={styles.header} 
          voiceIntent="READ_HEADER" 
          accessibilityLabel="Autonomous Feature Dashboard"
        >
          autonomous.dashboard.title
        </InclusiveText>

        {/* Dynamic Sync State Input Example */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AutoState (MMKV & CRDT Sync)</Text>
          <Text>Current Value: {profileName}</Text>
          <AdaptivePressable 
            style={styles.button}
            onPress={() => setProfileName(`Jane Doe ${Math.floor(Math.random() * 100)}`)}
          >
            <Text style={styles.buttonText}>Randomize Sync State</Text>
          </AdaptivePressable>
        </View>

        {/* Adaptive Animation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AutoUX (Adaptive Animations)</Text>
          <AnimatedSquare />
        </View>

        {/* Resolved Component Section (AutoDX) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AutoDX (Semantic Resolution)</Text>
          <PersonView name={profileName} email="jane.doe@truex.io" />
          
          <Text style={styles.sectionSubtitle}>Missing Component Fallback:</Text>
          <OrganizationView name="Truex Core" />
        </View>

        {/* AutoXR (Spatial / 2D Grid adaptation) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AutoXR (Adaptive Spatial Projections)</Text>
          <AutoSpatialGrid columns={2} radius={2.5} gap={10}>
            <View style={styles.gridBox}><Text>Item 1</Text></View>
            <View style={styles.gridBox}><Text>Item 2</Text></View>
            <View style={styles.gridBox}><Text>Item 3</Text></View>
            <View style={styles.gridBox}><Text>Item 4</Text></View>
          </AutoSpatialGrid>
        </View>

      </ScrollView>
    </AdaptiveInteractionWrapper>
  );
}

// Sub-component showcasing useAdaptiveAnimation
function AnimatedSquare() {
  const { adaptiveTiming } = useAdaptiveAnimation();
  const width = useSharedValue(100);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: 60,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    marginVertical: 10,
  }));

  const handlePress = () => {
    // Duration is scaled automatically behind the scenes (e.g. slowed down during performance lag)
    width.value = adaptiveTiming(width.value === 100 ? 250 : 100, { duration: 400 });
  };

  return (
    <AdaptivePressable onPress={handlePress} style={styles.pressableBlock}>
      <Animated.View style={animatedStyle} />
      <Text style={styles.pressableBlockText}>Trigger Adaptive Animation</Text>
    </AdaptivePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  cardSubtitle: {
    color: '#1D4ED8',
  },
  button: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pressableBlock: {
    alignItems: 'center',
  },
  pressableBlockText: {
    fontSize: 12,
    color: '#4B5563',
  },
  gridBox: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

## 6. Testing

### Tests Overview

The module includes comprehensive unit tests verifying that all adaptation parameters compute correctly and that hydration/fallback strategies recover gracefully:

1. **AutoUX Unit Tests** (`AdaptiveUX.test.tsx`):
   * Validates target sizes (`hitSlop`) and animations scale proportionally to degraded FPS values and lower behavioral authentication confidence thresholds.
   * Assures that haptics are routed with correct vibration profiles based on the interaction conditions.
2. **AutoI18n Unit Tests** (`AutoInclusiveWrapper.test.tsx`):
   * Verifies automatic nested children text translation.
   * Validates voice-to-intent annotations are combined with explicit accessibility descriptors.
   * Tests dynamic modal focus traps.
3. **AutoState Unit Tests** (`AutoSyncState.test.ts`):
   * Tests parsing error handling of local caches.
   * Confirms initialization using fallback values when cache is empty.
   * Assures state synchronization updates MMKV records and triggers VKG proximity crawls.

### Executing Tests

To run the unit tests specifically for the `auto` module, execute:

```bash
npm test -- src/framework/auto
```
