-- Migration creating actor_commands, actor_events, actor_receipts, actor_outbox, and actor_quarantine tables for the Actor Runtime.

CREATE TABLE IF NOT EXISTS public.actor_commands (
  id TEXT PRIMARY KEY,
  actor_ref JSONB NOT NULL,
  command TEXT NOT NULL,
  principal JSONB NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  causation_id TEXT,
  correlation_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'applied', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.actor_events (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  actor_ref JSONB NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.actor_receipts (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  actor_ref JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted_pending', 'rejected_local', 'applied_local', 'applied_remote', 'rejected_remote', 'quarantined')),
  delta_hash TEXT,
  event_ids JSONB NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.actor_outbox (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.actor_quarantine (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  actor_ref JSONB NOT NULL,
  payload JSONB NOT NULL,
  error TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.actor_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actor_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actor_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actor_quarantine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access for demonstration" ON public.actor_commands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access for demonstration" ON public.actor_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access for demonstration" ON public.actor_receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access for demonstration" ON public.actor_outbox FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access for demonstration" ON public.actor_quarantine FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.actor_commands TO anon, authenticated;
GRANT ALL ON public.actor_events TO anon, authenticated;
GRANT ALL ON public.actor_receipts TO anon, authenticated;
GRANT ALL ON public.actor_outbox TO anon, authenticated;
GRANT ALL ON public.actor_quarantine TO anon, authenticated;
