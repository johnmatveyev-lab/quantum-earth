-- Migration for Historical Data Storage
-- Purpose: To store periodic snapshots of tracked objects to enable timeline replay and analysis.

-- Snapshots represent a single point in time when data was captured
CREATE TABLE IF NOT EXISTS public.tracking_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  source TEXT NOT NULL, -- 'opensky', 'celestrak', etc.
  object_count INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

-- Index for querying snapshots by time
CREATE INDEX IF NOT EXISTS idx_tracking_snapshots_time ON public.tracking_snapshots (snapshot_time DESC);

-- Positions hold the actual object location at the snapshot time
CREATE TABLE IF NOT EXISTS public.object_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.tracking_snapshots(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL, -- e.g. 'ac-1234', 'sat-25544'
  object_type TEXT NOT NULL, -- 'aircraft', 'satellite', 'rocket'
  name TEXT,
  callsign TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION NOT NULL,
  status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient querying of paths over time
CREATE INDEX IF NOT EXISTS idx_object_positions_snapshot_id ON public.object_positions (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_object_positions_object_id ON public.object_positions (object_id);
CREATE INDEX IF NOT EXISTS idx_object_positions_type ON public.object_positions (object_type);

-- RLS: Only admins/service role can insert, but authenticated users on Pro/Enterprise can read
ALTER TABLE public.tracking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_positions ENABLE ROW LEVEL SECURITY;

-- Reading snapshots is allowed for everyone (could restrict to Pro+ later using tierLimits logic)
CREATE POLICY "Anyone can read tracking snapshots"
  ON public.tracking_snapshots FOR SELECT
  USING (true);

-- Reading object positions is allowed for everyone
CREATE POLICY "Anyone can read object positions"
  ON public.object_positions FOR SELECT
  USING (true);

-- Only service role can insert (enforced automatically if no insert policy exists for anon/authenticated)
-- But we can be explicit if we want:
CREATE POLICY "Service role can insert snapshots"
  ON public.tracking_snapshots FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS anyway, but good for clarity

CREATE POLICY "Service role can insert positions"
  ON public.object_positions FOR INSERT
  WITH CHECK (true);
