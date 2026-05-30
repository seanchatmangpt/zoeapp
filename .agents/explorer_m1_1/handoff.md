# Handoff Report: Truex Architectural Rebranding Discovery & Analysis

This report documents all locations, references, files, and imports that need renaming as part of the Truex rebranding.

## 1. Observation

### Target 1: "zoeapp" References, File Paths, and Imports
We searched the codebase for "zoeapp" and found the following matches:

*   **`app.json`**
    *   Line 18: `"bundleIdentifier": "com.truex.zoeapp"`
    *   Line 25: `"package": "com.truex.zoeapp"`
*   **`src/lib/db/db.ts`**
    *   Line 5: `export const DATABASE_NAME = 'zoeapp.db';`
*   **`src/lib/store/mmkvStorage.ts`**
    *   Line 6: `id: 'zoeapp-zustand-storage',`
*   **`android/app/build.gradle`**
    *   Line 90: `namespace 'com.truex.zoeapp'`
    *   Line 92: `applicationId 'com.truex.zoeapp'`
*   **`android/app/src/main/java/com/truex/zoeapp/MainActivity.kt`**
    *   Line 1: `package com.truex.zoeapp`
*   **`android/app/src/main/java/com/truex/zoeapp/MainApplication.kt`**
    *   Line 1: `package com.truex.zoeapp`
*   **`ios/ExpoSupabaseAITemplate.xcodeproj/project.pbxproj`**
    *   Line 373: `PRODUCT_BUNDLE_IDENTIFIER = com.truex.zoeapp;`
    *   Line 405: `PRODUCT_BUNDLE_IDENTIFIER = com.truex.zoeapp;`
*   **`ios/ExpoSupabaseAITemplate/Info.plist`**
    *   Line 31: `<string>com.truex.zoeapp</string>`
*   **Maestro configuration files (`.maestro/*.yaml`)**
    *   `.maestro/avatar-projection.yaml` Line 1: `appId: com.truex.zoeapp`
    *   `.maestro/hook-lifecycle.yaml` Line 1: `appId: com.truex.zoeapp`
    *   `.maestro/hook-otp-lifecycle.yaml` Line 1: `appId: com.truex.zoeapp`
    *   `.maestro/offline-reconcile.yaml` Line 1: `appId: com.truex.zoeapp`
    *   `.maestro/quarantine-repair.yaml` Line 1: `appId: com.truex.zoeapp`
    *   `.maestro/supervisor-flood.yaml` Line 1: `appId: com.truex.zoeapp`
    *   `.maestro/truex_min.yaml` Line 1: `appId: com.truex.zoeapp`
*   **`PROJECT.md`**
    *   Line 4: ``zoeapp` is an Expo/React Native application acting as an operational membrane...`
*   **`TRUEX-REBRAND-zoeapp.md`**
    *   Line 1: `# TRUEX ARCHITECTURAL REBRAND: zoeapp`
    *   Line 17: ``zoeapp` was built because executing process algorithms...`
    *   Line 19: `... Without a unified membrane, workers perform tasks out-of-band, rendering process conformance impossible. `zoeapp` captures intent *before* it settles, routing it to the Truex Kernel for admission.`
    *   Line 31: `... If the remote edge rejects the envelope (`RECEIPT_REFUSED`), `zoeapp` must emit a local rollback to preserve UI/Execution parity.`
    *   Line 37: ``zoeapp` handles the boundaries of the lifecycle:`
    *   Line 41: `... Once the Truex Kernel processes the closure, `zoeapp` handles **Projection** (displaying the admissible state). ...`
    *   Line 63: `* `zoeapp` → `@truex/membrane-client``
    *   Line 101: ``zoeapp` evolves into the definitive **Truex Field Operator Client**—a universal shell. ...`
    *   Line 106: `This repository is not fundamentally a frontend React Native application.`
