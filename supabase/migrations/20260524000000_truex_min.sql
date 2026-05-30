-- 1. Drop existing truex_hook and actor tables to ensure minimal setup
DROP TABLE IF EXISTS truex_hook_outbox CASCADE;
DROP TABLE IF EXISTS truex_hook_projections CASCADE;
DROP TABLE IF EXISTS truex_hook_quarantine CASCADE;
DROP TABLE IF EXISTS truex_hook_supervisor_events CASCADE;
DROP TABLE IF EXISTS truex_hook_receipts CASCADE;
DROP TABLE IF EXISTS truex_hook_runs CASCADE;
DROP TABLE IF EXISTS truex_hook_messages CASCADE;

DROP TABLE IF EXISTS actor_quarantine CASCADE;
DROP TABLE IF EXISTS actor_outbox CASCADE;
DROP TABLE IF EXISTS actor_receipts CASCADE;
DROP TABLE IF EXISTS actor_events CASCADE;
DROP TABLE IF EXISTS actor_commands CASCADE;

-- 2. Create minimal tables
CREATE TABLE truex_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE truex_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES truex_events(id) NOT NULL,
    authority TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    output_hash TEXT NOT NULL,
    previous_receipt_hash TEXT NOT NULL,
    receipt_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE truex_replay_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES truex_events(id) NOT NULL,
    receipt_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Setup minimal RLS
ALTER TABLE truex_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_replay_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_events ON truex_events FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY insert_events ON truex_events FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY select_receipts ON truex_receipts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY insert_receipts_service_role ON truex_receipts FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY select_replay_runs ON truex_replay_runs FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY insert_replay_runs_service_role ON truex_replay_runs FOR INSERT TO service_role WITH CHECK (true);
