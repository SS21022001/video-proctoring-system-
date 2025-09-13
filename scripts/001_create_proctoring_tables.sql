-- Create proctoring sessions table
CREATE TABLE IF NOT EXISTS public.proctoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'terminated')),
  video_quality TEXT DEFAULT '720p' CHECK (video_quality IN ('720p', '1080p')),
  integrity_score INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create detection events table
CREATE TABLE IF NOT EXISTS public.detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.proctoring_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confidence DECIMAL(3,2),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create session statistics table
CREATE TABLE IF NOT EXISTS public.session_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.proctoring_sessions(id) ON DELETE CASCADE,
  total_focus_loss_events INTEGER DEFAULT 0,
  total_multiple_face_events INTEGER DEFAULT 0,
  total_suspicious_object_events INTEGER DEFAULT 0,
  total_no_face_events INTEGER DEFAULT 0,
  average_confidence DECIMAL(3,2) DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.proctoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a proctoring system, we'll allow public access for now)
-- In a production system, you'd want proper authentication and user-based policies

-- Proctoring sessions policies
CREATE POLICY "Allow public access to proctoring_sessions" ON public.proctoring_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Detection events policies  
CREATE POLICY "Allow public access to detection_events" ON public.detection_events
  FOR ALL USING (true) WITH CHECK (true);

-- Session statistics policies
CREATE POLICY "Allow public access to session_statistics" ON public.session_statistics
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_status ON public.proctoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_created_at ON public.proctoring_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_detection_events_session_id ON public.detection_events(session_id);
CREATE INDEX IF NOT EXISTS idx_detection_events_timestamp ON public.detection_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_detection_events_severity ON public.detection_events(severity);
