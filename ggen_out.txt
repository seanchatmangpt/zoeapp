[2m2026-06-01T22:43:16.041699Z[0m [32m INFO[0m [2mggen_core::telemetry[0m[2m:[0m OpenTelemetry initialized [3mendpoint[0m[2m=[0mhttp://localhost:4317 [3mservice[0m[2m=[0mggen
[2m2026-06-01T22:43:16.045212Z[0m [33m WARN[0m [1mggen.cli[0m[1m{[0m[3mcommand[0m[2m=[0msync --dry_run true [3mversion[0m[2m=[0m"26.5.21"[1m}[0m[2m:[0m [2mggen_core::manifest::validation[0m[2m:[0m Inference rule 'normalize-cli-commands' CONSTRUCT query lacks ORDER BY - may produce non-deterministic results

[Quality Gate: Manifest Schema] ✓
[Quality Gate: Ontology Dependencies] ✓
[Quality Gate: SPARQL Validation] ✓
[Quality Gate: Template Validation] ✓
[Quality Gate: File Permissions] ✓
[Quality Gate: Rule Validation] ✓
[Quality Gate: DMAIC Phase 1: Define] ✓
[Quality Gate: DMAIC Phase 2: Measure] ✓
[Quality Gate: DMAIC Phase 3: Analyze] ✓
[Quality Gate: DMAIC Phase 4: Improve] ✓
[Quality Gate: DMAIC Phase 5: Control] ✓

All Gates: ✅ PASSED → Proceeding to generation phase

[DRY RUN] Would sync 65 files:
  src/cmds/generated.rs (would create)
  src/cmds/generated_revops.rs (would create)
  packages/types/zoela.ts (would create)
  supabase/migrations/20260519000002_zoela_admitted_tables.sql (would create)
  .ggen/audit/p0-a/zoela-refusals.sql (would create)
  supabase/migrations/20260519000003_zoela_admitted_columns.sql (would create)
  supabase/migrations/20260519000001_zoela_governance.sql (would create)
  supabase/migrations/20260519000005_zoela_legacy_coverage.sql (would create)
  supabase/migrations/20260519000004_zoela_admitted_rls.sql (would create)
  apps/mobile/package.json (would create)
  apps/mobile/app.json (would create)
  apps/mobile/tsconfig.json (would create)
  apps/mobile/babel.config.js (would create)
  apps/mobile/metro.config.js (would create)
  apps/mobile/App.tsx (would create)
  apps/mobile/src/lib/supabaseClient.ts (would create)
  apps/mobile/scripts/verify-supabase.mjs (would create)
  apps/mobile/README.md (would create)
  packages/schemas/zoela.ts (would create)
  packages/forms/zoela.tsx (would create)
  packages/evidence/OcelEvents.ts (would create)
  packages/screens/zoela.tsx (would create)
  packages/screens/adminScreens.tsx (would create)
  packages/navigation/zoela.tsx (would create)
  packages/types/pushCards.ts (would create)
  packages/evidence/ocelSchema.ts (would create)
  packages/screens/adminDetailScreen.tsx (would create)
  packages/navigation/navigationStack.tsx (would create)
  src/autoreceipt_law.rs (would create)
  src/autoreceipt_law.rs (would create)
  artifacts/ghf/terraform/repositories.tf (would create)
  artifacts/ghf/terraform/labels.tf (would create)
  artifacts/ghf/terraform/branch-protection.tf (would create)
  artifacts/ghf/terraform/environments.tf (would create)
  .github/workflows/receipt-verify.yml (would create)
  .github/workflows/contribution-ledger.yml (would create)
  .github/ISSUE_TEMPLATE/work-order.yml (would create)
  scripts/gh-create-issue.sh (would create)
  scripts/gh-create-pr.sh (would create)
  scripts/collect-github-evidence.sh (would create)
  artifacts/ghf/ocel/expected.ocel.jsonl (would create)
  docs/ghf-proof-matrix.md (would create)
  docs/weekly-ledger-template.md (would create)
  SECURITY.md (would create)
  packages/truex/{{ name | replace(from='@truex/', to='') }}/package.json (would create)
  packages/truex/verifier/index.ts (would create)
  packages/truex/ocel2/index.ts (would create)
  packages/truex/receipt/index.ts (would create)
  packages/truex/replay/index.ts (would create)
  packages/truex/vkg/index.ts (would create)
  packages/truex/cli/main.ts (would create)
  schemas/truex-receipt.v1.schema.json (would create)
  schemas/truex-boundary.v1.schema.json (would create)
  tests/truex-e2e-{{ label }}.test.ts (would create)
  tests/truex-summary-only-refusal.test.ts (would create)
  docs/truex-ecosystem.md (would create)
  receipts/manufacture-receipt.json (would create)
  pnpm-workspace.yaml (would create)
  package.json (would create)
  jest.config.js (would create)
  tsconfig.json (would create)
  src/wasm4pm_algos_stub.rs (would create)
  src/wasm4pm_cognition_stub.rs (would create)
  src/wasm4pm_stub.rs (would create)
  src/wasm4pm_types_stub.rs (would create)

Inference rules: ["normalize-cli-commands (order: 0)"]
Generation rules: ["cli-cmds -> src/cmds/generated.rs", "revops-stages -> src/cmds/generated_revops.rs", "zoela-mobile-types -> packages/types/zoela.ts", "zoela-public-materialization -> supabase/migrations/20260519000002_zoela_admitted_tables.sql", "zoela-materialization-refusals -> .ggen/audit/p0-a/zoela-refusals.sql", "zoela-materialization-columns -> supabase/migrations/20260519000003_zoela_admitted_columns.sql", "zoela-governance -> supabase/migrations/20260519000001_zoela_governance.sql", "zoela-legacy-coverage -> supabase/migrations/20260519000005_zoela_legacy_coverage.sql", "zoela-rls -> supabase/migrations/20260519000004_zoela_admitted_rls.sql", "zoela-expo-package-json -> apps/mobile/package.json", "zoela-expo-app-json -> apps/mobile/app.json", "zoela-expo-tsconfig -> apps/mobile/tsconfig.json", "zoela-expo-babel-config -> apps/mobile/babel.config.js", "zoela-expo-metro-config -> apps/mobile/metro.config.js", "zoela-expo-app-entry -> apps/mobile/App.tsx", "zoela-expo-supabase-client -> apps/mobile/src/lib/supabaseClient.ts", "zoela-expo-verify-supabase -> apps/mobile/scripts/verify-supabase.mjs", "zoela-expo-readme -> apps/mobile/README.md", "zoela-mobile-zod -> packages/schemas/zoela.ts", "zoela-forms -> packages/forms/zoela.tsx", "zoela-ocel -> packages/evidence/OcelEvents.ts", "zoela-screens -> packages/screens/zoela.tsx", "zoela-admin-screens -> packages/screens/adminScreens.tsx", "zoela-navigation -> packages/navigation/zoela.tsx", "zoela-push-cards -> packages/types/pushCards.ts", "zoela-ocel-schema -> packages/evidence/ocelSchema.ts", "zoela-admin-detail -> packages/screens/adminDetailScreen.tsx", "zoela-nav-stack -> packages/navigation/navigationStack.tsx", "autoreceipt-law -> src/autoreceipt_law.rs", "zoela-autoreceipt-law -> src/autoreceipt_law.rs", "ghf-terraform-repositories -> artifacts/ghf/terraform/repositories.tf", "ghf-terraform-labels -> artifacts/ghf/terraform/labels.tf", "ghf-terraform-branch-protection -> artifacts/ghf/terraform/branch-protection.tf", "ghf-terraform-environments -> artifacts/ghf/terraform/environments.tf", "ghf-github-receipt-verify -> .github/workflows/receipt-verify.yml", "ghf-github-contribution-ledger -> .github/workflows/contribution-ledger.yml", "ghf-github-issue-template -> .github/ISSUE_TEMPLATE/work-order.yml", "ghf-script-create-issue -> scripts/gh-create-issue.sh", "ghf-script-create-pr -> scripts/gh-create-pr.sh", "ghf-script-collect-evidence -> scripts/collect-github-evidence.sh", "ghf-ocel-expected -> artifacts/ghf/ocel/expected.ocel.jsonl", "ghf-proof-matrix -> docs/ghf-proof-matrix.md", "ghf-weekly-ledger -> docs/weekly-ledger-template.md", "ghf-security-md -> SECURITY.md", "truex-packages -> packages/truex/{{ name | replace(from='@truex/', to='') }}/package.json", "truex-verifier-src -> packages/truex/verifier/index.ts", "truex-ocel2-src -> packages/truex/ocel2/index.ts", "truex-receipt-src -> packages/truex/receipt/index.ts", "truex-replay-src -> packages/truex/replay/index.ts", "truex-vkg-src -> packages/truex/vkg/index.ts", "truex-cli-src -> packages/truex/cli/main.ts", "truex-schema-receipt -> schemas/truex-receipt.v1.schema.json", "truex-schema-boundary -> schemas/truex-boundary.v1.schema.json", "truex-test-e2e -> tests/truex-e2e-{{ label }}.test.ts", "truex-test-refusal -> tests/truex-summary-only-refusal.test.ts", "truex-docs -> docs/truex-ecosystem.md", "truex-manufacture-receipt -> receipts/manufacture-receipt.json", "truex-pnpm-workspace -> pnpm-workspace.yaml", "truex-root-package -> package.json", "truex-jest-config -> jest.config.js", "truex-tsconfig -> tsconfig.json", "wasm4pm-algos-stub -> src/wasm4pm_algos_stub.rs", "wasm4pm-cognition-stub -> src/wasm4pm_cognition_stub.rs", "wasm4pm-stub -> src/wasm4pm_stub.rs", "wasm4pm-types-stub -> src/wasm4pm_types_stub.rs"]
{"duration_ms":32,"files":[{"action":"would create","path":"src/cmds/generated.rs","rule":"cli-cmds","size_bytes":0},{"action":"would create","path":"src/cmds/generated_revops.rs","rule":"revops-stages","size_bytes":0},{"action":"would create","path":"packages/types/zoela.ts","rule":"zoela-mobile-types","size_bytes":0},{"action":"would create","path":"supabase/migrations/20260519000002_zoela_admitted_tables.sql","rule":"zoela-public-materialization","size_bytes":0},{"action":"would create","path":".ggen/audit/p0-a/zoela-refusals.sql","rule":"zoela-materialization-refusals","size_bytes":0},{"action":"would create","path":"supabase/migrations/20260519000003_zoela_admitted_columns.sql","rule":"zoela-materialization-columns","size_bytes":0},{"action":"would create","path":"supabase/migrations/20260519000001_zoela_governance.sql","rule":"zoela-governance","size_bytes":0},{"action":"would create","path":"supabase/migrations/20260519000005_zoela_legacy_coverage.sql","rule":"zoela-legacy-coverage","size_bytes":0},{"action":"would create","path":"supabase/migrations/20260519000004_zoela_admitted_rls.sql","rule":"zoela-rls","size_bytes":0},{"action":"would create","path":"apps/mobile/package.json","rule":"zoela-expo-package-json","size_bytes":0},{"action":"would create","path":"apps/mobile/app.json","rule":"zoela-expo-app-json","size_bytes":0},{"action":"would create","path":"apps/mobile/tsconfig.json","rule":"zoela-expo-tsconfig","size_bytes":0},{"action":"would create","path":"apps/mobile/babel.config.js","rule":"zoela-expo-babel-config","size_bytes":0},{"action":"would create","path":"apps/mobile/metro.config.js","rule":"zoela-expo-metro-config","size_bytes":0},{"action":"would create","path":"apps/mobile/App.tsx","rule":"zoela-expo-app-entry","size_bytes":0},{"action":"would create","path":"apps/mobile/src/lib/supabaseClient.ts","rule":"zoela-expo-supabase-client","size_bytes":0},{"action":"would create","path":"apps/mobile/scripts/verify-supabase.mjs","rule":"zoela-expo-verify-supabase","size_bytes":0},{"action":"would create","path":"apps/mobile/README.md","rule":"zoela-expo-readme","size_bytes":0},{"action":"would create","path":"packages/schemas/zoela.ts","rule":"zoela-mobile-zod","size_bytes":0},{"action":"would create","path":"packages/forms/zoela.tsx","rule":"zoela-forms","size_bytes":0},{"action":"would create","path":"packages/evidence/OcelEvents.ts","rule":"zoela-ocel","size_bytes":0},{"action":"would create","path":"packages/screens/zoela.tsx","rule":"zoela-screens","size_bytes":0},{"action":"would create","path":"packages/screens/adminScreens.tsx","rule":"zoela-admin-screens","size_bytes":0},{"action":"would create","path":"packages/navigation/zoela.tsx","rule":"zoela-navigation","size_bytes":0},{"action":"would create","path":"packages/types/pushCards.ts","rule":"zoela-push-cards","size_bytes":0},{"action":"would create","path":"packages/evidence/ocelSchema.ts","rule":"zoela-ocel-schema","size_bytes":0},{"action":"would create","path":"packages/screens/adminDetailScreen.tsx","rule":"zoela-admin-detail","size_bytes":0},{"action":"would create","path":"packages/navigation/navigationStack.tsx","rule":"zoela-nav-stack","size_bytes":0},{"action":"would create","path":"src/autoreceipt_law.rs","rule":"autoreceipt-law","size_bytes":0},{"action":"would create","path":"src/autoreceipt_law.rs","rule":"zoela-autoreceipt-law","size_bytes":0},{"action":"would create","path":"artifacts/ghf/terraform/repositories.tf","rule":"ghf-terraform-repositories","size_bytes":0},{"action":"would create","path":"artifacts/ghf/terraform/labels.tf","rule":"ghf-terraform-labels","size_bytes":0},{"action":"would create","path":"artifacts/ghf/terraform/branch-protection.tf","rule":"ghf-terraform-branch-protection","size_bytes":0},{"action":"would create","path":"artifacts/ghf/terraform/environments.tf","rule":"ghf-terraform-environments","size_bytes":0},{"action":"would create","path":".github/workflows/receipt-verify.yml","rule":"ghf-github-receipt-verify","size_bytes":0},{"action":"would create","path":".github/workflows/contribution-ledger.yml","rule":"ghf-github-contribution-ledger","size_bytes":0},{"action":"would create","path":".github/ISSUE_TEMPLATE/work-order.yml","rule":"ghf-github-issue-template","size_bytes":0},{"action":"would create","path":"scripts/gh-create-issue.sh","rule":"ghf-script-create-issue","size_bytes":0},{"action":"would create","path":"scripts/gh-create-pr.sh","rule":"ghf-script-create-pr","size_bytes":0},{"action":"would create","path":"scripts/collect-github-evidence.sh","rule":"ghf-script-collect-evidence","size_bytes":0},{"action":"would create","path":"artifacts/ghf/ocel/expected.ocel.jsonl","rule":"ghf-ocel-expected","size_bytes":0},{"action":"would create","path":"docs/ghf-proof-matrix.md","rule":"ghf-proof-matrix","size_bytes":0},{"action":"would create","path":"docs/weekly-ledger-template.md","rule":"ghf-weekly-ledger","size_bytes":0},{"action":"would create","path":"SECURITY.md","rule":"ghf-security-md","size_bytes":0},{"action":"would create","path":"packages/truex/{{ name | replace(from='@truex/', to='') }}/package.json","rule":"truex-packages","size_bytes":0},{"action":"would create","path":"packages/truex/verifier/index.ts","rule":"truex-verifier-src","size_bytes":0},{"action":"would create","path":"packages/truex/ocel2/index.ts","rule":"truex-ocel2-src","size_bytes":0},{"action":"would create","path":"packages/truex/receipt/index.ts","rule":"truex-receipt-src","size_bytes":0},{"action":"would create","path":"packages/truex/replay/index.ts","rule":"truex-replay-src","size_bytes":0},{"action":"would create","path":"packages/truex/vkg/index.ts","rule":"truex-vkg-src","size_bytes":0},{"action":"would create","path":"packages/truex/cli/main.ts","rule":"truex-cli-src","size_bytes":0},{"action":"would create","path":"schemas/truex-receipt.v1.schema.json","rule":"truex-schema-receipt","size_bytes":0},{"action":"would create","path":"schemas/truex-boundary.v1.schema.json","rule":"truex-schema-boundary","size_bytes":0},{"action":"would create","path":"tests/truex-e2e-{{ label }}.test.ts","rule":"truex-test-e2e","size_bytes":0},{"action":"would create","path":"tests/truex-summary-only-refusal.test.ts","rule":"truex-test-refusal","size_bytes":0},{"action":"would create","path":"docs/truex-ecosystem.md","rule":"truex-docs","size_bytes":0},{"action":"would create","path":"receipts/manufacture-receipt.json","rule":"truex-manufacture-receipt","size_bytes":0},{"action":"would create","path":"pnpm-workspace.yaml","rule":"truex-pnpm-workspace","size_bytes":0},{"action":"would create","path":"package.json","rule":"truex-root-package","size_bytes":0},{"action":"would create","path":"jest.config.js","rule":"truex-jest-config","size_bytes":0},{"action":"would create","path":"tsconfig.json","rule":"truex-tsconfig","size_bytes":0},{"action":"would create","path":"src/wasm4pm_algos_stub.rs","rule":"wasm4pm-algos-stub","size_bytes":0},{"action":"would create","path":"src/wasm4pm_cognition_stub.rs","rule":"wasm4pm-cognition-stub","size_bytes":0},{"action":"would create","path":"src/wasm4pm_stub.rs","rule":"wasm4pm-stub","size_bytes":0},{"action":"would create","path":"src/wasm4pm_types_stub.rs","rule":"wasm4pm-types-stub","size_bytes":0}],"files_synced":0,"generation_rules_executed":0,"inference_rules_executed":0,"receipt_path":".ggen/receipts/latest.json","status":"success"}
[2m2026-06-01T22:43:16.082411Z[0m [31mERROR[0m [2mopentelemetry_sdk[0m[2m:[0m  [3mname[0m[2m=[0m"BatchSpanProcessor.ExportError" [3merror[0m[2m=[0m"Operation failed: code: 'The service is currently unavailable', message: \"tcp connect error\", source: tonic::transport::Error(Transport, ConnectError(ConnectError(\"tcp connect error\", 127.0.0.1:4317, Os { code: 61, kind: ConnectionRefused, message: \"Connection refused\" })))"
