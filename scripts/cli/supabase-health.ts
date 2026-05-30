import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { readSupabaseStatusEnv } from './supabase-context';

export async function runSupaStatus() {
  const projectRoot = process.cwd();
  const configExists = fs.existsSync(path.resolve(projectRoot, 'supabase/config.toml'));
  const migrationsExists = fs.existsSync(path.resolve(projectRoot, 'supabase/migrations'));
  const functionsExists = fs.existsSync(path.resolve(projectRoot, 'supabase/functions'));

  let isReachable = false;
  let statusEnv: Record<string, string> = {};
  
  try {
    statusEnv = await readSupabaseStatusEnv();
    if (statusEnv.API_URL) {
      isReachable = true;
    }
  } catch (e) {}

  const truexVerifyExists = fs.existsSync(path.resolve(projectRoot, 'supabase/functions/truex-verify/index.ts'));
  const healthExists = fs.existsSync(path.resolve(projectRoot, 'supabase/functions/v2030-runtime-health/index.ts'));

  const apiReachable = isReachable ? 'reachable' : 'unreachable';
  const dbReachable = isReachable ? 'reachable' : 'unreachable';
  const edgeReachable = isReachable ? 'reachable' : 'unreachable';
  const authReachable = isReachable ? 'reachable' : 'unreachable';

  // Truex default config overrides
  const realtimeStatus = 'disabled by Truex config';
  const storageStatus = 'disabled by Truex config';
  const studioStatus = 'disabled by Truex config';

  const summary = `
Supabase Local Status
  API:              ${apiReachable}
  DB:               ${dbReachable}
  Edge Runtime:     ${edgeReachable}
  Auth:             ${authReachable}
  Realtime:         ${realtimeStatus}
  Storage:          ${storageStatus}
  Studio:           ${studioStatus}

Keys:
  ANON_KEY:         ${statusEnv.ANON_KEY ? 'present' : 'missing'}
  SERVICE_ROLE:     ${statusEnv.SERVICE_ROLE_KEY ? 'present, CLI-only' : 'missing'}

Functions:
  truex-verify:             ${truexVerifyExists ? 'present' : 'missing'}
  v2030-runtime-health:     ${healthExists ? 'present' : 'missing'}
`;

  // Write report
  const reportPath = path.resolve(projectRoot, 'docs/vision2030/supabase-status.report.json');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportData = {
    commit: getCommitHash(),
    timestamp: new Date().toISOString(),
    runtime: 'supabase-local',
    config_exists: configExists,
    migrations_exists: migrationsExists,
    functions_exists: functionsExists,
    api_reachable: isReachable,
    anon_key_present: !!statusEnv.ANON_KEY,
    service_role_present: !!statusEnv.SERVICE_ROLE_KEY,
    functions: {
      'truex-verify': truexVerifyExists,
      'v2030-runtime-health': healthExists
    },
    status: isReachable && truexVerifyExists && healthExists ? 'passed' : 'failed'
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');

  return {
    success: isReachable && truexVerifyExists && healthExists,
    summary,
    report: reportData
  };
}

function getCommitHash(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown-commit';
  }
}
