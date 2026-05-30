# TRUEX ARCHITECTURAL REBRAND: zoeapp

## 1. TRUEX CLASSIFICATION
**Tier:** Tier 3 — Membrane/Telemetry & Tier 4 — Execution Interface
**Truex Role:** Operational Projection Surface & Autonomic Routing Membrane
**Execution Function:** Bounded Telemetry Intake & Avatar-Relative Geometry

* **Deterministic vs Probabilistic:** Predominantly Deterministic routing with bounded probabilistic evaluation for operator UI.
* **Runtime vs Manufacturing:** Runtime. It is the live interface where operational tension is intercepted.
* **Local vs Distributed:** Distributed. Runs on local Expo clients but settles against the authoritative Supabase Edge.
* **Admission vs Projection vs Replay vs Supervision:** Projection and Intake. It projects the admissible bounds to the operator and gathers raw operational evidence.
* **Operational vs Infrastructural:** Operational. It represents the actual work surface of the organization.

---

## 2. ORIGINAL PURPOSE
`zoeapp` was built because executing process algorithms in a vacuum solves nothing; intelligence must bind to the actual operational motion of the organization. Classical frontend architectures (CRUD dashboards) separated the UI from the process geometry, leading to massive state drift. 

`zoeapp` was constructed as an intelligent membrane—an Expo/React Native application that intercepts jobs-to-be-done (JTBD) via object-centric "Hooks". The failure surface it resolved was *untracked execution*. Without a unified membrane, workers perform tasks out-of-band, rendering process conformance impossible. `zoeapp` captures intent *before* it settles, routing it to the Truex Kernel for admission.

---

## 3. CHATMAN EQUATION ALIGNMENT
**`A = μ(O*)`**
**`R ⊢ A = μ(O*)`**

* **`O*` (Lawful Closure Ontology):** The real-time application state and user intents bounded by the `proxyable` execution trap.
* **`μ` (Manufacturing Function):** The Truex autonomic dispatchers inside the app (`maestro/actor` definitions) that format the raw state into canonical OCEL 2.0 payloads.
* **`A` (Operational Consequence):** The avatar-relative UI projection (e.g., admitting a task, showing an approval screen, or hiding an unauthorized action).
* **Receipt Lineage (`R`):** The cryptographic payload returned by the Supabase Edge function after the Truex kernel validates the transition.
* **Admissibility:** Governed by the remote Truex Engine. If the remote edge rejects the envelope (`RECEIPT_REFUSED`), `zoeapp` must emit a local rollback to preserve UI/Execution parity.
* **Replay:** The `zoeapp` UI can be "rewound" or "fast-forwarded" by replaying the deterministic Truex Envelopes from the Postgres sync queue.

---

## 4. TRUEX EXECUTION ROLE
`zoeapp` handles the boundaries of the lifecycle:

`Intake → Projection → Supervision`

It captures **Intake** from human or automated operators. Once the Truex Kernel processes the closure, `zoeapp` handles **Projection** (displaying the admissible state). It also exposes the **Supervision** dashboards (digital twins/process intelligence) powered by the downstream deterministic engine.

---

## 5. OPERATIONAL GEOMETRY
This repository fundamentally implements **Actor Geometry** and **Propagation Geometry**.

* **Concurrency Model:** Uses SQLite (via wa-sqlite) and a robust offline-first sync queue to handle asynchronous state perturbations before they hit the deterministic edge.
* **Causality Handling:** Embeds object-centric causal links at the UI level. An action on a "Sermon" object is causally linked to a "Pastor" actor.
* **Failure Containment:** Employs optimistic UI projections bounded by strict rollback mechanisms. If a Truex Edge admission fails, the projection collapses back to the last known receipted state.

---

## 6. RECEIPT & EVIDENCE SURFACES
* **Emits:** Raw telemetry payloads wrapped in OTLP/Truex envelopes.
* **Proof:** N/A natively. It relies on the downstream `@truex/kernel` to generate the BLAKE3 cryptographic proof, which it then stores locally.
* **Telemetry:** Heavy reliance on React Native performance metrics, Maestro automation traces, and OCEL 2.0 event generation.

---

## 7. TRUEX REBRAND MAPPING
**Old Namespace → New Namespace**
* `zoeapp` → `@truex/membrane-client`
* `maestro/actor` → `maestro/truex-geometry`
* `scripts/truex.ts` → `scripts/dispatch.ts`

**Terminology Shifts:**
* User Interface / Screen → Avatar-Relative Projection
* API Call → Propagation Trigger
* Offline Queue → Admissibility Backlog
* Dashboard → Consequence Supervision

---

## 8. TRUEX TERMINOLOGY CONVERSION
| Old Framework Language | Truex Systems Language |
| :--- | :--- |
| Frontend Application | Operational Membrane |
| UI State | Avatar Projection |
| Form Submit | Operational Intake |
| Webhook / API Response | Settlement Adjudication |
| Offline Cache | Pre-Admission Tension Queue |
| Admin Panel | Supervision Geometry |

---

## 9. RELATION TO OTHER TRUEX PROJECTS
* **Downstream:** Feeds strictly formatted `O*` payloads to `@truex/kernel` and `@truex/edge` (Supabase).
* **Upstream:** Consumes the BLAKE3 receipts and `ReceiptAdmitted` signals from the edge to finalize local SQLite persistence.
* **Replay:** Consumes `SOS` (Single Operational Source) replays to reconstruct historical UI states for auditing.

---

## 10. MISSING INVARIANTS
* **Strict Membrane Traps:** The usage of `proxyable` (or similar membrane traps) must be mathematically proven across *all* global state mutations in Expo, ensuring no state can bypass the Truex envelope generation.
* **Receipt-Driven UI:** The UI currently assumes success too easily; it needs to shift to a "Receipt Theater" defense model where screens do not unlock until the local SQLite DB records the exact BLAKE3 receipt.

---

## 11. TRUEX FUTURE EVOLUTION
`zoeapp` evolves into the definitive **Truex Field Operator Client**—a universal shell. Rather than hardcoding screens for specific churches or businesses, it becomes a pure rendering engine for Truex Projections. The UI layout will be entirely derived from the admissible `POWL` geometries and avatar authorities verified by the kernel.

---

## 12. FINAL TRUEX CLASSIFICATION
This repository is not fundamentally a frontend React Native application.

It is a telemetry-intake and avatar-projection membrane inside the Truex execution-trust stack.