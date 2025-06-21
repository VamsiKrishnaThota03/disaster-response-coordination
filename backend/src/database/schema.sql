-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create disasters table
CREATE TABLE IF NOT EXISTS disasters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT,
    severity TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    location_name TEXT NOT NULL DEFAULT 'Location unknown',
    location GEOGRAPHY(POINT), -- Making location nullable
    tags TEXT[] DEFAULT '{}',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    audit_trail JSONB DEFAULT '[]'::jsonb
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disaster_id UUID NOT NULL REFERENCES disasters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_disaster FOREIGN KEY (disaster_id) REFERENCES disasters(id)
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location POINT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    disaster_id UUID REFERENCES disasters(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cache table for API responses
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create official_updates table
CREATE TABLE IF NOT EXISTS official_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    url TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create social media posts table
CREATE TABLE IF NOT EXISTS social_media_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    coordinates POINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for spatial queries
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);
CREATE INDEX IF NOT EXISTS social_media_posts_coordinates_idx ON social_media_posts USING GIST (coordinates);

-- Create index on tags for faster filtering
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_audit_trail_idx ON disasters USING GIN (audit_trail);

-- Create indexes for foreign keys and common queries
CREATE INDEX IF NOT EXISTS reports_disaster_id_idx ON reports(disaster_id);
CREATE INDEX IF NOT EXISTS resources_disaster_id_idx ON resources(disaster_id);
CREATE INDEX IF NOT EXISTS official_updates_disaster_id_idx ON official_updates(disaster_id);
CREATE INDEX IF NOT EXISTS social_media_posts_disaster_id_idx ON social_media_posts(disaster_id);
CREATE INDEX IF NOT EXISTS cache_expires_at_idx ON cache(expires_at);

-- Create index for faster disaster-based queries
CREATE INDEX IF NOT EXISTS idx_social_media_posts_disaster_id ON social_media_posts(disaster_id);

-- Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_social_media_posts_priority ON social_media_posts(priority);

-- Create index for faster disaster-based queries
CREATE INDEX IF NOT EXISTS idx_resources_disaster_id ON resources(disaster_id);

-- Create index for type-based queries
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);

-- Create index for status-based queries
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);

-- Create function for finding resources within distance
CREATE OR REPLACE FUNCTION find_resources_within_distance(
    latitude float,
    longitude float,
    radius_meters float,
    current_disaster_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    location_name TEXT,
    distance_meters float,
    status TEXT,
    disaster_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.type,
        r.location_name,
        ST_Distance(
            ST_SetSRID(r.location, 4326)::geography,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        ) as distance_meters,
        r.status,
        r.disaster_id
    FROM resources r
    WHERE ST_DWithin(
        ST_SetSRID(r.location, 4326)::geography,
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        radius_meters
    )
    AND (r.status = 'active')
    AND (current_disaster_id IS NULL OR r.disaster_id = current_disaster_id OR r.disaster_id IS NULL)
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Create function for finding nearby social media posts
CREATE OR REPLACE FUNCTION find_nearby_social_media_posts(
    latitude float,
    longitude float,
    radius_meters float
) RETURNS TABLE (
    id UUID,
    content TEXT,
    author TEXT,
    priority TEXT,
    distance_meters float,
    platform TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.content,
        p.author,
        p.priority,
        ST_Distance(
            p.coordinates::geography,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        ) as distance_meters,
        p.platform,
        p.created_at
    FROM social_media_posts p
    WHERE ST_DWithin(
        p.coordinates::geography,
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        radius_meters
    )
    ORDER BY p.priority DESC, distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_disasters_updated_at
    BEFORE UPDATE ON disasters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_resources_updated_at();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_media_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_social_media_posts_updated_at
    BEFORE UPDATE ON social_media_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_social_media_posts_updated_at(); 