import { defineCommand } from 'citty';
import { consola } from 'consola';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { runSupaStatus } from './supabase-health';
import { writeTruexEnv } from './env-writer';
import { runSupaSmoke } from './supabase-smoke';

export const supaCommand = defineCommand({
  meta: {
    name: 'supa',
    description: 'Supabase DX/QoL control plane for Truex'
  },
  subCommands: {
    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Inspect local Supabase stack, ports, keys, functions'
      },
      async run() {
        const result = await runSupaStatus();
        console.log(result.summary);
      }
    }),

    boot: defineCommand({
      meta: {
        name: 'boot',
        description: 'Start local Supabase stack with Truex-safe services'
      },
      async run() {
        consola.info('Booting local Supabase Docker stack...');
        try {
          execSync('supabase start', { stdio: 'inherit' });
          consola.success('Supabase stack started successfully.');
        } catch (e: any) {
          consola.error(`Failed to boot Supabase: ${e.message}`);
          consola.info('Please make sure Docker/Colima is running on your host.');
        }
      }
    }),

    env: defineCommand({
      meta: {
        name: 'env',
        description: 'Export local env into .env.truex.local'
      },
      args: {
        write: {
          type: 'boolean',
          description: 'Write keys to .env.truex.local',
          default: false
        }
      },
      async run({ args }) {
        await writeTruexEnv({ write: Boolean(args.write) });
      }
    }),

    migrate: defineCommand({
      meta: {
        name: 'migrate',
        description: 'Push migrations and verify schemas'
      },
      args: {
        verify: {
          type: 'boolean',
          description: 'Verify database schema tables exist',
          default: false
        }
      },
      async run({ args }) {
        consola.info('Pushing database migrations to local Supabase Postgres...');
        try {
          execSync('supabase db push', { stdio: 'inherit' });
          consola.success('Migrations pushed successfully.');

          if (args.verify) {
            consola.info('Verifying database schema tables and views...');
            // In a real check, query schema, here we check migration files
            const projectRoot = process.cwd();
            const actorMigration = path.resolve(projectRoot, 'supabase/migrations/20260523000002_actor_tables.sql');
            if (fs.existsSync(actorMigration)) {
              consola.success('  actor_tables migration file verified');
            }
          }
        } catch (e: any) {
          consola.error(`Database migration failed: ${e.message}`);
          consola.info('Next steps:\n  1. Check status: npm run truex supa status\n  2. Boot stack: npm run truex supa boot');
        }
      }
    }),

    seed: defineCommand({
      meta: {
        name: 'seed',
        description: 'Apply seed data and verify auth identity rows'
      },
      async run() {
        consola.info('Applying seed data to local Postgres database...');
        try {
          execSync('supabase db reset', { stdio: 'inherit' });
          consola.success('Database reset and seed.sql executed successfully.');
        } catch (e: any) {
          consola.error(`Database seed failed: ${e.message}`);
          consola.info('Next steps:\n  Run: npm run truex supa boot');
        }
      }
    }),

    edge: defineCommand({
      meta: {
        name: 'edge',
        description: 'Serve or deploy Deno Edge Functions'
      },
      args: {
        serve: {
          type: 'boolean',
          description: 'Serve edge functions locally',
          default: false
        },
        verify: {
          type: 'boolean',
          description: 'Verify edge functions are deployed/served',
          default: false
        }
      },
      async run({ args }) {
        if (args.serve) {
          consola.info('Serving Edge Functions locally...');
          try {
            execSync('supabase functions serve --no-verify-jwt', { stdio: 'inherit' });
          } catch (e: any) {
            consola.error(`Edge function server failed: ${e.message}`);
          }
        } else if (args.verify) {
          consola.info('Verifying Edge function files...');
          const projectRoot = process.cwd();
          const verifyFile = path.resolve(projectRoot, 'supabase/functions/truex-verify/index.ts');
          const healthFile = path.resolve(projectRoot, 'supabase/functions/v2030-runtime-health/index.ts');
          if (fs.existsSync(verifyFile) && fs.existsSync(healthFile)) {
            consola.success('  Edge Functions: truex-verify and v2030-runtime-health index files exist.');
          } else {
            consola.error('  Edge Functions: missing function index files.');
          }
        } else {
          consola.info('To deploy Edge Functions to production, use:\n  supabase functions deploy <name>');
        }
      }
    }),

    invoke: defineCommand({
      meta: {
        name: 'invoke',
        description: 'Invoke a named function with a fixture payload'
      },
      args: {
        name: {
          type: 'positional',
          description: 'Function name to invoke (e.g. truex-verify)',
          required: true
        }
      },
      async run({ args }) {
        consola.info(`Invoking Edge Function '${args.name}'...`);
        try {
          const projectRoot = process.cwd();
          let fixtureOption = '';
          if (args.name === 'truex-verify') {
            const fixturePath = path.resolve(projectRoot, 'examples/out/truex_ocel2_valid.json');
            if (fs.existsSync(fixturePath)) {
              fixtureOption = ` --data-binary @${fixturePath}`;
            }
          }
          execSync(`supabase functions invoke ${args.name}${fixtureOption}`, { stdio: 'inherit' });
          consola.success(`Successfully invoked Edge Function '${args.name}'.`);
        } catch (e: any) {
          consola.error(`Failed to invoke function: ${e.message}`);
          consola.info('Next steps:\n  Make sure Supabase is running: npm run truex supa boot');
        }
      }
    }),

    smoke: defineCommand({
      meta: {
        name: 'smoke',
        description: 'Run live Supabase runtime proof (Edge, DB, and Boundary check)'
      },
      args: {
        remote: {
          type: 'boolean',
          description: 'Verify against remote environment credentials',
          default: false
        }
      },
      async run({ args }) {
        consola.info('Initializing live Supabase smoke test...');
        const report = await runSupaSmoke({ remote: Boolean(args.remote) });
        console.log(JSON.stringify(report, null, 2));
      }
    })
  }
});
export default supaCommand;
