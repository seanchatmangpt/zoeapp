# Handoff Report — Receipt-Driven UI structures and BLAKE3 Gating

This report outlines the discovery and design formulation for transitioning the `zoeapp` screens into a "Receipt Theater" defense model using BLAKE3 cryptographic receipts queried from local SQLite storage.

---

## 1. Observation

### A. Expo/React Native UI Screens / Projections
We identified 28 distinct screens, layouts, and route definitions inside `src/app`:
- **Auth Intake Screen**:
  - `src/app/(auth)/index.tsx` (Auth submission UI)
- **Avatar-Relative Projections & Tabs**:
  - `src/app/(tabs)/index.tsx` (Home Screen with quick links and manual volunteer cancellation test trigger)
  - `src/app/(tabs)/account.tsx` (User account supervision screen)
  - `src/app/(tabs)/admin.tsx` (Redirect utility to `/admin/actor-lab`)
  - `src/app/(tabs)/hooks.tsx` (Hook cockpit controller showcasing VKG projection surfaces and actions)
  - `src/app/(tabs)/openai.tsx` (Quarantined screen omitted from navigation via `href: null`)
- **Supervision Geometry & Admin Screens**:
  - `src/app/admin/index.tsx` (Redirect utility to `/admin/dashboard`)
  - `src/app/admin/dashboard.tsx` (Consoles dashboard monitoring diagnostic grids: Outbox, Quarantine, Lag, Uptime, and verifying receipt chain integrity)
  - `src/app/admin/actor-lab.tsx` (Testing/perturbation screen for actor commands/principals)
  - `src/app/admin/receipts.tsx` (Audit logs and receipt viewer)
  - `src/app/admin/outbox.tsx` (Local sync queue / admissibility backlog status log)
  - `src/app/admin/realtime.tsx` (Supabase live stream channel viewer)
  - `src/app/admin/intelligence.tsx` (Process intelligence supervisor visualization)
  - `src/app/admin/settings.tsx` (App credentials and endpoints configurator)
  - `src/app/admin/church.tsx` (Church profile metadata dashboard)
  - `src/app/admin/content.tsx` (Content metadata config)
  - `src/app/admin/events.tsx` (Event dispatcher interface)
  - `src/app/admin/groups.tsx` (Small groups controller)
  - `src/app/admin/people.tsx` (Member contact listing)
  - `src/app/admin/prayer.tsx` (Prayer request queue)
  - `src/app/admin/sermons.tsx` (Sermon publisher screen sending `PublishSermon` command envelope)
  - `src/app/admin/volunteers.tsx` (Volunteer scheduler screen)
- **Overlays and Fallbacks**:
  - `src/app/modal.tsx` (Feedback overlay modal)
  - `src/app/+not-found.tsx` (Unmatched route view)
- **Layout Containers**:
  - `src/app/_layout.tsx` (Root app container managing auth state redirection and font asset loading)
  - `src/app/(tabs)/_layout.tsx` (Tab navigation layout)
  - `src/app/admin/_layout.tsx` (Administrative stack layout)

### B. SQLite and MMKV Local Storage Integration
We observed two key local-first data storage mechanisms in the codebase:

1. **SQLite (`expo-sqlite` and `drizzle-orm`)**:
   - Initialized in `src/lib/db/db.ts` opening `zoeapp.db`:
     ```typescript
     export const expoDb = openDatabaseSync(DATABASE_NAME);
     ```
   - Schema defined in `src/lib/db/schema.ts` mapping tables:
     - `syncQueue`: Offline sync queue backlog.
     - `quads`: Semantic Virtual Knowledge Graph triples store.
     - `actorCommands`: Dispatched command logging.
     - `actorEvents`: Emitted event logging.
     - `actorReceipts`: Stored cryptographic receipts returned from dispatcher/kernel.
     - `actorOutbox`: Dispatch queue backlog.
     - `actorQuarantine`: Failed/poisoned transactions.
   - Queried in `src/lib/actor/dispatcher.ts` (idempotency, insertions, sync outbox log checking) and `src/app/admin/dashboard.tsx` (diagnostic counts and chain verification logic).
   - Queried in `src/lib/vkg/client.ts` via standard RDF matching (`VirtualKnowledgeGraphClient.match`).

2. **MMKV (`react-native-mmkv`)**:
   - Configured in `src/lib/store/mmkvStorage.ts` for fast, synchronous key-value caching:
     ```typescript
     export const mmkvInstance = createMMKV({ id: 'zoeapp-zustand-storage' });
     ```
   - Exports `mmkvStorage` as a Zustand middleware `StateStorage` adapter. It is currently not active in Zustand stores (e.g. `useActorOpsStore`).

### C. Gating Infrastructure
We observed that `src/route-law/ProtectedRoute.tsx` implements routing gates using typestate checks (`admitRoute`), email confirmations, and metadata boundary levels. However, it is not currently bound to any active screen/projection routes inside `src/app`.

---

## 2. Logic Chain

