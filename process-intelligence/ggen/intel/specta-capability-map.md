# Specta Capability Map
This file maps the Rust domain model to TypeScript projections managed by the Ostar pipeline.

## Projection Surface
The projection layer ensures type safety between the backend (Rust/Serde) and frontend (TypeScript) by leveraging the Specta library to generate isomorphic definitions.

## Drift Detection
Drift is defined as any mismatch between the derived TS types and the authoritative Rust source of truth (defined in `Ostar::Ontology`).
- The system employs BLAKE3 hashing of both the Rust source and generated TS artifacts.
- Mismatches in these hashes trigger an audit failure during the `ggen sync` cycle.

## Remediation
If drift is detected:
1. Re-run `ggen sync` to force regeneration.
2. If drift persists, invoke `ostar-doctor` to audit the type mapping.
