-- Migration: Add missing columns for Enhanced Profile 2.0 and Structured Applications
-- Date: 2026-01-05
-- Description: Adds columns that were defined in schema.ts but not applied to production database

-- Add Enhanced Profile 2.0 columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS looking_for TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS projects_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS endorsements INTEGER DEFAULT 0;

-- Add Structured Application fields to join_requests table
ALTER TABLE join_requests
ADD COLUMN IF NOT EXISTS motivation TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS time_commitment TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('headline', 'looking_for', 'experience', 'reputation_score', 'projects_completed', 'endorsements')
ORDER BY column_name;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'join_requests'
AND column_name IN ('motivation', 'role', 'time_commitment', 'experience')
ORDER BY column_name;