1. **Rebranding Alignment**: The project requires shifting from SHA-256 (currently used in `src/lib/crypto/receipts.ts` and `src/lib/truex/hook-otp/receipts.ts`) to BLAKE3 cryptographic hashes.
2. **Defensive Model Requirement**: The "Receipt Theater" defense model enforces that UI screens (avatar projections) remain locked unless a matching receipt is verified in SQLite.
3. **Database Integration**: Since `actorReceipts` table in SQLite is the local system of record for all settled receipts, we must query this table using the screen's target `commandId` (or associated execution identifier) to verify existence and hash validity before unlocking.
4. **Asynchronous Check Need**: Since SQLite queries (`drizzle-orm` matching) are asynchronous, the gating interface (such as `ProtectedRoute` or a custom hook) must handle loading states asynchronously while the database check completes.

---

## 3. Caveats

- We assumed that a pure-JavaScript BLAKE3 hashing module is acceptable due to Expo/Hermes portability constraints (to avoid native library build failures on iOS/Android).
- The definition of "matching BLAKE3 receipt" is assumed to match the `commandId` or `actionId` of the command that authorized/bootstrapped that screen's domain (e.g. unlocking `admin/sermons.tsx` requires a settled receipt confirming that the Sermon configuration was established).

---

## 4. Conclusion

To transition UI projections to the "Receipt Theater" defense model, we propose the following refactoring:

### A. Implement pure-JS BLAKE3 Hashing Module
Add `blake3` algorithm support to `src/lib/crypto/receipts.ts`. This can be achieved by utilizing a pure-JS implementation of BLAKE3 (e.g., standard sponge-construction BLAKE3 algorithm or importing a lightweight library) so that hashes can be computed deterministically across React Native runtimes.

```typescript
// Proposed additions to src/lib/crypto/receipts.ts
export function blake3(message: string): string {
  // Pure JavaScript implementation of BLAKE3 hashing
  // Outputs 64-character hex signature
  // ...
}

export function generateBlake3ReceiptHash(previousHash: string | null | undefined, data: any): string {
  const prev = previousHash || '';
  const dataStr = canonicalStringify(data);
  return blake3(prev + dataStr);
}
```

### B. Update Route Definition Types
Extend `RouteDefinition` in `src/route-law/types.ts` to include a required BLAKE3 receipt identifier:

```typescript
// Proposed edit in src/route-law/types.ts
export interface RouteDefinition {
  requiredIdentityBoundary?: IdentityBoundary;
  requiredDisclosures?: readonly Disclosure[];
  customGuard?: (participant: ParticipantBasis) => RefusalReason | null;
  // Gating requirement: Screen remains locked until a matching BLAKE3 receipt exists in SQLite
  requiredReceiptCommandId?: string; 
}
```

### C. Refactor Protected Route Gating Component
Modify `ProtectedRoute.tsx` to verify the presence of the matching BLAKE3 receipt in SQLite asynchronously:

```typescript
// Proposed edits in src/route-law/ProtectedRoute.tsx
import { db } from '../db/db';
import { actorReceipts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyReceiptIntegrity } from '../lib/truex/hook-otp/receipts'; // updated to use BLAKE3

// Inside ProtectedRoute component:
const [receiptVerified, setReceiptVerified] = useState(false);
const [checkingReceipt, setCheckingReceipt] = useState(!!route.requiredReceiptCommandId);

useEffect(() => {
  async function checkReceipt() {
    if (!route.requiredReceiptCommandId) {
      setReceiptVerified(true);
      setCheckingReceipt(false);
      return;
    }
    try {
      const records = await db
        .select()
        .from(actorReceipts)
        .where(and(
          eq(actorReceipts.commandId, route.requiredReceiptCommandId),
          eq(actorReceipts.status, 'applied_remote')
        ));
      
      if (records.length > 0) {
        // Compute and verify receipt integrity with BLAKE3
        // If match, unlock screen
        setReceiptVerified(true);
      } else {
        setReceiptVerified(false);
      }
    } catch (err) {
      setReceiptVerified(false);
    } finally {
      setCheckingReceipt(false);
    }
  }
  checkReceipt();
}, [route.requiredReceiptCommandId]);

// Render logic:
if (checkingReceipt) {
  return loadingComponent || <ActivityIndicator size="large" color="#007AFF" />;
}

if (!receiptVerified) {
  // Access Denied / Locked due to missing/invalid receipt
  return fallback ? <>{fallback}</> : <Redirect href="/(tabs)" />;
}
```

---

## 5. Verification Method

### A. Testing the Gating Mechanics
Run the existing test suites using the project test command:
```bash
npm run test
```
And verify that the `ProtectedRoute.tsx` tests continue to pass after updating types and routing rules. We can write an explicit unit test in `src/route-law/__tests__/ProtectedRoute.test.tsx` mocking `db` responses for both positive (receipt exists) and negative (receipt missing or hash mismatch) paths.

### B. CI Release Gate check
Ensure the gate verification command succeeds:
```bash
npm run truex verify
```
This confirms that no stubbed, mocked, or bypassed flags remain active in the proof manifest file (`artifacts/proof_manifest.json`).
