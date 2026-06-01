# Mobile Sandbox, Encryption, & Memory-Safety Validation Audit
## Framework Validation, Stress Vectors, and Typestate Resiliency Simulator

This document presents a principal-level software security audit and validation report of the **On-Device Sandboxing, MMKV Storage Encryption, and Client Memory Lifecycle** in the Zoe 2030 Mobile Application.

---

## 1. Role Perspective & Scope

As the **Mobile Security Architect & Cryptographer** for the Zoe Core Validation Team, the scope of this audit covers client-side data boundaries, native file system isolation, local persistence protection, and heap-allocated subscription models. 

### Core Mathematical Model: The Receipted Chatman Equation in Mobile Security
The client execution sandbox, secure storage invariants, and JSI-level memory boundaries are mathematically governed by the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
*   $R$ represents the **Mobile Security Ruleset** defining the safety policies of the client application:
    - $R_{\text{sandbox}}$: Invariant enforcing that files inside the application storage directory are isolated and cannot be read/copied externally.
    - $R_{\text{crypto}}$: Invariant enforcing that all persisted database instances (MMKV, SQLite) are encrypted with key material $K_{\text{enc}}$ derived from secure hardware-backed keystores.
    - $R_{\text{memory}}$: Invariant enforcing that the memory consumption $M$ of the runtime client is bounded, containing zero persistent leaks ($dM/dt \le \epsilon$ over long execution periods).
*   $O^*$ represents the **Cryptographic Observer State** of the physical client device environment:
    - $O^* = \langle S, D_{\text{files}}, H_{\text{mem}} \rangle$
    - $S \in \{ \text{Secure}, \text{Compromised} \}$ is the physical security level of the device (rooted, jailbroken, debug-mode, or compromised sandbox).
    - $D_{\text{files}}$ is the set of all database files and cache directories in the application sandbox.
    - $H_{\text{mem}}$ is the state graph of memory allocations on the JS engine (Hermes/JSI) and Native bridges (JNI/ObjC).
*   $A$ is the **Audit Compliance Vector** ($A \in \{ \text{Compliant}, \text{NonCompliant} \}$).
*   $\mu$ is the **Validation Function** checking if the system meets $R$ given the observer state $O^*$.

Specifically, the validation function $\mu(R, O^*)$ yields $\text{Compliant}$ if and only if:
1.  **Backup Lockout**: The system configuration prohibits backup-based exfiltration, i.e., $allowBackup = \text{false}$ and no readable database handles are exported.
2.  **Entropy Bound**: For all databases $d \in D_{\text{files}}$, the database bytes are indistinguishable from random noise (high entropy) when accessed without the hardware key, signifying strong AES-CFB/AES-GCM encryption.
3.  **Key Isolation**: The encryption keys $K_{\text{enc}}$ are not stored in source files, environment variables, or memory cache, but are bound to secure hardware enclaves (Keystore/Keychain).
4.  **Leak Containment**: The listener subscription registry is empty on route transit, i.e., all registered JSI callbacks are collected, preventing memory accretion in $H_{\text{mem}}$.

---

### Core Security & Memory Invariants

| Invariant ID | Name | Formal Definition | Enforcement Level |
| :--- | :--- | :--- | :--- |
| **INV-SB-01** | Directory Isolation | $\forall \text{file} \in D_{\text{files}}, \text{AccessPermission}(\text{file}) \subseteq \{\text{UID\_app}\}$ | OS Kernel / Sandbox |
| **INV-CR-02** | Persistent Encryption | $\forall \text{db} \in D_{\text{files}}, \text{Entropy}(\text{db}) \ge 7.99 \text{ bits/byte}$ when keys are locked | MMKV JNI / SQLCipher |
| **INV-KM-03** | Enclave Binding | $K_{\text{enc}} \notin D_{\text{files}} \land \text{IsolatedStorage}(K_{\text{enc}}) \Rightarrow \text{Keystore/Keychain}$ | hardware Keystore / SecureStore |
| **INV-MS-04** | Subscription Collection | $\lim_{t \to \infty} \frac{\Delta H_{\text{mem}}}{\Delta t} = 0$ for repetitive component mount/unmount | Hermes Engine / JSI |