*   **`ORIGINAL_REQUEST.md`**
    *   Line 5: `Complete the Truex architectural rebranding and missing invariants for the `zoeapp` codebase.`
    *   Line 14: `   - `zoeapp` → `@truex/membrane-client``
    *   Line 40: `- [ ] No occurrences of old terms "User Interface", "Offline Queue", or "Dashboard" remain in the codebase (case-insensitive, except where strictly required by third-party APIs).`
    *   Line 41: `- [ ] No occurrences of `@seanchatmangpt/` dependencies remain in `package.json` or source imports.`

**File/Directory paths matching `zoeapp`:**
*   Directory: `android/app/src/main/java/com/truex/zoeapp`
*   File: `TRUEX-REBRAND-zoeapp.md`

---

### Target 2: "maestro/actor" References, File Paths, and Imports
We searched the codebase for "maestro/actor" and found the following matches:

*   **`scripts/truex.ts`**
    *   Line 231: `const maestroPath = getPath('maestro/actor');`
    *   Line 262: `consola.error('Missing maestro/actor directory');`
*   **`TRUEX-REBRAND-zoeapp.md`**
    *   Line 28: `* **`μ` (Manufacturing Function):** The Truex autonomic dispatchers inside the app (`maestro/actor` definitions) that format the raw state into canonical OCEL 2.0 payloads.`
    *   Line 64: `* `maestro/actor` → `maestro/truex-geometry``

**File/Directory paths matching `maestro/actor`:**
*   Directory: `maestro/actor` (containing the files: `00_boot.yaml`, `01_publish_sermon_local_success.yaml`, `02_publish_sermon_unauthorized.yaml`, `03_publish_sermon_invalid_schema.yaml`, `04_offline_outbox_replay.yaml`, `05_remote_rejection_reconciliation.yaml`, `06_process_intelligence.yaml`)

---

### Target 3: "scripts/truex.ts" File Paths and Codebase References
We searched the codebase for references to `scripts/truex.ts` or `truex.ts`:

*   **`package.json`**
    *   Line 19: `"truex": "tsx scripts/truex.ts",`
*   **`README.md`**
    *   Line 7: `- \`npm run truex verify\` -> runs the custom verification CLI (defined in \`scripts/truex.ts\`)`
*   **`TRUEX-REBRAND-zoeapp.md`**
    *   Line 65: `* `scripts/truex.ts` → `scripts/dispatch.ts``
*   **`ORIGINAL_REQUEST.md`**
    *   Line 16: `   - `scripts/truex.ts` → `scripts/dispatch.ts``
*   **`scripts/run_scaffold.sh`**
    *   Line 4: `rm -f scripts/truex.next.ts ... scripts/cli/commands/truex.ts ...`
    *   Line 10: `npx hypergen action citty-root --name=truex --out=scripts/truex.next.ts ...`
    *   Line 17: `npx hypergen action citty-command --name=truex --exportName=truexCommand --out=scripts/cli/commands/truex.ts --description="Truex command" $CMD_OPTS`
    *   Line 28: `for cmd in doctor wizard telco explain truex replay pack edge smoke supa; do`
    *   Line 29: `npx hypergen action citty-subcommand --parentFile=scripts/truex.next.ts --childName=$cmd --childExport=${cmd}Command --childOut=scripts/cli/commands/${cmd}.ts --description="${cmd} command" --lazy=true`

**Files to be renamed:**
*   `scripts/truex.ts`
*   `scripts/cli/commands/truex.ts` (Note: Subcommand CLI file containing definition of "truexCommand")

---

### Target 4: Occurrences of Old Terms (Case-Insensitive)

#### 1. "User Interface" (to be replaced with "Avatar-Relative Projection")
*   **`src/app/(tabs)/openai.tsx`**
    *   Line 17: ` * Provides a user interface for AI chat interactions`

#### 2. "Screen" (to be replaced with "Avatar-Relative Projection")
*Note: We exclude standard React Navigation / Expo Router system imports and API components such as `<Stack.Screen />`, `<Tabs.Screen />`, or `screenOptions` since they are strictly required by third-party APIs. Only application-level mentions of the word are listed below.*

