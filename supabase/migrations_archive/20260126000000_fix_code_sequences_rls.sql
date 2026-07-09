-- Migration: Fix RLS policies for code_sequences table
-- This allows authenticated users to insert and update sequence values

-- Enable RLS if not already enabled
ALTER TABLE code_sequences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read sequences" ON code_sequences;
DROP POLICY IF EXISTS "Allow authenticated users to insert sequences" ON code_sequences;
DROP POLICY IF EXISTS "Allow authenticated users to update sequences" ON code_sequences;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read sequences"
ON code_sequences
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert sequences"
ON code_sequences
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sequences"
ON code_sequences
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
