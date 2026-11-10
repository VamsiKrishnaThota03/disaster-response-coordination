import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { haversineMeters, parsePoint } from '../utils/geo.js';

dotenv.config();

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

export const DISASTER_UPDATE_FIELDS = ['title', 'description', 'type', 'severity', 'status', 'priority', 'location_name', 'location', 'tags'];
export const RESOURCE_UPDATE_FIELDS = ['name', 'type', 'location_name', 'location', 'status', 'disaster_id'];

class SupabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      logger.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set; database calls will fail');
      return;
    }
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  get db() {
    if (!this.supabase) {
      throw new Error('Supabase is not configured (set SUPABASE_URL and SUPABASE_ANON_KEY)');
    }
    return this.supabase;
  }

  /**
   * Cheapest round trip that proves the project is awake, the credentials work
   * and the `disasters` table exists. Used by the readiness probe.
   *
   * `head: true` with `count: 'exact'` returns no rows, so this is cheap enough
   * to poll. Throws on any failure so the caller can report the reason.
   */
  async ping() {
    const { error } = await this.db.from('disasters').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return true;
  }

  /** Verify a Supabase Auth access token and return the user, or null. */
  async getUserFromToken(token) {
    if (!token) return null;
    const { data, error } = await this.db.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  }

  async getAllDisasters() {
    const { data, error } = await this.db.from('disasters').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /** Returns the disaster or null when it does not exist. */
  async getDisasterById(id) {
    const { data, error } = await this.db.from('disasters').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async createDisaster(disaster) {
    const row = {
      title: disaster.title,
      description: disaster.description,
      type: disaster.type || 'unknown',
      severity: disaster.severity || 'medium',
      status: disaster.status || 'active',
      priority: disaster.priority || 'medium',
      location_name: disaster.location_name || 'Location unknown',
      location: disaster.location,
      tags: Array.isArray(disaster.tags) ? disaster.tags : [],
      owner_id: disaster.owner_id,
    };
    const { data, error } = await this.db.from('disasters').insert([row]).select().single();
    if (error) throw error;
    return data;
  }

  async updateDisaster(id, changes) {
    const { data, error } = await this.db
      .from('disasters')
      .update(pick(changes, DISASTER_UPDATE_FIELDS))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteDisaster(id) {
    const { error } = await this.db.from('disasters').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async createReport(report) {
    const row = {
      disaster_id: report.disaster_id,
      content: report.content,
      image_url: report.image_url || null,
      verification_status: report.verification_status || 'pending',
      priority: report.priority || 'normal',
      user_id: report.user_id,
    };
    const { data, error } = await this.db.from('reports').insert([row]).select().single();
    if (error) throw error;
    return data;
  }

  async getReportsByDisasterId(disasterId) {
    const { data, error } = await this.db
      .from('reports')
      .select('*')
      .eq('disaster_id', disasterId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /**
   * Active resources within `radius` metres of a point, nearest first.
   * Distances are computed in JS so this works whatever format PostgREST
   * returns the location column in (GeoJSON, EWKB hex, WKT or native point).
   */
  async findResourcesWithinDistance(latitude, longitude, radius, disasterId = null) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    const rad = Number(radius);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(rad) || rad <= 0) {
      throw new Error('Invalid coordinates or radius');
    }

    const { data, error } = await this.db
      .from('resources')
      .select('*')
      .eq('status', 'active')
      .not('location', 'is', null);
    if (error) throw error;

    return (data || [])
      .filter((r) => !disasterId || !r.disaster_id || r.disaster_id === disasterId)
      .map((r) => {
        const point = parsePoint(r.location);
        if (!point) return null;
        return {
          ...r,
          latitude: point.latitude,
          longitude: point.longitude,
          distance_meters: haversineMeters(lat, lon, point.latitude, point.longitude),
        };
      })
      .filter((r) => r && r.distance_meters <= rad)
      .sort((a, b) => a.distance_meters - b.distance_meters);
  }

  async createResource(resource) {
    const row = {
      name: resource.name,
      type: resource.type,
      location_name: resource.location_name,
      location: resource.location,
      status: resource.status || 'active',
      disaster_id: resource.disaster_id || null,
    };
    const { data, error } = await this.db.from('resources').insert([row]).select().single();
    if (error) throw error;
    return data;
  }

  async getResourceById(id) {
    const { data, error } = await this.db.from('resources').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateResource(id, changes) {
    const { data, error } = await this.db
      .from('resources')
      .update(pick(changes, RESOURCE_UPDATE_FIELDS))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteResource(id) {
    const { error } = await this.db.from('resources').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async createSocialMediaPost(post) {
    const row = {
      disaster_id: post.disaster_id,
      platform: post.platform,
      content: post.content,
      author: post.author,
      priority: post.priority || 'normal',
      coordinates: post.coordinates,
      created_at: post.created_at || new Date().toISOString(),
    };
    const { data, error } = await this.db.from('social_media_posts').insert([row]).select();
    if (error) throw error;
    return data[0];
  }

  async getSocialMediaPostsByDisaster(disasterId, limit = 20) {
    const { data, error } = await this.db
      .from('social_media_posts')
      .select('*')
      .eq('disaster_id', disasterId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }
}

export default new SupabaseService();
