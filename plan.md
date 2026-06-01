# Execution Blueprint v30.1.1: WfNet Forgeability Patch

## Target: `wasm4pm-compat`

### 1. Vulnerability Analysis
The `wasm4pm-compat` module exhibits a forgeability inconsistency in its Workflow Net (WfNet) implementation. The `attest_witnessed` function silently coerces unverified `Claimed` tokens into `Witnessed` tokens, bypassing the required cryptographic proof obligations. This allows malicious actors to forge state transitions within the Ostar Generative Pipeline without supplying valid witnesses.

### 2. Patch Directives

#### A. Remove Silent Coercion in `attest_witnessed`
- **Current Flaw**: `attest_witnessed` accepts `Claimed<T>` and implicitly casts it to `Witnessed<T>` without invoking the verifier.
- **Action**: Delete the implicit type cast and any `unsafe` blocks associated with this coercion.
- **Enforcement**: Introduce strict typestate boundaries where `Witnessed<T>` can only be instantiated via a verified constructor.

#### B. Enforce `Claimed` -> `Witnessed` Proof Obligation
- **Requirement**: The transition from `Claimed` to `Witnessed` must explicitly consume a cryptographic proof (e.g., a SNARK/STARK proof or BLAKE3 receipt).
- **Implementation**: Modify the signature of `attest_witnessed` to:
  `fn attest_witnessed(claimed: Claimed<T>, proof: ProofObligation) -> Result<Witnessed<T>, ProofError>`
- **Verification Logic**: Before returning the `Witnessed` state, `attest_witnessed` must invoke `proof.verify(claimed.hash())`. If verification fails, the transition must be aborted.

### 3. Post-Patch Validation (Ostar-Doctor)
Run `ggen doctor` to verify law closure. The architectural diagnostics must confirm that the `Claimed -> Witnessed` state transition strictly preserves the Chatman Equation (A = μ(O)) and that no logic defined by the governor is dropped.
