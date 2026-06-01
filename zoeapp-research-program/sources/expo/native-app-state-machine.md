# Native App State Machine (Expo/CNG)

This document maps the lifecycle of an Expo application under the CNG (Config-based Native Generation) and Expo Router orchestration.

## 1. Lifecycle Phases

The application transitions through the following phases:

| Phase | Description |
| :--- | :--- |
| **INITIALIZATION** | Expo config (`app.json`) loaded, plugins initialized. |
| **TRANSFORMATION** | Config plugins run to modify native project files (iOS/Android). |
| **NATIVE_SYNC** | Project structure syncs to match the transformed state. |
| **ROUTING_READY** | Expo Router initializes the navigation graph based on file-system structure. |
| **EXECUTION** | React Native runtime renders the selected component. |

## 2. State Transition Constraints

- **Transformation -> NativeSync**: Atomic commit required.
- **NativeSync -> RoutingReady**: Verified integrity check of navigation graph.

## 3. Typestate Enforcement (Conceptual)

The machine kernel enforces:
`AppMachine<Config, NativeState, NavigationState>`

Transitions consume `self` and produce the subsequent phase marker ensuring illegal re-entry into `TRANSFORMATION` after `ROUTING_READY` has been achieved.
