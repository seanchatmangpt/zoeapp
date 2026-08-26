# GATE ASSIGNMENT MODEL

## Overview
The Gate Assignment Model defines the semantic relationships between structural components of the system (Walls and Gates) and the accountability of the entities (Builders) performing the work. This model ensures that every unit of work is traceable, audited, and admitted through a formal boundary.

## Core Entities

### 1. bos:Gate
The **Gate** is the primary admissibility boundary. No work is considered "live" until it has been admitted through a gate.
- **Fish Gate**: Catching the right people by truth.
- **Inspection Gate**: Final audit and census.
- **Sheep Gate**: Sacrificial and service-oriented work.

### 2. bos:WallSection
A **WallSection** represents a discrete segment of the containment boundary. Every `WallSection` MUST be assigned to a `Gate` for logical grouping and admissibility control.

### 3. bos:Builder
The **Builder** is the accountable entity (agent, process, or human) responsible for the integrity of a `WallSection`. Builders are identified in the `bos:MusterLedger`.

## Semantic Relationships

### Gate Assignment
A `WallSection` is linked to a `Gate` via the `bos:gateAssignment` property. This establishes which boundary the section's work must pass through.
```turtle
<section> bos:gateAssignment <gate> .
```

### Builder Accountability
A `WallSection` is linked to its `Builder` via the `bos:builderName` property.
```turtle
<section> bos:builderName <builder> .
```

### Inspection and Verdict
Once work on a `WallSection` is complete, it undergoes an inspection. The outcome is recorded as a `bos:InspectionVerdict` via the `bos:verdict` property.
- **Admitted**: The work meets the semantic laws.
- **Rejected**: The work fails validation (e.g., False Reports).

### Audit Proof (Receipt)
Every successful transition or admission must produce a `bos:Receipt`. This is linked via the `bos:receiptRelation`.
```turtle
<section> bos:receiptRelation <receipt> .
```

### Provenance (Nations Ledger)
The `bos:NationsLedger` serves as the external witness and source of record for the system's state. It provides the ground truth for when and how sections were repaired.

## Admissibility Logic
1. **Define Section**: Create a `WallSection`.
2. **Assign Gate**: Link the section to the appropriate `Gate`.
3. **Assign Builder**: Specify the entity performing the work.
4. **Inspect**: Execute validation logic to produce a `Verdict`.
5. **Issue Receipt**: If the verdict is positive, issue a `Receipt` to admit the section into the system's stable state.