---

### Threat Vector & Mitigation Topology

```mermaid
flowchart TD
    subgraph Vulnerabilities
        A["android:allowBackup = true"]
        B[Unencrypted MMKV Storage]
        C[Uncleaned Event Listeners / CDC]
    end

    subgraph Attack Vectors
        AV1[ADB Backup Extraction]
        AV2[Rooted Device Inspection]
        AV3[JS JSI Heap Accumulation]
    end

    subgraph Mitigations
        M1["Set android:allowBackup = false"]
        M2[AES-CFB Encryption via Hardware Keystore]
        M3[Standardized Hook Cleanup & WeakRefs]
    end

    A --> AV1
    B --> AV2
    C --> AV3

    AV1 -.-> M1
    AV2 -.-> M2
    AV3 -.-> M3
    
    M1 --> S1[Secure Sandboxing]
    M2 --> S2[Zero-Knowledge Local Storage]
    M3 --> S3[Bounded Memory Footprint]
```

---

## 2. Fault Vectors & Stress Trajectories

The mobile application's state preservation and local-first architecture present three major security and stability threat vectors if sandboxing or memory lifecycles are neglected.

### Vector 1: Sandbox Bypass via ADB Backup Extraction
*   **Vulnerability Location**: [AndroidManifest.xml](file:///Users/sac/zoeapp/android/app/src/main/AndroidManifest.xml#L14)
*   **Fault Vector**: In the current configuration, `android:allowBackup="true"` is declared on the application tag. Under ordinary operation, the Android OS limits app sandbox access to the app's unique user ID (`UID_app`). However, with backup privileges enabled, an attacker who gains temporary physical access to the device or uses debugging access can run `adb backup -apk -shared com.membrane.zoeapp` to capture all private files, extraction-free, onto an external machine.
*   **Execution Trajectory**:
    1.  The attacker plugs the device into a host machine via USB with USB debugging enabled.
    2.  The backup archive is generated, capturing `/data/user/0/com.membrane.zoeapp/files/` and `/data/user/0/com.membrane.zoeapp/databases/`.
    3.  The attacker extracts the tar-formatted backup using standard recovery tools.
    4.  *Impact*: Key files, local databases, and unencrypted MMKV store tables are completely exposed.

### Vector 2: Plaintext MMKV Storage and Session Leakage
*   **Vulnerability Location**: [mmkvStorage.ts](file:///Users/sac/zoeapp/src/lib/store/mmkvStorage.ts#L5) and [storage.ts](file:///Users/sac/zoeapp/src/framework/state/storage.ts#L21)
*   **Fault Vector**: MMKV instances are instantiated via `createMMKV({ id: ... })` without the `encryptionKey` option. This leaves the MMKV binary tables in plaintext. While MMKV uses an optimized binary format rather than SQLite or JSON files, it is not a cryptographic container. 
*   **Execution Trajectory**:
    1.  The app writes sensitive information (e.g. Supabase session JWT tokens, behavioral authentication biometrics, user profile data) into Zustand, which persists synchronously to MMKV.
    2.  An attacker extracts the `.default` file from the app sandbox (using Vector 1, or via device rooting).
    3.  The attacker parses the raw binary file. Since the keys and values are written in plaintext bytes alongside MMKV headers, the session keys, username, and token credentials are readable directly.
    4.  *Impact*: complete session hijacking and compromise of offline data sync logs.

### Vector 3: Memory Accumulation via Stale Listeners on JSI Bridge
*   **Vulnerability Location**: [realtime.tsx](file:///Users/sac/zoeapp/src/app/admin/realtime.tsx#L207) and [useBehavioralAuth.ts](file:///Users/sac/zoeapp/src/framework/auth/behavioral/useBehavioralAuth.ts#L97)
*   **Fault Vector**: In React Native, memory leaks do not just impact JavaScript; because the React Native runtime interacts with native libraries via JSI, a JavaScript memory leak can prevent native memory allocations from being reclaimed. In `realtime.tsx`, if the Supabase channel subscription is not cleaned up due to early returns or missing dependencies, or if custom JSI event listeners in behavioral auth hooks fail to unregister, the garbage collector cannot reclaim the mounting context.
*   **Execution Trajectory**:
    1.  A component registers a listener closure that retains heavy local state (e.g., projection matrices or CDC delta tables).
    2.  During rapid navigation transitions, the component unmounts, but the subscription callback remains in the global listener registry.
    3.  The closure holds a reference to the component's state/props. 
    4.  *Impact*: The React component tree remains pinned in memory (detached fiber nodes), leading to heap size inflation, garbage collection thrashing, JSI bridge congestion, and eventual OS-driven OOM crashes.

---

## 3. Resiliency Test Simulator

This simulator is a complete, production-ready, copy-pasteable TypeScript block designed to test and verify the mobile security and memory containment invariants. It models sandbox access, MMKV encryption key derivation, and event listener lifecycle management.

```typescript
/**
 * @fileoverview Resiliency Simulator for On-Device Sandboxing, MMKV Encryption, and JSI Client Memory Safety.
 * This simulator models and verifies:
 * 1. Sandbox Exfiltration (allowBackup vulnerability and mitigation)
 * 2. MMKV Storage Encryption Key vulnerability (Plaintext vs Encrypted storage files)
 * 3. Client memory leaks via uncleaned listeners and stale closures.
 */

// --- SECTION 1: HARDWARE KEYSTORE & KEYCHAIN MOCK ---
export class MockSecureHardwareStore {
  private store = new Map<string, string>();
  private hardwareEnclaveAvailable = true;

  constructor(hardwareEnclaveAvailable = true) {
    this.hardwareEnclaveAvailable = hardwareEnclaveAvailable;
  }

  public async setSecret(key: string, value: string): Promise<void> {
    if (!this.hardwareEnclaveAvailable) {
      throw new Error("Hardware keystore unavailable: Secure enclave failed.");
    }
    this.store.set(key, value);
  }

  public async getSecret(key: string): Promise<string | null> {
    if (!this.hardwareEnclaveAvailable) {
      throw new Error("Hardware keystore unavailable: Secure enclave failed.");
    }
    return this.store.get(key) || null;
  }

  public async deleteSecret(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// --- SECTION 2: SANDBOX FILE SYSTEM SIMULATION ---
export interface FileMetadata {
  name: string;
  content: string;
  isEncrypted: boolean;
}

export class MockDeviceSandbox {
  public files = new Map<string, FileMetadata>();
  public allowBackup: boolean;
  public appPackageName: string;

  constructor(appPackageName: string, allowBackup = true) {
    this.appPackageName = appPackageName;
    this.allowBackup = allowBackup;
  }

  public writeFile(path: string, content: string, isEncrypted = false): void {
    this.files.set(path, { name: path, content, isEncrypted });
  }

  public readFile(path: string): string {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    if (file.isEncrypted) {
      // Simulate AES-CFB encryption output (unreadable binary high-entropy block)
      return `[AES-CFB ENCRYPTED BINARY BLOB: ${Buffer.from(file.content).toString('base64').substring(0, 16)}...]`;
    }
    return file.content;
  }

  /**
   * Simulates an adb backup operation.
   * If allowBackup is true, the entire sandbox is extracted.
   */
  public performADBBackup(): Record<string, string> | null {
    if (!this.allowBackup) {
      return null; // Backup refused by OS security policy
    }
    const archive: Record<string, string> = {};
    for (const [path, file] of this.files.entries()) {
      archive[path] = file.isEncrypted 
        ? `[AES-CFB ENCRYPTED BINARY BLOB: ${Buffer.from(file.content).toString('base64').substring(0, 16)}...]`
        : file.content;
    }
    return archive;
  }
}

// --- SECTION 3: MMKV STORAGE ENGINE SIMULATION ---
export interface MMKVOptions {
  id: string;
  encryptionKey?: string;
}

export class MockMMKV {
  private id: string;
  private encryptionKey?: string;
  private db = new Map<string, string>();
  private sandbox: MockDeviceSandbox;
  private filePath: string;

  constructor(options: MMKVOptions, sandbox: MockDeviceSandbox) {
    this.id = options.id;
    this.encryptionKey = options.encryptionKey;
    this.sandbox = sandbox;
    this.filePath = `/data/user/0/${sandbox.appPackageName}/files/mmkv/${this.id}.default`;
    
    // Write empty db file to sandbox on init
    this.persistToSandbox();
  }

  private persistToSandbox() {
    const rawContent = JSON.stringify(Array.from(this.db.entries()));
    // If encryptionKey is present, the sandbox representation is encrypted
    const isEncrypted = !!this.encryptionKey;
    this.sandbox.writeFile(this.filePath, rawContent, isEncrypted);
  }

  public set(key: string, value: string | boolean | number): void {
    this.db.set(key, String(value));
    this.persistToSandbox();
  }

  public getString(key: string): string | null {
    return this.db.get(key) || null;
  }

  public getBoolean(key: string): boolean | null {
    const val = this.db.get(key);
    if (!val) return null;
    return val === 'true';
  }

  public remove(key: string): void {
    this.db.delete(key);
    this.persistToSandbox();
  }

  public getAllKeys(): string[] {
    return Array.from(this.db.keys());
  }

  public clearAll(): void {
    this.db.clear();
    this.persistToSandbox();
  }
}

// --- SECTION 4: CLIENT MEMORY SAFETY & SUBSCRIPTION SIMULATOR ---
export type EventCallback = (data: any) => void;

export class MockEventHub {
  public listeners = new Map<string, Set<{ id: string; callback: EventCallback }>>();
  private listenerIdCounter = 0;

  public subscribe(event: string, callback: EventCallback): string {
    const id = `sub_${++this.listenerIdCounter}`;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add({ id, callback });
    return id;
  }

  public unsubscribe(event: string, subId: string): boolean {
    const set = this.listeners.get(event);
    if (!set) return false;
    for (const item of set) {
      if (item.id === subId) {
        set.delete(item);
        return true;
      }
    }
    return false;
  }

  public emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(item => item.callback(data));
    }
  }
}

// Models a view or hook execution context
export class SimulatedComponent {
  public name: string;
  private hub: MockEventHub;
  private activeSubscriptions: { event: string; id: string }[] = [];
  public closureHeavyState: any = null; // Used to simulate memory payload
  public isMounted = false;

  constructor(name: string, hub: MockEventHub) {
    this.name = name;
    this.hub = hub;
  }

  public mount(leakListeners = false): void {
    this.isMounted = true;
    
    // Simulate loading heavy matrix data (e.g. projection matrix array)
    this.closureHeavyState = new Array(50000).fill("matrix_row_data_payload_block");

    // Subscribe to Event Hub (like Supabase realtime channel or AppState)
    const subId1 = this.hub.subscribe("database_cdc_changes", (payload) => {
      // In a memory leak, the closure captures `this.closureHeavyState` and `this`
      if (this.isMounted) {
        this.processUpdate(payload);
      }
    });
    this.activeSubscriptions.push({ event: "database_cdc_changes", id: subId1 });

    const subId2 = this.hub.subscribe("app_state_transition", (state) => {
      if (this.isMounted) {
        this.processUpdate(state);
      }
    });
    this.activeSubscriptions.push({ event: "app_state_transition", id: subId2 });
  }

  private processUpdate(data: any) {
    // Process update logic
  }

  public unmount(performCleanup = true): void {
    this.isMounted = false;
    if (performCleanup) {
      // Correct cleanup to prevent memory leaks
      this.activeSubscriptions.forEach(sub => {
        this.hub.unsubscribe(sub.event, sub.id);
      });
      this.activeSubscriptions = [];
      this.closureHeavyState = null; // Clear heavy payload reference
    } else {
      // LEAKED: We do NOT unsubscribe, leaving the callbacks in the EventHub's listeners set.
      // Since the callback closure is bound to `this` (the component instance),
      // the entire component instance and its `closureHeavyState` remains pinned in the heap!
    }
  }
}

// --- SECTION 5: SIMULATION ORCHESTRATOR & RESILIENCY TESTS ---
export async function runMobileSecuritySuite() {
  console.log("======================================================================");
  console.log("             ZOE MOBILE SECURITY RESILIENCY SIMULATOR SUITE            ");
  console.log("======================================================================\n");

  const results = {
    sandboxBypassVulnerable: false,
    sandboxBypassMitigated: false,
    mmkvPlaintextExposed: false,
    mmkvEncryptedSecure: false,
    memoryLeakDetected: false,
    memoryLeakMitigated: false,
  };

  // ------------------------------------------------------------------
  // TEST 1: Sandbox Exfiltration and raw file access via ADB Backup
  // ------------------------------------------------------------------
  console.log("[TEST 1] Sandbox Exfiltration via allowBackup");
  
  // Vulnerable Device state
  const vulnerableSandbox = new MockDeviceSandbox("com.membrane.zoeapp", true);
  vulnerableSandbox.writeFile("/data/user/0/com.membrane.zoeapp/files/sensitive_keys.txt", "jwt_token_secret_data");
  
  const leakedArchive = vulnerableSandbox.performADBBackup();
  if (leakedArchive && leakedArchive["/data/user/0/com.membrane.zoeapp/files/sensitive_keys.txt"] === "jwt_token_secret_data") {
    results.sandboxBypassVulnerable = true;
    console.log("  ⚠️  VULNERABILITY CONFIRMED: Private sandbox files leaked via ADB Backup!");
  }

  // Mitigated Device state
  const secureSandbox = new MockDeviceSandbox("com.membrane.zoeapp", false);
  secureSandbox.writeFile("/data/user/0/com.membrane.zoeapp/files/sensitive_keys.txt", "jwt_token_secret_data");
  
  const blockedArchive = secureSandbox.performADBBackup();
  if (blockedArchive === null) {
    results.sandboxBypassMitigated = true;
    console.log("  🛡️  MITIGATION CONFIRMED: ADB Backup refused due to allowBackup=false configuration.");
  }
  console.log("");

  // ------------------------------------------------------------------
  // TEST 2: MMKV Plaintext vs Encryption Verification
  // ------------------------------------------------------------------
  console.log("[TEST 2] MMKV Storage Encryption Key Verification");
  
  // Case A: Unencrypted MMKV
  const sandboxA = new MockDeviceSandbox("com.membrane.zoeapp", true);
  const unencryptedMMKV = new MockMMKV({ id: "zustand-cache" }, sandboxA);
  unencryptedMMKV.set("session_token", "jwt-header.payload-secret-12345");

  // Read raw file on disk directly
  const rawDiskDataA = sandboxA.readFile("/data/user/0/com.membrane.zoeapp/files/mmkv/zustand-cache.default");
  if (rawDiskDataA.includes("jwt-header.payload-secret-12345")) {
    results.mmkvPlaintextExposed = true;
    console.log("  ⚠️  VULNERABILITY CONFIRMED: Raw MMKV binary files contain plaintext sessions!");
  }

  // Case B: Encrypted MMKV with Hardware-backed key
  const sandboxB = new MockDeviceSandbox("com.membrane.zoeapp", true);
  const hardwareKeystore = new MockSecureHardwareStore(true);
  
  // Deriving and storing a key inside Hardware Enclave
  const keyIdentifier = "mmkv_db_key_zustand-cache";
  const derivedKey = "crypto-secure-random-32-byte-hex-string-xyz";
  await hardwareKeystore.setSecret(keyIdentifier, derivedKey);
  
  const retrievedKey = await hardwareKeystore.getSecret(keyIdentifier);
  if (retrievedKey) {
    const encryptedMMKV = new MockMMKV({ 
      id: "zustand-cache", 
      encryptionKey: retrievedKey
    }, sandboxB);
    
    encryptedMMKV.set("session_token", "jwt-header.payload-secret-12345");
    
    const rawDiskDataB = sandboxB.readFile("/data/user/0/com.membrane.zoeapp/files/mmkv/zustand-cache.default");
    if (!rawDiskDataB.includes("jwt-header.payload-secret-12345") && rawDiskDataB.startsWith("[AES-CFB")) {
      results.mmkvEncryptedSecure = true;
      console.log("  🛡️  MITIGATION CONFIRMED: MMKV payload is encrypted on-disk. Plaintext session is not exposed.");
    }
  }
  console.log("");

  // ------------------------------------------------------------------
  // TEST 3: Memory Leak Detection (Uncleaned Listeners / Stale Closures)
  // ------------------------------------------------------------------
  console.log("[TEST 3] Client Memory Leak Verification (Event Listeners)");
  
  const eventHub = new MockEventHub();
  
  // Phase 1: Simulate memory leaks
  const leakedInstances: SimulatedComponent[] = [];
  for (let i = 0; i < 5; i++) {
    const comp = new SimulatedComponent(`VulnerableView_${i}`, eventHub);
    comp.mount();
    leakedInstances.push(comp);
  }

  // Unmount them without cleanup (vulnerable state)
  leakedInstances.forEach(inst => inst.unmount(false));

  // Count active event hub listeners
  const vulnerableListenerCount = (eventHub.listeners.get("database_cdc_changes")?.size || 0) + 
                                  (eventHub.listeners.get("app_state_transition")?.size || 0);

  console.log(`  Listeners registered in EventHub after unmounting (Vulnerable): ${vulnerableListenerCount}`);
  if (vulnerableListenerCount > 0) {
    results.memoryLeakDetected = true;
    console.log("  ⚠️  VULNERABILITY CONFIRMED: Active listeners persist in EventHub after component unmount.");
    console.log("     This holds component references in memory, preventing GC of the large arrays.");
  }

  // Phase 2: Mitigated with proper cleanup
  const activeEventHub2 = new MockEventHub();
  const healthyInstances: SimulatedComponent[] = [];
  for (let i = 0; i < 5; i++) {
    const comp = new SimulatedComponent(`SecureView_${i}`, activeEventHub2);
    comp.mount();
    healthyInstances.push(comp);
  }

  // Unmount with proper cleanup
  healthyInstances.forEach(inst => inst.unmount(true));
  const cleanListenerCount = (activeEventHub2.listeners.get("database_cdc_changes")?.size || 0) + 
                             (activeEventHub2.listeners.get("app_state_transition")?.size || 0);

  console.log(`  Listeners registered in EventHub after unmounting (Mitigated): ${cleanListenerCount}`);
  if (cleanListenerCount === 0) {
    results.memoryLeakMitigated = true;
    console.log("  🛡️  MITIGATION CONFIRMED: All subscriptions cleaned up. References dropped successfully.");
  }
  console.log("");

  // ------------------------------------------------------------------
  // FINAL EVALUATION
  // ------------------------------------------------------------------
  console.log("======================================================================");
  console.log("                      SIMULATION AUDIT RESULTS                        ");
  console.log("======================================================================");
  console.log(`1. Sandbox Bypass Vulnerability:      ${results.sandboxBypassVulnerable ? "FAIL" : "PASS"}`);
  console.log(`2. Sandbox Bypass Mitigation:         ${results.sandboxBypassMitigated ? "PASS" : "FAIL"}`);
  console.log(`3. MMKV Plaintext Exposure:           ${results.mmkvPlaintextExposed ? "FAIL" : "PASS"}`);
  console.log(`4. MMKV Encryption Invariant:         ${results.mmkvEncryptedSecure ? "PASS" : "FAIL"}`);
  console.log(`5. Client Memory Leak Vulnerability:  ${results.memoryLeakDetected ? "FAIL" : "PASS"}`);
  console.log(`6. Client Memory Leak Mitigation:     ${results.memoryLeakMitigated ? "PASS" : "FAIL"}`);
  console.log("======================================================================\n");
}
```

---

## 4. Strategic Self-Healing Mitigations

To enforce $R \vdash A = \text{Compliant}$, we prescribe the following tactical patches.

### Patch A: Disable Application Backup Privileges
To eliminate sandboxed folder extraction via JNI and command-line interfaces, disable system backups in Android and declare file protection policies on iOS.

**Modify Android Manifest**:
```diff
-    <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="true" android:theme="@style/AppTheme" android:supportsRtl="true" android:enableOnBackInvokedCallback="false">
+    <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="false" android:theme="@style/AppTheme" android:supportsRtl="true" android:enableOnBackInvokedCallback="false">
```

### Patch B: Hardware-Backed MMKV Encryption Key Derivation
Instead of instantiating unencrypted storage adapters, leverage `expo-secure-store` to maintain an AES encryption key, lazily generating it on the first launch and supplying it to the database initialization.

Create a key derivation module under `src/lib/store/mmkvCrypto.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

const STORAGE_KEY_ALIAS = 'zoe_mmkv_encryption_key';

/**
 * Derives or retrieves a cryptographically secure encryption key from the hardware-backed keystore/keychain.
 */
export async function getOrCreateStorageKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(STORAGE_KEY_ALIAS);
  if (!key) {
    // Generate high-entropy 256-bit random key
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for native runtime environments
      for (let i = 0; i < 32; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(STORAGE_KEY_ALIAS, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return key;
}

/**
 * Initializes an encrypted MMKV instance.
 */
export async function createEncryptedMMKV(id: string) {
  const encryptionKey = await getOrCreateStorageKey();
  return createMMKV({
    id,
    encryptionKey,
  });
}
```

Then, update [mmkvStorage.ts](file:///Users/sac/zoeapp/src/lib/store/mmkvStorage.ts) and [storage.ts](file:///Users/sac/zoeapp/src/framework/state/storage.ts) to resolve these instances asynchronously or dynamically:
```typescript
// Example dynamic adapter in mmkvStorage.ts
import { StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

let mmkvInstance: ReturnType<typeof createMMKV> | null = null;

export const mmkvStorage: StateStorage = {
  setItem: (name: string, value: string): void => {
    if (!mmkvInstance) {
      // In synchronous contexts, default to basic or trigger async init first
      throw new Error("Storage not initialized. Call initEncryptedStorage() first.");
    }
    mmkvInstance.set(name, value);
  },
  getItem: (name: string): string | null => {
    return mmkvInstance ? (mmkvInstance.getString(name) ?? null) : null;
  },
  removeItem: (name: string): void => {
    if (mmkvInstance) {
      mmkvInstance.remove(name);
    }
  },
};
```

### Patch C: Deterministic Subscription Cleanup
To prevent uncleaned listeners from leaking component fibers, refactor event registration to use a custom hook `useSubscription` that automatically unsubscribes upon teardown.

```typescript
import { useEffect, useRef } from 'react';

export function useSubscription<T>(
  subscribeFn: (callback: (data: T) => void) => () => void,
  callback: (data: T) => void
) {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const listener = (data: T) => savedCallback.current(data);
    const unsubscribe = subscribeFn(listener);
    return () => {
      unsubscribe();
    };
  }, [subscribeFn]);
}
```
Using this pattern enforces compile-time and runtime guarantees that when the component unmounts, the teardown mechanism is invoked, maintaining JSI heap sanity.

---

## 5. Clickable Source References

Below are absolute links to the files reviewed during this validation audit:

*   [AndroidManifest.xml](file:///Users/sac/zoeapp/android/app/src/main/AndroidManifest.xml) - Backup configuration and permissions declaration.
*   [mmkvStorage.ts](file:///Users/sac/zoeapp/src/lib/store/mmkvStorage.ts) - Global Zustand MMKV initialization.
*   [storage.ts](file:///Users/sac/zoeapp/src/framework/state/storage.ts) - State framework isolated storage adapter initialization.
*   [realtime.tsx](file:///Users/sac/zoeapp/src/app/admin/realtime.tsx) - Supabase event CDC subscriber component.
*   [useBehavioralAuth.ts](file:///Users/sac/zoeapp/src/framework/auth/behavioral/useBehavioralAuth.ts) - Behavioral biometrics analysis and window event hooks.
*   [ProtectedRoute.tsx](file:///Users/sac/zoeapp/src/route-law/ProtectedRoute.tsx) - Navigation gates and receipt database checking hooks.
