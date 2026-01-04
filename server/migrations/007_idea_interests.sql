-- Migration: Idea Interest Requests
-- Description: Allow users to express interest in ideas and creators to manage these requests

CREATE TABLE idea_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT, -- Optional message from interested user
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, user_id) -- Prevent duplicate interest from same user
);

-- Indexes for performance
CREATE INDEX idx_idea_interests_idea ON idea_interests(idea_id);
CREATE INDEX idx_idea_interests_user ON idea_interests(user_id);
CREATE INDEX idx_idea_interests_status ON idea_interests(status);
CREATE INDEX idx_idea_interests_created ON idea_interests(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_idea_interests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_idea_interests_updated_at
  BEFORE UPDATE ON idea_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_interests_updated_at();

-- Add comment for documentation
COMMENT ON TABLE idea_interests IS 'Tracks user interest in joining ideas from the marketplace';
COMMENT ON COLUMN idea_interests.status IS 'pending: awaiting creator decision, accepted: creator approved, rejected: creator declined';