*   **`src/app/(auth)/index.tsx`**
    *   Line 2: ` * @fileoverview Authentication Screen`
    *   Line 29: ` * @returns {JSX.Element} The authentication screen`
*   **`src/app/(tabs)/__tests__/hooks-screen.test.tsx`** (File name contains "screen", to be renamed to `hooks-projection.test.tsx`)
    *   Line 4: `import HooksScreen from '../hooks';`
    *   Line 6: `describe('Truex Hooks Screen View', () => {`
    *   Line 23: `        <HooksScreen />`
*   **`src/app/(tabs)/account.tsx`**
    *   Line 2: ` * @fileoverview Account Management Screen`
    *   Line 21: ` * @returns {JSX.Element} The account management screen`
*   **`src/app/(tabs)/hooks.tsx`**
    *   Line 8: `export default function HooksScreen() {`
*   **`src/app/(tabs)/index.tsx`**
    *   Line 2: ` * @fileoverview Home Screen Component`
    *   Line 3: ` * The main dashboard screen that welcomes users...`
    *   Line 16: ` * Home screen component - main dashboard of the application`
    *   Line 20: ` * @returns {JSX.Element} The home screen with welcome message...`
    *   Line 24: ` * <HomeScreen />`
    *   Line 26: `export default function HomeScreen() {`
*   **`src/app/(tabs)/openai.tsx`**
    *   Line 2: ` * @fileoverview OpenAI Assistant Screen`
    *   Line 16: ` * OpenAI Assistant screen component`
    *   Line 20: ` * @returns {JSX.Element} The OpenAI assistant screen`
    *   Line 24: ` * <OpenAIScreen />`
    *   Line 26: `export default function OpenAIScreen() {`
*   **`src/app/+not-found.tsx`**
    *   Line 4: `export default function NotFoundScreen() {`
*   **`src/app/_layout.tsx`** (Comments about loading screens)
    *   Line 25: `// Prevent the splash screen from auto-hiding before asset loading...`
    *   Line 28: `function SplashScreenController() {`
    *   Line 41: `    // Only hide splash screen when BOTH fonts AND session...`
    *   Line 47: `  // Show loading screen until everything is ready`
*   **`src/components/EditScreenInfo.tsx`** (File name contains "Screen", to be renamed to `EditProjectionInfo.tsx`)
    *   Line 7: `export default function EditScreenInfo({ path }: { path: string }) {`
    *   Line 11: `        <Text className="text-lg text-center">Open up the code for this screen:</Text>`
*   **`docs/vision2030/avatar-relative-hooks-usecases.md`**
    *   Line 5: `... developers build separate screens and APIs for admins, pastors, and members.`
    *   Line 24: `| **Member** | "Help needed this Sunday" banner on the home screen. | ...`

#### 3. "API Call" (to be replaced with "Propagation Trigger")
*   **`src/app/(tabs)/openai.tsx`**
    *   Line 33: `  /** Loading state during API calls */`
    *   Line 42: `   * @throws {Error} When prompt is empty or API call fails`
*   **`supabase/functions/openai/index.ts`**
    *   Line 15: ` * Request interface for OpenAI API calls`
    *   Line 24: ` * Response interface for successful OpenAI API calls`

#### 4. "Offline Queue" (to be replaced with "Admissibility Backlog")
*   **`src/app/admin/actor-lab.tsx`**
    *   Line 184: `        <AdminCard title="Trigger Outbox Sync Replay" subtitle="Manually push offline queue items up to Server Authority">`

#### 5. "Dashboard" (to be replaced with "Consequence Supervision")
*   **`src/app/(tabs)/index.tsx`**
    *   Line 3: ` * The main dashboard screen...`
    *   Line 16: ` * Home screen component - main dashboard...`
    *   Line 94: `          <Link href={"/admin/dashboard" as any} asChild>`
