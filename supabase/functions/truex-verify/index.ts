/**
 * @fileoverview Supabase Edge Function for Truex Receipt Verification
 * Uses native Deno Web Crypto to perform canonical signature checking.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function canonicalStringify(val: any): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(val[k])}`);
  return '{' + parts.join(',') + '}';
}

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let envelope: any;
    try {
      envelope = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { session_id, expected_path_hash, ocel2_batch_hash, receipt_hash, ocel2, admission_status } = envelope;

    if (!session_id || !expected_path_hash || !ocel2_batch_hash || !receipt_hash || !ocel2) {
      return new Response(
        JSON.stringify({
          verified: false,
          admission_status: 'refused',
          error: 'Missing required Truex attributes in request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 1: Verify canonical batch hash
    const canonicalOcel2 = canonicalStringify(ocel2);
    const computedBatchHash = await sha256(canonicalOcel2);
    const batchValid = computedBatchHash === ocel2_batch_hash;

    // Step 2: Verify receipt signature
    const receiptSeed = `${session_id}:${computedBatchHash}:${expected_path_hash}`;
    const computedReceiptHash = await sha256(receiptSeed);
    const receiptValid = computedReceiptHash === receipt_hash;

    const verified = batchValid && receiptValid;

    if (verified) {
      return new Response(
        JSON.stringify({
          verified: true,
          admission_status: admission_status || 'accepted',
          receipt_hash: receipt_hash,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          verified: false,
          admission_status: 'refused',
          error: 'Truex Receipt Signature Mismatch (Integrity Compromised)',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
