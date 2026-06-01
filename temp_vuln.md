# Loss Policy Blueprint v30.1.1: Structural Projection Laws in wasm4pm-compat

## Overview
This blueprint outlines the implementation of structural projection laws within the `wasm4pm-compat` system. It defines how we project memory models across WebAssembly boundaries while strictly enforcing loss policies.

## `Project` Trait
The core of structural projection is the `Project` trait. It ensures that arbitrary memory layouts can be safely lifted or lowered into the compatible WASM environment.

```rust
pub trait Project {
    type Source;
    type Target;
    
    fn project(source: &Self::Source, policy: &LossPolicy) -> Result<Self::Target, XesRefusal>;
}
```

## `LossPolicy`
The `LossPolicy` defines the acceptable tolerance for structural data loss during projection. If fields are omitted, truncated, or precision is lost during the memory layout transformation, the policy determines the subsequent action.

```rust
pub enum LossPolicy {
    /// Strictly forbid any loss of data. Any structural mismatch results in a Refusal.
    Strict,
    /// Allow precision loss or omitted fields, provided they are not marked critical. Emit a LossReport.
    Lenient(LossTolerance),
}
```

## Emission of `LossReport` and `Refusal`
When projection violates the `LossPolicy`, the system emits either a `LossReport` (for tracked, acceptable loss under lenient policies) or an `XesRefusal` (halting execution).

```rust
pub enum XesRefusal {
    LiftingLoss {
        reason: String,
        bytes_lost: usize,
    },
    LoweringLoss {
        reason: String,
        bytes_lost: usize,
    },
}

pub struct LossReport {
    pub location: String,
    pub description: String,
    pub bytes_affected: usize,
}
```