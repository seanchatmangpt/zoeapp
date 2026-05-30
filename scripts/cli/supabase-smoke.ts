import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { readSupabaseStatusEnv } from './supabase-context';
import { generateReceiptHash } from '../../src/lib/crypto/receipts';

export async function runSupaSmoke(options: { remote: boolean }) {
  const projectRoot = process.cwd();
  
  // 1. Read Supabase environment
  let url = 'http://127.0.0.1:54321';
  let anonKey = '';
  let serviceRoleKey = '';

  if (options.remote) {
    // Read from .env.truex.local or process env
    const envTruexPath = path.resolve(projectRoot, '.env.truex.local');
    if (fs.existsSync(envTruexPath)) {
      const content = fs.readFileSync(envTruexPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('TRUEX_SUPABASE_URL=')) url = line.split('=')[1].trim();
        if (line.startsWith('TRUEX_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
        if (line.startsWith('TRUEX_SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
      }
    }
  } else {
    // Local stack env
    const statusEnv = await readSupabaseStatusEnv();
    url = statusEnv.API_URL || 'http://127.0.0.1:54321';
    anonKey = statusEnv.ANON_KEY || '';
    serviceRoleKey = statusEnv.SERVICE_ROLE_KEY || '';
  }

  if (!anonKey || !serviceRoleKey) {
    console.error(`
❌ Supabase credentials missing.
Run:
  npm run truex supa boot
  npm run truex supa env --write
`);
    process.exit(1);
  }

  const reports: Record<string, string> = {
    'v2030-runtime-health': 'failed',
    'truex-verify': 'failed',
    'receipt_insert': 'failed',
    'receipt_readback': 'failed'
  };

  // 2. Invoke v2030-runtime-health
  try {
    const res = await fetch(`${url}/functions/v1/v2030-runtime-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.ok) {
      reports['v2030-runtime-health'] = 'passed';
    }
  } catch (e) {}

  // 3. Invoke truex-verify with examples/out/truex_ocel2_valid.json
  try {
    const fixturePath = path.resolve(projectRoot, 'examples/out/truex_ocel2_valid.json');
    if (fs.existsSync(fixturePath)) {
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const res = await fetch(`${url}/functions/v1/truex-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixture)
      });
      if (res.ok) {
        reports['truex-verify'] = 'passed';
      }
    }
  } catch (e) {}

  // Initialize Supabase Client using service role
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const testReceiptId = 'rec-smoke-101';

  // 4. Insert a synthetic receipt row
  try {
    // Clear first to prevent primary key conflicts
    await supabase.from('actor_receipts').delete().eq('id', testReceiptId);

    const { error } = await supabase.from('actor_receipts').insert({
      id: testReceiptId,
      command_id: 'cmd-smoke-101',
      actor_ref: { kind: 'Sermon', id: 'sermon-smoke-101' },
      status: 'applied_remote',
      delta_hash: 'hash-smoke-101',
      event_ids: []
    });
    if (!error) {
      reports['receipt_insert'] = 'passed';
    }
  } catch (e) {}

  // 5. Read it back
  try {
    const { data, error } = await supabase
      .from('actor_receipts')
      .select('*')
      .eq('id', testReceiptId)
      .single();
    if (!error && data && data.id === testReceiptId) {
      reports['receipt_readback'] = 'passed';
    }
  } catch (e) {}

  // Clean up
  try {
    await supabase.from('actor_receipts').delete().eq('id', testReceiptId);
  } catch (e) {}

  // 6. Expo boundary leak scan
  let serviceRoleLeaked = false;
  let wasmLeaked = false;

  const srcDir = path.resolve(projectRoot, 'src');
  const scanDirectory = (dir: string) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(serviceRoleKey)) {
          serviceRoleLeaked = true;
        }
        if (content.includes('@wasm4pm') || content.includes('.wasm')) {
          wasmLeaked = true;
        }
      }
    }
  };

  if (fs.existsSync(srcDir)) {
    scanDirectory(srcDir);
  }

  // 7. Write report
  const reportPath = path.resolve(projectRoot, 'docs/vision2030/supabase-smoke.report.json');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const passed =
    reports['v2030-runtime-health'] === 'passed' &&
    reports['truex-verify'] === 'passed' &&
    reports['receipt_insert'] === 'passed' &&
    reports['receipt_readback'] === 'passed';

  const reportData = {
    commit: getCommitHash(),
    timestamp: new Date().toISOString(),
    status: passed ? 'passed' : 'failed',
    runtime: options.remote ? 'supabase-remote' : 'supabase-local',
    edge: {
      'v2030-runtime-health': reports['v2030-runtime-health'],
      'truex-verify': reports['truex-verify']
    },
    db: {
      receipt_insert: reports['receipt_insert'],
      receipt_readback: reports['receipt_readback']
    },
    authority: {
      service_role_write: reports['receipt_insert'],
      anon_public_invoke: reports['truex-verify']
    },
    boundary: {
      expo_service_role_leak: serviceRoleLeaked,
      expo_wasm_leak: wasmLeaked
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');

  if (passed) {
    console.log('✅ Supabase smoke test successfully passed!');
  } else {
    console.error('❌ Supabase smoke test failed.');
  }

  return reportData;
}

function getCommitHash(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown-commit';
  }
}