*   **`src/app/admin/_layout.tsx`**
    *   Line 13: `      <Stack.Screen name="dashboard" />`
*   **`src/app/admin/dashboard.tsx`** (File name contains "dashboard", to be renamed to `consequence-supervision.tsx`)
    *   Line 15: `export default function AdminDashboard() {`
    *   Line 110: `    { name: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard', color: '#3B82F6' },`
    *   Line 128: `    <AdminShell title="ActorOps Console" subtitle="Authoritative Command Engine Admin Dashboard" scrollable={true}>`
*   **`src/app/admin/index.tsx`**
    *   Line 5: `  return <Redirect href={"/admin/dashboard" as any} />;`
*   **`src/components/admin/AdminShell.tsx`**
    *   Line 20: `      router.replace('/admin/dashboard' as any);`
*   **`docs/vision2030/avatar-vkg-thesis.md`**
    *   Line 110: `Classical applications create separate dashboards, APIs...`
    *   Line 189: `... transformed workflow systems, process engines, applications, dashboards, role systems...`
*   **`docs/vision2030/truex-collaborative-intelligence.md`**
    *   Line 32: `... or a dashboard layer.`
    *   Line 47: `- dashboards fossilize assumptions,`
    *   Line 271: `- Process intelligence outranks dashboard intelligence.`

---

## 2. Logic Chain
1. **Search Phase:** We executed case-insensitive `grep_search` and `find_by_name` across all codebase files, templates, scripts, configurations, and documentation.
2. **Identification Phase:**
   * Found "zoeapp" primarily in bundle identifiers (`app.json`, `build.gradle`, plist files), the database name `zoeapp.db`, zustand store key, and Maestro test files `appId`.
   * Found "maestro/actor" as a directory in the workspace root, checked its contents, and identified two exact references in `scripts/truex.ts`.
   * Found `scripts/truex.ts` and its associated cli subcommand `scripts/cli/commands/truex.ts`. Tracked down script references in `package.json`, `README.md`, and `scripts/run_scaffold.sh`.
   * Located occurrences of old terms in comments, JSDoc, UI strings, and file names (like `hooks-screen.test.tsx` and `dashboard.tsx`).
3. **Synthesis Phase:** Distinguished system components (e.g. `<Stack.Screen />` or `react-native-screens` dependencies) which should not be modified, from application components (e.g. `HooksScreen`) and documentation where terms must be updated.

---

## 3. Caveats
* **Third-Party Exclusions:** Expo Router's `<Stack.Screen>` and `<Tabs.Screen>` elements, along with `screenOptions` props, must remain unchanged since they are part of the external React Native / Expo APIs.
* **Maestro flows:** Rebranding `com.truex.zoeapp` to `@truex/membrane-client` means we must update `appId` in the YAML flows under `.maestro/` to match the new bundle identifier configured in `app.json`.
* **Path hierarchy:** Renaming the Java package path `com/truex/zoeapp` in `android/app/src/main/java/` will require moving `MainActivity.kt` and `MainApplication.kt` to the new path matching the rebranded package name.

---

## 4. Conclusion
* **Read-only analysis is complete.** All target renaming locations have been exhaustively logged.
* In the next step (Milestone 2), the implementer should perform renaming of files, directories, imports, and old terminology using the precise line and file locations mapped above.

---

## 5. Verification Method
1. To verify the old terms are gone post-rebranding, run:
   ```bash
   grep -rn -i "zoeapp" --exclude-dir={.git,node_modules,.agents} /Users/sac/zoeapp
   grep -rn -i "maestro/actor" --exclude-dir={.git,node_modules,.agents} /Users/sac/zoeapp
   find /Users/sac/zoeapp -name "*truex.ts"
   grep -rn -i "User Interface" --exclude-dir={.git,node_modules,.agents} /Users/sac/zoeapp
   grep -rn -i "Offline Queue" --exclude-dir={.git,node_modules,.agents} /Users/sac/zoeapp
   ```
2. Verify package tests, typecheck, and lint pass:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```
