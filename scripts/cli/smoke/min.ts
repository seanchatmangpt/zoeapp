import { defineCommand } from 'citty';
import { consola } from 'consola';
import { createClient } from '@supabase/supabase-js';
import { canonicalStringify, sha256 } from '../../../src/lib/crypto/receipts';

export const smokeMinCmd = defineCommand({
  meta: {
    name: 'min',
    description: 'Run the truex-min smoke test'
  },
  async run() {
    consola.info('Starting truex-min smoke test...');
    
    // 1. Setup Supabase Client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    // Use anon key for local emulator by default if not set
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; 
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'SUPABASE_SERVICE_ROLE_KEY_PLACEHOLDER';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // 2. HTTP Request to Edge Function
      consola.info('1. Sending volunteer_cancelled event to truex-min-verify...');
      const payload = { user_id: 'test_user_123' };
      
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('truex-min-verify', {
        body: {
          type: 'volunteer_cancelled',
          payload,
          previous_receipt_hash: '0000000000000000000000000000000000000000000000000000000000000000'
        }
      });

      if (edgeError || !edgeData) {
        throw new Error(`Edge function failed: ${edgeError?.message || 'No data returned'}`);
      }

      const receipt = edgeData.receipt;
      if (!receipt || !receipt.receipt_hash) {
        throw new Error('No receipt returned from edge function');
      }
      consola.success('-> Edge authoritative receipt received: ' + receipt.receipt_hash);

      // 3. Postgres Readback
      consola.info('2. Querying Postgres for receipt readback...');
      const { data: readback, error: readbackError } = await supabase
        .from('truex_receipts')
        .select('*')
        .eq('receipt_hash', receipt.receipt_hash)
        .single();
      
      if (readbackError || !readback) {
        throw new Error(`Readback failed: ${readbackError?.message}`);
      }
      consola.success('-> Postgres readback successful');

      // 4. Replay Hash Match
      consola.info('3. Verifying replay hash match locally...');
      const receiptDataStr = canonicalStringify({
        event_id: readback.event_id,
        authority: 'server',
        input: { type: 'volunteer_cancelled', payload },
        output: { status: 'cancelled' }
      });
      const prev = '0000000000000000000000000000000000000000000000000000000000000000';
      consola.info(`Local canonical string: ${receiptDataStr}`);
      const localReceiptHash = await sha256(prev + receiptDataStr);

      if (localReceiptHash !== receipt.receipt_hash) {
        throw new Error(`Hash mismatch! Local: ${localReceiptHash}, Edge: ${receipt.receipt_hash}`);
      }
      consola.success('-> Replay hash match confirmed');

      // 5. Insert Replay Run
      consola.info('4. Recording replay run...');
      const { error: replayError } = await supabase
        .from('truex_replay_runs')
        .insert({
          event_id: readback.event_id,
          receipt_hash: receipt.receipt_hash,
          status: 'success'
        });
      if (replayError) {
        throw new Error(`Replay run insert failed: ${replayError.message}`);
      }
      consola.success('-> Replay run recorded successfully');

      consola.success('truex-min smoke test completed successfully. (UI observation via Maestro is a separate step)');
    } catch (e: any) {
      consola.error('Smoke test failed:', e.message);
      process.exit(1);
    }
  }
});
