# Component Model Boundary Mapping

This document maps the WASM Component Model boundary to the Ostar Generative Pipeline ontology, ensuring Chatman Equation (A = μ(O)) compliance.

## 1. WIT/Component Model Boundary
The boundary is defined by the rigid interface serialization enforced by the Component Model's WIT (WebAssembly Interface Type) definitions. All interactions between components must traverse this boundary via WIT-compliant stable ABI.

## 2. Stable Contract Types
The following types are the only permitted data structures across component boundaries, ensuring binary compatibility and mathematical closure:

- **Scalars**: `u8`, `u16`, `u32`, `u64`, `s8`, `s16`, `s32`, `s64`, `float32`, `float64`, `bool`, `char`.
- **Collections**: `string`, `list<T>`.
- **Composite**: `record`, `variant`, `enum`, `flags`.

## 3. Refusal Law
For any Rust code deemed non-component-ready:

- **Violation**: Detection of non-stable types or dynamic runtime behavior (e.g., non-deterministic heap allocation, direct pointer manipulation).
- **Enforcement**: Immediate `HALT` of the `ggen` generation pipeline.
- **Severity**: `CRITICAL`.
- **Action**: Reject code and trigger `TERMINATE_COMPONENT_INSTANCE`.
