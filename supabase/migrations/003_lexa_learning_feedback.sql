-- LEXA learning loop: feedback + interaction events
-- Goal: collect signal so we can improve prompts, routing, and communication style over time.

CREATE TABLE IF NOT EXISTS lexa_message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  message_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating IN (-1, 1)), -- -1 = thumbs down, +1 = thumbs up
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lexa_message_feedback_user_id ON lexa_message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_lexa_message_feedback_session_id ON lexa_message_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_lexa_message_feedback_message_id ON lexa_message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_lexa_message_feedback_created_at ON lexa_message_feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS lexa_interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lexa_interaction_events_user_id ON lexa_interaction_events(user_id);
CREATE INDEX IF NOT EXISTS idx_lexa_interaction_events_session_id ON lexa_interaction_events(session_id);
CREATE INDEX IF NOT EXISTS idx_lexa_interaction_events_event_type ON lexa_interaction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lexa_interaction_events_created_at ON lexa_interaction_events(created_at DESC);


