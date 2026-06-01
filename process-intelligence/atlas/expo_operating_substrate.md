# Expo Operating Substrate: Process Intelligence Atlas

This document outlines the operational mechanics of the Expo environment within the ZOEAPP research program, treating its core components as formal process-state machines and release laws.

## 1. Expo Router: The Navigation State Machine

Expo Router is treated as a deterministic engine for navigation state transitions. It maps file-system structures to a navigation graph governed by the `ExpoRouterLifecycle` law.

### Process States
- **RoutingDefinition**: The phase where the file-system routes are scanned and the navigation tree is built.
- **ComponentResolution**: The engine identifies the specific React component associated with the matched route.
- **ViewRendering**: The final phase where the native view is committed to the screen.

### Release Laws (`ExpoRouterLifecycle`)
| From State | Input/Event | To State |
| :--- | :--- | :--- |
| RoutingDefinition | RouteMatch | ComponentResolution |
| ComponentResolution | RenderSuccess | ViewRendering |

## 2. CNG (Continuous Native Generation): The Architectural State Machine

CNG manages the transition between abstract configuration and concrete native project structures (iOS/Android).

### Process States
- **ConfigRead**: Loading and validating `app.json` / `app.config.js`.
- **PluginExecution**: Running config plugins to modify the ephemeral native state.
- **NativeSync**: Committing the transformed state to the actual native project files.

### Release Laws (`CNGLifecycle`)
| From State | Input/Event | To State |
| :--- | :--- | :--- |
| ConfigRead | PluginTrigger | PluginExecution |
| PluginExecution | TransformationComplete | NativeSync |

## 3. EAS Build: The Artifact State Machine

EAS Build provides the bridge from source code to verifiable binary artifacts. It is the entry point for the "Release Discipline".

### Process States
- **Idle**: Source code is stable; no build in progress.
- **Building**: Cloud-based transformation of source to binary.
- **Built**: Artifact (IPA/APK/AAB) is generated and stored.

### Release Laws (`ReleaseDiscipline` - EAS)
| From State | Trigger Event | To State |
| :--- | :--- | :--- |
| Idle | StartBuild | Building |
| Building | BuildSuccess | Built |

## 4. Release Discipline: Transitions and Rollouts

The "Release Discipline" governs the lifecycle of binary artifacts as they move through the deployment pipeline towards the user base.

### Staged Rollout Transitions
The transitions are defined by the `ReleaseDiscipline` law, ensuring that no binary artifact is deployed without following the formal state transitions.

- **EAS Build**: Initial creation of the immutable artifact.
- **OTA Updates (`OTAUpdate`)**: Staged rollout of JS-bundle changes to existing binary installs.
  - **Transition**: `Active` -> `TriggerUpdate` -> `Updating` -> `UpdateSuccess` -> `Active`.
- **Version Transition (`VersionTransition`)**: Formal promotion of a new binary version to the app stores.
  - **Transition**: `Active` -> `StartVersionTransition` -> `Transitioning` -> `TransitionSuccess` -> `Active`.

## 5. Verification and Enforcement

All transitions within the Expo Operating Substrate are monitored and verified against the formal laws. Deviation from these state machines is treated as a process-level failure, requiring immediate reconciliation within the ZOEAPP framework.