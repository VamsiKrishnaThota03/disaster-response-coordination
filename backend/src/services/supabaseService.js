import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

class SupabaseService {
  constructor() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        logger.error('Supabase credentials not found in environment variables');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      logger.info('Supabase client initialized successfully');
    } catch (error) {
      logger.error('Error initializing Supabase client:', error);
    }
  }

  async getAllDisasters() {
    try {
      const { data, error } = await this.supabase
        .from('disasters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching all disasters:', error);
      throw error;
    }
  }

  async getDisasterById(id) {
    try {
      const { data, error } = await this.supabase
        .from('disasters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error fetching disaster with id ${id}:`, error);
      throw error;
    }
  }

  async createDisaster(disaster) {
    try {
      // Ensure proper data formatting and remove any extra fields
      const formattedDisaster = {
        title: disaster.title,
        description: disaster.description,
        type: disaster.type || 'unknown',
        severity: disaster.severity || 'medium',
        status: disaster.status || 'active',
        priority: disaster.priority || 'medium',
        location_name: disaster.location_name || 'Location unknown',
        location: disaster.location,
        tags: Array.isArray(disaster.tags) ? disaster.tags : [],
        owner_id: disaster.owner_id || 'system'
      };

      logger.info('Attempting to create disaster with formatted data:', formattedDisaster);

      const { data, error } = await this.supabase
        .from('disasters')
        .insert([formattedDisaster])
        .select();

      if (error) {
        logger.error('Supabase insert error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }

      logger.info('Successfully created disaster:', data[0]);
      return data[0];
    } catch (error) {
      logger.error('Error in createDisaster:', error);
      throw error;
    }
  }

  async updateDisaster(id, disaster) {
    try {
      const { data, error } = await this.supabase
        .from('disasters')
        .update(disaster)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error updating disaster with id ${id}:`, error);
      throw error;
    }
  }

  async deleteDisaster(id) {
    try {
      const { error } = await this.supabase
        .from('disasters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error(`Error deleting disaster with id ${id}:`, error);
      throw error;
    }
  }

  async createReport(report) {
    try {
      // Ensure proper data formatting
      const formattedReport = {
        disaster_id: report.disaster_id,
        content: report.content,
        image_url: report.image_url || null,
        verification_status: report.verification_status || 'pending',
        priority: report.priority || 'normal',
        user_id: report.user_id || 'system'
      };

      logger.info('Attempting to create report with formatted data:', formattedReport);

      const { data, error } = await this.supabase
        .from('reports')
        .insert([formattedReport])
        .select();

      if (error) {
        logger.error('Supabase insert error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }

      logger.info('Successfully created report:', data[0]);
      return data[0];
    } catch (error) {
      logger.error('Error in createReport:', error);
      throw error;
    }
  }

  async findResourcesWithinDistance(latitude, longitude, radius, disasterId = null) {
    try {
      logger.info(`Finding resources within ${radius}m of [${latitude}, ${longitude}]`);
      
      // Ensure parameters are numbers
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const rad = parseFloat(radius);

      if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
        throw new Error('Invalid coordinates or radius');
      }

      const query = `
        SELECT 
          id,
          name,
          type,
          location_name,
          ST_Distance(
            ST_SetSRID(location, 4326)::geography,
            ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
          ) as distance_meters,
          status,
          disaster_id
        FROM resources
        WHERE ST_DWithin(
          ST_SetSRID(location, 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
          ${rad}
        )
        AND status = 'active'
        ${disasterId ? `AND (disaster_id IS NULL OR disaster_id = '${disasterId}')` : ''}
        ORDER BY distance_meters;
      `;

      const { data, error } = await this.supabase
        .from('resources')
        .select('*')
        .filter('status', 'eq', 'active')
        .filter('location', 'not.is', null);

      if (error) {
        logger.error('Error in findResourcesWithinDistance:', error);
        throw error;
      }

      // Filter results in JavaScript since we can't use PostGIS functions directly
      const results = data
        .filter(resource => {
          if (!resource.location || !resource.location.coordinates) return false;
          const [resLon, resLat] = resource.location.coordinates;
          const distance = this.calculateDistance(lat, lon, resLat, resLon);
          return distance <= rad;
        })
        .map(resource => ({
          ...resource,
          distance_meters: this.calculateDistance(
            lat, 
            lon, 
            resource.location.coordinates[1], 
            resource.location.coordinates[0]
          )
        }))
        .sort((a, b) => a.distance_meters - b.distance_meters);

      logger.info(`Found ${results.length} resources`);
      return results;
    } catch (error) {
      logger.error('Error finding resources within distance:', error);
      throw error;
    }
  }

  // Helper function to calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  async getReportsByDisasterId(disasterId) {
    try {
      logger.info(`Fetching reports for disaster: ${disasterId}`);
      
      const { data, error } = await this.supabase
        .from('reports')
        .select('*')
        .eq('disaster_id', disasterId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Supabase error fetching reports:', error);
        throw error;
      }

      logger.info(`Successfully fetched ${data?.length || 0} reports`);
      return data || [];
    } catch (error) {
      logger.error('Error in getReportsByDisasterId:', error);
      throw error;
    }
  }

  async createResource(resource) {
    try {
      // Validate location format
      if (!resource.location || !resource.location.startsWith('POINT(') || !resource.location.endsWith(')')) {
        throw new Error('Invalid location format. Expected format: POINT(longitude latitude)');
      }

      // Ensure proper data formatting
      const formattedResource = {
        name: resource.name,
        type: resource.type,
        location_name: resource.location_name,
        location: resource.location,
        status: resource.status || 'active',
        disaster_id: resource.disaster_id || null
      };

      logger.info('Attempting to create resource with formatted data:', formattedResource);

      const { data, error } = await this.supabase
        .from('resources')
        .insert([formattedResource])
        .select();

      if (error) {
        logger.error('Supabase insert error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }

      logger.info('Successfully created resource:', data[0]);
      return data[0];
    } catch (error) {
      logger.error('Error in createResource:', error);
      throw error;
    }
  }

  async getResourceById(id) {
    try {
      const { data, error } = await this.supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error fetching resource with id ${id}:`, error);
      throw error;
    }
  }

  async updateResource(id, resource) {
    try {
      const { data, error } = await this.supabase
        .from('resources')
        .update(resource)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error updating resource with id ${id}:`, error);
      throw error;
    }
  }

  async deleteResource(id) {
    try {
      const { error } = await this.supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error(`Error deleting resource with id ${id}:`, error);
      throw error;
    }
  }

  async createSocialMediaPost(post) {
    try {
      const formattedPost = {
        disaster_id: post.disaster_id,
        platform: post.platform,
        content: post.content,
        author: post.author,
        priority: post.priority || 'normal',
        coordinates: post.coordinates,
        created_at: post.created_at || new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('social_media_posts')
        .insert([formattedPost])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      logger.error('Error creating social media post:', error);
      throw error;
    }
  }

  async getSocialMediaPostsByDisaster(disasterId, limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('social_media_posts')
        .select('*')
        .eq('disaster_id', disasterId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching social media posts:', error);
      throw error;
    }
  }
}

export default new SupabaseService(); 