-- OAuth Providers Table
-- Stores OAuth provider connections for users (Google, Apple, etc.)

CREATE TABLE IF NOT EXISTS oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'apple', etc.
  provider_user_id VARCHAR(255) NOT NULL, -- User ID from the OAuth provider
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_photo_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- Index for fast lookups by provider and provider_user_id
CREATE INDEX IF NOT EXISTS idx_oauth_provider_user ON oauth_providers(provider, provider_user_id);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_providers(user_id);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_oauth_email ON oauth_providers(email);
