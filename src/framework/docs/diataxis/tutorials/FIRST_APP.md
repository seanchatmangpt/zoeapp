# Building your first Self-Healing Spatial App

This tutorial walks you through creating a simple spatial application with autonomous recovery using the Zoe Framework 2030 suite.

## Prerequisites
- A React Native environment set up.
- Zoe Framework SDK installed.

## Step 1: Initialize the Zoe 2030 Shell
The `<Zoe2030 />` provider is the entry point for all frontier features. Wrap your root component with it and provide an inference engine.

```tsx
import { Zoe2030 } from '@zoe/framework/2030/core';
import { myLocalLLMEngine } from './ai-config';

export default function App() {
  return (
    <Zoe2030 inferenceEngine={myLocalLLMEngine}>
      <MainScreen />
    </Zoe2030>
  );
}
```

## Step 2: Establish a Resilient Boundary
To enable autonomous self-healing, wrap your interactive components in a `ResilientBoundary`. This sets up the `SelfHealingManager` and a protective membrane.

```tsx
import { ResilientBoundary } from '@zoe/framework/compositions';

const MainScreen = () => (
  <ResilientBoundary 
    config={{ mode: 'strict' }}
    healingConfig={{ autoHeal: true, deadlockTimeoutMs: 3000 }}
  >
    <SpatialExperience />
  </ResilientBoundary>
);
```

## Step 3: Create a Spatial View
Use `SpatialView` to place content in 3D space. On standard screens, this renders as a 2D projection; on XR devices, it provides true volumetric placement.

```tsx
import { SpatialView } from '@zoe/framework/xr/spatial';
import { Text } from 'react-native';

const SpatialExperience = () => (
  <SpatialView 
    transform={{
      position: { x: 0, y: 1.5, z: -2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    }}
    depth={5}
  >
    <Text style={{ color: 'white', fontSize: 24 }}>
      Hello, Spatial World!
    </Text>
  </SpatialView>
);
```

## Step 4: Verify Self-Healing
The `SelfHealingManager` automatically snapshots your state. If a crash or deadlock occurs within the `ResilientBoundary`, it will autonomously roll back to the last known good state.

You can also access the manager manually via context:
```tsx
import { useResilientContext } from '@zoe/framework/compositions';

const StatusInfo = () => {
  const { selfHealing } = useResilientContext();
  const state = selfHealing.getState();
  
  return <Text>System Status: {state.isHealing ? 'Healing...' : 'Optimal'}</Text>;
};
```

## Summary
You've just built a spatial app that is:
1. **Context-Aware**: Powered by `Zoe2030`.
2. **Immersive**: Using `SpatialView`.
3. **Unstoppable**: Protected by `SelfHealingManager`.
