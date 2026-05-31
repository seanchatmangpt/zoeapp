# Supabase Backend & Serverless Edge Functions

The `supabase` backend and edge function directory, located at [supabase](file:///Users/sac/zoeapp/supabase), provides the secure operational boundary, authoritative validation services, and high-assurance database state storage for the Truex platform. It bridges client-side React Native/Expo operations with local and remote PostgreSQL databases, running serverless verification logic on the Deno Edge Runtime.

---

## 1. Title & Overview

The **Supabase Backend & Edge Runtime** serves as the authoritative state validator and security membrane of the Truex platform. By leveraging PostgreSQL, database migrations, Row Level Security (RLS) policies, and serverless Edge Functions, the module ensures that:
- **Serverless Verification**: Decouples sensitive execution logic (such as cryptographic receipt checking, OpenAI integrations, and trajectory conformance auditing) from client applications, preventing key leaks and wasm boundary crossings.
- **Authoritative Receipt Chains**: Operates as the official ledger where state transitions are receipted, canonicalized, and linked into cryptographic hash chains that are protected from client-side tampering.
- **Role-Based Admission & RLS**: Guarantees that only authorized service roles can commit state transition receipts, while public and authenticated users can securely query projections and event logs.
- **Virtual Ontological Mapping**: Maps relational databases onto Schema.org definitions via virtual RDF views, laying the groundwork for semantic queries and Virtual Knowledge Graphs (VKG).

---

## 2. Architectural & Philosophical Mapping

The Supabase module acts as the serverless host for the intake, validation, and persistence phases of the Truex architecture.

```mermaid
graph TD
    Client[Client App] -->|1. Submit Event / Request| Edge[Supabase Edge Runtime]
    Edge -->|2. Check CORS & Validation| Validate{Request Valid?}
    Validate -->|No| Reject[400/405 Bad Request]
    Validate -->|Yes: truex-verify / truex-min-verify| Verify{Signature & Hash Valid?}
    Verify -->|No| Fail[400 Mismatch / Refuse Admission]
    Verify -->|Yes| Insert[Insert Event & Compute Hash Chain]
    Insert -->|3. Query Previous Receipt Hash| DB_Receipts[(Postgres: truex_receipts)]
    DB_Receipts -->|Return prev_receipt_hash| Insert
    Insert -->|4. Compute SHA-256 Chained Hash| ReceiptGen[Generate Deterministic Receipt]
    ReceiptGen -->|5. Insert Event & Receipt (Service Role)| DB[(Postgres Database)]
    DB -->|6. Settle Transaction| Client
    
    subgraph Database RLS Layer
        DB --> RLS{RLS Enforcement}
        RLS -->|Anon / Authenticated| RLS_Read[SELECT permitted]
        RLS -->|Anon / Authenticated| RLS_Write_Blocked[INSERT forbidden]
        RLS -->|Service Role Only| RLS_Write_Allowed[INSERT / UPDATE allowed]
    end
```

### The Core Truex Pillars
1. **Intake**: Handled by Edge Functions such as [truex-verify/index.ts](file:///Users/sac/zoeapp/supabase/functions/truex-verify/index.ts) and [truex-min-verify/index.ts](file:///Users/sac/zoeapp/supabase/functions/truex-min-verify/index.ts). These receive raw request payloads, verify signatures, enforce schemas, and ensure that only structurally valid and authorized actions cross the platform threshold.
2. **Membrane**: Implemented via PostgreSQL Row Level Security (RLS) policies. Policies like `insert_receipts_service_role` block standard client tokens from directly inserting or modifying execution logs, forcing all state alterations to pass through the authoritative edge function membrane.
3. **Projection**: State updates are projected into target tables (`truex_events`, `truex_receipts`, `truex_replay_runs`, and `profiles`). Concurrently, semantic views (`event_ld`, `creativework_ld`, `sermon_ld`) project these relational states into standard RDF JSON-LD entities.
4. **Supervision**: Outlined by Edge Functions like [truex-hook-supervise/index.ts](file:///Users/sac/zoeapp/supabase/functions/truex-hook-supervise/index.ts), which log runtime anomalies, and capability checks in [v2030-runtime-health/index.ts](file:///Users/sac/zoeapp/supabase/functions/v2030-runtime-health/index.ts) that flag deviations using conformance auditing.

### Mathematical Mapping to the Chatman Equation

The Supabase module enforces the Receipted Chatman Equation:

$$R \vdash A = \mu(O^*)$$

Where:
- **$O^*$ (Lawful Closure Ontology)**: The set of database models, input schemas (e.g. `OCEL2` JSON logs), and virtual RDF views mapping relational columns to standard W3C ontologies.
- **$\mu$ (Transformation/Manufacturing Function)**: Serverless Deno execution runtimes (like `vkg-hooks-apply` and `truex-min-verify`) and DB-level trigger functions (like `handle_new_user`) that process input streams and mutate states.
- **$A$ (Emitted Consequence)**: The resulting relational row inserts, computed state hashes, and HTTP responses (e.g. `admission_status: 'accepted'`).
- **$R$ (Receipt Lineage)**: The deterministic cryptographic receipt chains stored within the `truex_receipts` database table. Each receipt is cryptographically bound to the previous using:
$$\text{receipt\_hash}_k = \text{SHA-256}(\text{receipt\_hash}_{k-1} + \text{canonicalStringify}(A_k))$$

---

## 3. Source Code Structure

The repository organizes database schema definitions, seeding scripts, and serverless code under the `supabase/` folder:

### Root Configurations
* [config.toml](file:///Users/sac/zoeapp/supabase/config.toml)  
  Specifies the ports (API: `54321`, DB: `54322`, Chrome debug: `8083`), database version (`17`), seed paths (`./seed.sql`), enabled extensions, and routing configurations for individual edge functions (such as disabling JWT verification for public validation endpoints).
* [seed.sql](file:///Users/sac/zoeapp/supabase/seed.sql)  
  Pre-populates the database environment during bootstrap, seeding a default test profile user (`test@example.com` / `password123`) in the `auth.users` and `auth.identities` schemas.

### Database Migrations
* [migrations/20241011000001_initial_schema.sql](file:///Users/sac/zoeapp/supabase/migrations/20241011000001_initial_schema.sql)  
  Sets up the core `public.profiles` schema, links it to `auth.users`, establishes trigger functions (`handle_new_user` and `handle_updated_at`), builds performance indexes on usernames, and enables user-specific RLS rules.
* [migrations/20260523000000_truex_hook_otp.sql](file:///Users/sac/zoeapp/supabase/migrations/20260523000000_truex_hook_otp.sql)  
  Scaffolds the initial tables for the OTP hook system including messages, runs, receipts, quarantines, projections, and outboxes, along with tenant-isolated RLS filters.
* [migrations/20260523000002_actor_tables.sql](file:///Users/sac/zoeapp/supabase/migrations/20260523000002_actor_tables.sql)  
  Implements the relational storage tables (`actor_commands`, `actor_events`, `actor_receipts`, `actor_outbox`, `actor_quarantine`) required by the Actor Runtime.
* [migrations/20260524000000_truex_min.sql](file:///Users/sac/zoeapp/supabase/migrations/20260524000000_truex_min.sql)  
  Performs cleanups by dropping outdated tables and establishing a clean, unified schema comprising `truex_events`, `truex_receipts`, and `truex_replay_runs`, with RLS permissions locked to the service role for receipt modifications.
* [migrations/view_creativework.sql](file:///Users/sac/zoeapp/supabase/migrations/view_creativework.sql)  
  Declares a virtual JSON-LD mapping view for Schema.org `CreativeWork` resources.
* [migrations/view_event.sql](file:///Users/sac/zoeapp/supabase/migrations/view_event.sql)  
  Declares a virtual JSON-LD mapping view for Schema.org `Event` resources.
* [migrations/view_sermon.sql](file:///Users/sac/zoeapp/supabase/migrations/view_sermon.sql)  
  Declares a virtual JSON-LD mapping view for Schema.org `Sermon` resources.

### Edge Functions
* [functions/openai/index.ts](file:///Users/sac/zoeapp/supabase/functions/openai/index.ts)  
  Provides a secure, server-side gateway to OpenAI's GPT-3.5-Turbo API, handling CORS preflight, parameter verification, key authorization, and quota errors.
* [functions/truex-hook-replay/index.ts](file:///Users/sac/zoeapp/supabase/functions/truex-hook-replay/index.ts)  
  Compares request messages and execution logs on Deno to verify state-transition determinism.
* [functions/truex-hook-supervise/index.ts](file:///Users/sac/zoeapp/supabase/functions/truex-hook-supervise/index.ts)  
  Logs supervision and failure events to standard system audit systems.
* [functions/truex-min-verify/index.ts](file:///Users/sac/zoeapp/supabase/functions/truex-min-verify/index.ts)  
  Intercepts, validates, hashes, and chain-links `volunteer_cancelled` events into `truex_receipts`.
* [functions/truex-verify/index.ts](file:///Users/sac/zoeapp/supabase/functions/truex-verify/index.ts)  
  Verifies the mathematical validity of `OCEL2` event batch signatures against expected execution paths.
* [functions/v2030-runtime-health/index.ts](file:///Users/sac/zoeapp/supabase/functions/v2030-runtime-health/index.ts)  
  Exposes capability execution triggers (e.g. `jtbd-conformance-auditor`) and local Edge health reports.
* [functions/vkg-hooks-apply/index.ts](file:///Users/sac/zoeapp/supabase/functions/vkg-hooks-apply/index.ts)  
  Authoritatively confirms virtual graph modifications and returns cryptographically signed receipts.

---

## 4. API Contracts

### Edge Function Endpoints

| Endpoint Route | HTTP Method | JWT Verification | Expected Input Payload | Success Response (200) |
|---|---|---|---|---|
| `/functions/v1/openai` | `POST` | `Enabled` | `{ "message": string }` | `{ "message": string \| null }` |
| `/functions/v1/truex-hook-replay` | `POST` | `Disabled` | `{ "history": any[], "messages": any[], "initialState"?: any }` | `{ "verified": boolean, "proof": string, "messageCount": number }` |
| `/functions/v1/truex-hook-supervise` | `POST` | `Disabled` | `{ "actorRef": { "kind": string, "id": string }, "messageId": string, "action": string, "error": string }` | `{ "status": "logged", "eventId": string }` |
| `/functions/v1/truex-min-verify` | `POST` | `Disabled` | `{ "type": string, "payload": any, "previous_receipt_hash"?: string }` | `{ "receipt": ReceiptRow }` |
| `/functions/v1/truex-verify` | `POST` | `Disabled` | `{ "session_id": string, "expected_path_hash": string, "ocel2_batch_hash": string, "receipt_hash": string, "ocel2": Ocel2Log, "admission_status"?: string }` | `{ "verified": boolean, "admission_status": string, "receipt_hash": string }` |
| `/functions/v1/v2030-runtime-health` | `POST` | `Disabled` | `{ "action"?: "run_capability", "capability"?: string, "input"?: any }` | `{ "runtime": string, "wasm4pm_loaded": boolean, ... }` or `{ "success": boolean, "result": any }` |
| `/functions/v1/vkg-hooks-apply` | `POST` | `Disabled` | `{ "delta": GraphDelta }` | `{ "status": "settled", "receipt": string, "reconciledDelta": GraphDelta }` |

---

## 5. Usage Guide

The following TypeScript module provides a production-ready class wrapper to interact with the Supabase Edge Functions and query receipt logs from the database.

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TruexReceipt {
  id: string;
  event_id: string;
  authority: string;
  input_hash: string;
  output_hash: string;
  previous_receipt_hash: string;
  receipt_hash: string;
  status: string;
  created_at: string;
}

export interface VerificationResult {
  verified: boolean;
  admission_status: string;
  receipt_hash: string;
  error?: string;
}

export interface HealthReport {
  runtime: string;
  wasm4pm_loaded: boolean;
  truex_available: boolean;
  algorithm_count: number;
  checks: {
    truex_verify: string;
    canonical_hash: string;
    receipt_refusal: string;
  };
}

export class SupabaseTruexService {
  private client: SupabaseClient;
  private functionsUrl: string;

  constructor(supabaseUrl: string, anonOrServiceKey: string) {
    this.client = createClient(supabaseUrl, anonOrServiceKey, {
      auth: { persistSession: false },
    });
    this.functionsUrl = `${supabaseUrl}/functions/v1`;
  }

  /**
   * Submits a state-changing event to the serverless membrane for verification and receipt chaining.
   * Runs the event verification and writes to truex_events + truex_receipts.
   */
  async submitVolunteerCancellation(
    payload: Record<string, any>,
    previousReceiptHash: string = ''
  ): Promise<TruexReceipt> {
    const response = await fetch(`${this.functionsUrl}/truex-min-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'volunteer_cancelled',
        payload,
        previous_receipt_hash: previousReceiptHash,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(`Failed to submit cancellation: ${errBody.error || response.statusText}`);
    }

    const data = await response.json();
    return data.receipt;
  }

  /**
   * Verifies the cryptographic integrity of an OCEL2 batch using the truex-verify edge function.
   */
  async verifyOcelReceipt(envelope: {
    session_id: string;
    expected_path_hash: string;
    ocel2_batch_hash: string;
    receipt_hash: string;
    ocel2: Record<string, any>;
    admission_status?: string;
  }): Promise<VerificationResult> {
    const response = await fetch(`${this.functionsUrl}/truex-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelope),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        verified: false,
        admission_status: 'refused',
        receipt_hash: envelope.receipt_hash,
        error: data.error || 'Verification endpoint returned non-200 status',
      };
    }

    return {
      verified: data.verified,
      admission_status: data.admission_status,
      receipt_hash: data.receipt_hash,
    };
  }

  /**
   * Fetches the local Edge Function health diagnostics report.
   */
  async getRuntimeHealth(): Promise<HealthReport> {
    const response = await fetch(`${this.functionsUrl}/v2030-runtime-health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Health ping failed with status ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Retrieves all confirmed receipts from the database.
   */
  async fetchReceipts(limit = 100): Promise<TruexReceipt[]> {
    const { data, error } = await this.client
      .from('truex_receipts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data as TruexReceipt[];
  }
}
```

---

## 6. Testing

The Supabase backend supports testing across three levels:

### A. Edge Function Unit Testing (Jest Mocks)
Edge Function behaviors are mocked and tested using Jest inside the test suites located under `__tests__` subfolders.
- **truex-hook-replay tests**:
  Located in [functions/truex-hook-replay/\_\_tests\_\_/index.test.ts](file:///Users/sac/zoeapp/supabase/functions/truex-hook-replay/__tests__/index.test.ts). Validates message count alignment and output hash matching, verifying that mismatched execution traces throw state divergence errors.
- **vkg-hooks-apply tests**:
  Located in [functions/vkg-hooks-apply/\_\_tests\_\_/index.test.ts](file:///Users/sac/zoeapp/supabase/functions/vkg-hooks-apply/__tests__/index.test.ts). Validates graph delta structures and verifies that only authorized edge/service role keys can confirm receipts.

To run these tests locally:
```bash
npm run test
```

### B. Integration Diagnostics (Doctor CLI)
The command line doctor verifies that the local Supabase emulation stack is up and responding. Run the command:
```bash
npm run truex doctor supabase-authority
```
This runs the script defined in [supabase-authority.ts](file:///Users/sac/zoeapp/scripts/cli/doctor/supabase-authority.ts) to:
1. Ping `/functions/v1/vkg-hooks-apply` with a test graph delta payload.
2. Confirm the settlement status and receipt hashes.
3. Validate Postgres RLS permissions.
4. Output the result log to `docs/vision2030/supabase-authority.report.json`.

### C. Live Stack Smoke Testing (Smoke CLI)
The smoke suite tests complete end-to-end integration with the local or remote database:
```bash
npm run truex smoke supa
```
This triggers the [supabase-smoke.ts](file:///Users/sac/zoeapp/scripts/cli/supabase-smoke.ts) workflow, executing the following validations:
1. Checks the `/v2030-runtime-health` endpoint.
2. Queries the `/truex-verify` signature engine using valid JSON payloads.
3. Generates, inserts, and reads back a synthetic receipt in `actor_receipts` to verify write permissions.
4. Scans the local Expo application source tree to ensure no database service-role secrets or raw `.wasm` binaries have leaked into the client bundle.
5. Saves results to `docs/vision2030/supabase-smoke.report.json`.
