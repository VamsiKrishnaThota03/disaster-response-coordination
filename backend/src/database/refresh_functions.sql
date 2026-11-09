-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS find_resources_within_distance(float, float, float, UUID);

-- Recreate the function
CREATE OR REPLACE FUNCTION find_resources_within_distance(
    latitude float,
    longitude float,
    radius_meters float,
    current_disaster_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    name VARCHAR,
    type VARCHAR,
    location_name VARCHAR,
    distance_meters float,
    status VARCHAR,
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
            r.location::geography,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        ) as distance_meters,
        r.status,
        r.disaster_id
    FROM resources r
    WHERE ST_DWithin(
        r.location::geography,
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        radius_meters
    )
    AND (r.status = 'active')
    AND (current_disaster_id IS NULL OR r.disaster_id = current_disaster_id OR r.disaster_id IS NULL)
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema'; 