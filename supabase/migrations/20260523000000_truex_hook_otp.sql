-- Database schema for Truex Hook OTP
-- Creates tables for messages, runs, receipts, supervisor events, quarantines, projections, and outboxes

CREATE TABLE IF NOT EXISTS truex_hook_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    hook_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    causation_id TEXT,
    correlation_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS truex_hook_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    hook_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    message_id UUID REFERENCES truex_hook_messages(id),
    status TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    output_hash TEXT NOT NULL,
    delta_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS truex_hook_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_hash TEXT UNIQUE NOT NULL,
    previous_receipt_hash TEXT NOT NULL,
    hook_run_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    hook_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    output_hash TEXT NOT NULL,
    delta_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    avatar_projection_hashes JSONB DEFAULT '{}'::jsonb NOT NULL,
    supervisor_events TEXT[] DEFAULT '{}'::text[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS truex_hook_supervisor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    hook_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    action TEXT NOT NULL,
    error_msg TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS truex_hook_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    hook_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    quarantined_by TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS truex_hook_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    hook_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    role TEXT NOT NULL,
    visible BOOLEAN NOT NULL,
    surface TEXT NOT NULL,
    allowed_actions TEXT[] NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS truex_hook_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    message_payload JSONB NOT NULL,
    sent BOOLEAN DEFAULT FALSE NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Configuration
ALTER TABLE truex_hook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_hook_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_hook_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_hook_supervisor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_hook_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_hook_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE truex_hook_outbox ENABLE ROW LEVEL SECURITY;

-- 1. truex_hook_projections: client can read permitted projections based on role/tenant
CREATE POLICY select_projections ON truex_hook_projections
    FOR SELECT TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- 2. truex_hook_receipts: client can read, but cannot write authoritative receipts
CREATE POLICY select_receipts ON truex_hook_receipts
    FOR SELECT TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY insert_receipts_service_role ON truex_hook_receipts
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 3. truex_hook_messages: client can read/write their own hook messages
CREATE POLICY select_messages ON truex_hook_messages
    FOR SELECT TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY insert_messages ON truex_hook_messages
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- 4. truex_hook_runs: read-only for clients, service role write
CREATE POLICY select_runs ON truex_hook_runs
    FOR SELECT TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY insert_runs_service_role ON truex_hook_runs
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 5. truex_hook_quarantine: clients can read, service_role write
CREATE POLICY select_quarantine ON truex_hook_quarantine
    FOR SELECT TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY write_quarantine_service_role ON truex_hook_quarantine
    FOR ALL TO service_role
    USING (true);

-- 6. truex_hook_outbox: client can select/insert their own outbox
CREATE POLICY manage_outbox ON truex_hook_outbox
    FOR ALL TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
