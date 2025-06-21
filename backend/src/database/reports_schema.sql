-- Drop existing reports table if it exists
DROP TABLE IF EXISTS reports CASCADE;

-- Create reports table
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disaster_id UUID NOT NULL REFERENCES disasters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX reports_disaster_id_idx ON reports(disaster_id);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema'; 