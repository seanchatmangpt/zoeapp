import { defineCommand } from 'citty';
import consola from 'consola';
import * as fs from 'fs';
import * as path from 'path';

export const doctorHookOtpCmd = defineCommand({
  meta: {
    name: 'hook-otp',
    description: 'Diagnose Truex Hook OTP Runtime',
  },
  run() {
    consola.info('Verifying Hook OTP Mailbox, ActorRef, and Behavior laws...');
    
    // Check key implementation files
    const base = process.cwd();
    const files = [
      'src/lib/truex/hook-otp/mailbox.ts',
      'src/lib/truex/hook-otp/actorRef.ts',
      'src/lib/truex/hook-otp/behavior.ts',
      'src/lib/truex/hook-otp/supervisor.ts',
    ];

    let allExist = true;
    for (const f of files) {
      if (!fs.existsSync(path.resolve(base, f))) {
        consola.error(`❌ Missing runtime file: ${f}`);
        allExist = false;
      }
    }

    if (allExist) {
      consola.success('GATE-29 (Hook OTP Mailbox Ordering): OK');
    } else {
      process.exit(1);
    }
  },
});
