# Avatar-Relative Hook Use Cases

This document explores how Truex VKG-HR (Virtual Knowledge Graph Hook Runtime) projects a single operational tension—an autonomic hook intervention—into distinct visibility, capability, and telemetry surfaces based on an actor's avatar.

In traditional CRUD systems, developers build separate screens and APIs for admins, pastors, and members. In Truex, the system evaluates the hook's **underlying operational truth**, and automatically computes the admissible projection for each avatar traversing the membrane.

---

## Use Case 1: The Volunteer Staffing Tension

### 1. Operational Reality
- **Condition (`C_t`)**: `volunteer_count < threshold` for an upcoming `schema:Event`.
- **Tension**: Operational staffing instability.
- **Autonomic Hook Triggered**: `ShortageDetectionHook`.
- **Settlement**: The membrane accepts the event as "understaffed" and emits a trajectory requiring assignment fulfillment.

### 2. Avatar-Relative Projections

A single "Volunteer Shortage Detected" graph delta enters the membrane and is projected into five distinct realities based on the observing avatar:

| Avatar | Visibility Surface | Capability / Action Surface | Telemetry Surface |
|--------|-------------------|---------------------------|-------------------|
| **Guest** | Hidden. (Guests have no operational stake in staffing). | None. | None. |
| **Member** | "Help needed this Sunday" banner on the home screen. | Ability to invoke `ApplyToVolunteer` command. | None. |
| **Volunteer** | "2 open slots available on your team." | Ability to invoke `ClaimShift` command. | None. |
| **Team Lead** | "Staffing threshold breached. Recommended candidates available." | Ability to invoke `AssignVolunteer` or `RequestCoverage`. | None. |
| **Pastor** | "Ministry staffing risk increasing for Sunday Service." | Ability to invoke `EscalateStaffingCall`. | None. |
| **Admin** | "ShortageDetectionHook accepted_pending. Trajectory: Assignment Required." | Full dispatcher access to override assignments. | Receipt lineage, trace verification, capability isolation logs. |
| **Operator** | Replay divergence checks, membrane trace metrics. | Ability to force sync, invoke `doctor` diagnostics. | Cryptographic verification, OCEL 2.0 hashes, replay deltas. |

---

## Use Case 2: Sermon Publishing with Policy Violation

### 1. Operational Reality
- **Condition (`C_t`)**: A Pastor attempts to publish a `schema:CreativeWork` (Sermon) containing a media URL that fails the `Truex_Verified_Domain` invariant.
- **Tension**: Invalid ontology projection attempt.
- **Autonomic Hook Triggered**: `ContentValidationHook`.
- **Settlement**: The remote Truex Edge dispatcher rejects the command (`rejected_remote`), emitting a compensating rollback to clear the optimistic local projection.

### 2. Avatar-Relative Projections

The single `rejected_remote` receipt generates the following avatars:

| Avatar | Visibility Surface | Capability / Action Surface | Telemetry Surface |
|--------|-------------------|---------------------------|-------------------|
| **Guest/Member** | Hidden. The sermon never appears in the feed. | None. | None. |
| **Pastor (Author)** | "Your sermon could not be published because the video link is from an unapproved domain." | Ability to invoke `EditSermon` and resubmit. | None. |
| **Admin** | "SermonPublish refused: Domain validation failed." | Ability to invoke `ApproveDomainException`. | Receipt ID and Rejection Reason. |
| **Operator** | "TransitionFamilyRefused: Illegal transition from 'drafted' to 'published'. Rollback executed." | Ability to replay the construct delta against the validator. | Rollback differential report, outbox sync latency, validation span trace. |

---

## Use Case 3: Concept Drift Detection

### 1. Operational Reality
- **Condition (`C_t`)**: The frequency of `PrayerRequest` submissions drops suddenly, while `CounselingRequest` submissions spike.
- **Tension**: Operational behavior is deviating from historical baselines.
- **Autonomic Hook Triggered**: `ConceptDriftDetector` (WASM/PI).
- **Settlement**: The process intelligence engine computes a high Jaccard distance over the sliding window and emits an EWMA smoothed alert.

### 2. Avatar-Relative Projections

| Avatar | Visibility Surface | Capability / Action Surface | Telemetry Surface |
|--------|-------------------|---------------------------|-------------------|
| **Guest/Member** | Hidden. | None. | None. |
| **Pastor** | "Congregation prayer patterns have shifted toward direct counseling needs this month." | Ability to invoke `PublishAnnouncement` to address mental health. | None. |
| **Admin** | "Drift Alert: Workflow deviation detected in Care module." | Ability to adjust staffing allocation. | Jaccard distance metrics. |
| **Operator** | "DriftDetector WASM routine emitted anomaly event." | Ability to `telco trace` the OCEL 2.0 logs to audit the drift. | EWMA chart rendering, WASM execution elapsed ms. |

---

## The Avatar Projection Calculus

These use cases demonstrate that **software no longer stores what happened** via hardcoded boolean flags (`is_visible_to_admin`). Instead, **software understands why motion became admissible**, and dynamically filters the shared operational truth through the observer's context.

`Avatar Projection = f(GraphDelta, Authority, Relevance, Policy)`

This eliminates thousands of lines of UI-layer conditional rendering and pushes the access-control logic down into the universal operational membrane.
