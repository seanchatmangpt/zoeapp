import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { actorRef, messageId, action, error } = await req.json();

    // Log supervisor event to standard server audit log
    console.warn(`[Supervisor Event] Actor: ${JSON.stringify(actorRef)}, Action: ${action}, Error: ${error}`);

    return new Response(
      JSON.stringify({
        status: 'logged',
        eventId: 'evt_' + Math.random().toString(36).substring(2, 10),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
