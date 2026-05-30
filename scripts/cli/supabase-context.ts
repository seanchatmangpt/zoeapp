import { defineCittyPlugin } from 'citty';
import { execSync } from 'child_process';
import { resolve } from 'path';

export interface SupaContext {
  projectRoot: string;
  supabaseDir: string;
  envPath: string;
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  statusEnv?: Record<string, string>;
}

export async function readSupabaseStatusEnv(): Promise<Record<string, string>> {
  try {
    const stdout = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return Object.fromEntries(
      stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.includes('='))
        .map((line) => {
          const [key, ...rest] = line.split('=');
          let val = rest.join('=');
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          }
          return [key.trim(), val.trim()];
        })
    );
  } catch (err) {
    return {};
  }
}

export function createSupabaseContext(projectRoot = process.cwd()): SupaContext {
  return {
    projectRoot,
    supabaseDir: resolve(projectRoot, 'supabase'),
    envPath: resolve(projectRoot, '.env.truex.local'),
  };
}

export const supaPlugin = defineCittyPlugin({
  name: 'truex-supabase-context',
  async setup(ctx) {
    const supa = createSupabaseContext();
    try {
      const statusEnv = await readSupabaseStatusEnv();
      supa.statusEnv = statusEnv;
      supa.url = statusEnv.API_URL || 'http://127.0.0.1:54321';
      supa.anonKey = statusEnv.ANON_KEY;
      supa.serviceRoleKey = statusEnv.SERVICE_ROLE_KEY;
    } catch (e) {}
    (ctx as any).supa = supa;
  },
});
export default supaPlugin;
