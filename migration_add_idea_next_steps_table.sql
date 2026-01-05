-- Create idea_next_steps table
CREATE TABLE IF NOT EXISTS idea_next_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  estimated_time TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on idea_id for faster queries
CREATE INDEX IF NOT EXISTS idx_idea_next_steps_idea_id ON idea_next_steps(idea_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_idea_next_steps_created_at ON idea_next_steps(created_at);
