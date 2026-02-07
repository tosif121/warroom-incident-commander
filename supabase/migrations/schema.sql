-- DATA GUARD: WINNING SCHEMA (Production Ready)
-- Run this in your Supabase SQL Editor to setup the project.

-- 1. Enable Realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 2. Clean Slate (Optional: Be careful in Prod)
DROP TABLE IF EXISTS incident_events CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;

-- 3. Services (Monitored Databases)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('healthy', 'degraded', 'critical', 'maintenance', 'unknown')),
    monitored_url TEXT, -- Legacy support
    connected_db_url TEXT, -- Encrypted connection string (conceptually)
    connected_db_key TEXT, -- Encrypted API Key
    schema_info JSONB DEFAULT '{}', -- Cached schema for AI
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Incidents (The War Room State)
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    status TEXT CHECK (status IN ('active', 'investigating', 'identified', 'monitoring', 'resolved')),
    service_id UUID REFERENCES services(id),
    service_name TEXT, -- Denormalized for speed
    slack_channel_id TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Incident Events (The Timeline / Chat)
CREATE TABLE incident_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    event_type TEXT CHECK (event_type IN ('detected', 'activated', 'investigation', 'action', 'action_taken', 'resolved', 'info', 'recovered')),
    user_id TEXT DEFAULT 'System',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Metrics (Real-time Graphs)
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL, -- e.g., 'latency', 'error_rate', 'cpu', 'active_connections'
    value NUMERIC NOT NULL,
    unit TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Error Logs (For Analysis)
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    count INTEGER DEFAULT 1,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable Replication (Critical for Realtime)
ALTER TABLE services REPLICA IDENTITY FULL;
ALTER TABLE incidents REPLICA IDENTITY FULL;
ALTER TABLE incident_events REPLICA IDENTITY FULL;
ALTER TABLE metrics REPLICA IDENTITY FULL;
ALTER TABLE error_logs REPLICA IDENTITY FULL;

-- 9. Seed Default Service (Data Guard Self-Monitor)
INSERT INTO services (name, status) VALUES ('Data Guard Control Plane', 'healthy');
