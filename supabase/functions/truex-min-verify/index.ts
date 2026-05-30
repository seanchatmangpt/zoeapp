import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, payload, previous_receipt_hash } = await req.json();

    // 1. Boundary Check
    if (type !== 'volunteer_cancelled') {
      return new Response(JSON.stringify({ error: 'Boundary violation: forbidden path' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Insert event first to get event_id
    const { data: eventData, error: eventError } = await supabaseClient
      .from('truex_events')
      .insert({ type, payload })
      .select('id')
      .single();

    if (eventError) throw new Error(`Event insert failed: ${eventError.message}`);
    const event_id = eventData.id;

    // 3. State Transition & Canonical Hashing
    const outputData = { status: 'cancelled' };
    const inputHash = await sha256(canonicalStringify({ type, payload }));
    const outputHash = await sha256(canonicalStringify(outputData));
    
    // Receipt Hash (deterministic)
    const prev = previous_receipt_hash || '';
    const receiptDataStr = canonicalStringify({
      event_id,
      authority: 'server',
      input: { type, payload },
      output: outputData
    });
    
    const receiptHash = await sha256(prev + receiptDataStr);

    // 4. Insert receipt
    const { data: receiptData, error: receiptError } = await supabaseClient
      .from('truex_receipts')
      .insert({
        event_id: event_id,
        authority: 'server',
        input_hash: inputHash,
        output_hash: outputHash,
        previous_receipt_hash: prev,
        receipt_hash: receiptHash,
        status: 'confirmed'
      })
      .select('*')
      .single();

    if (receiptError) throw new Error(`Receipt insert failed: ${receiptError.message}`);

    return new Response(JSON.stringify({ receipt: receiptData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
