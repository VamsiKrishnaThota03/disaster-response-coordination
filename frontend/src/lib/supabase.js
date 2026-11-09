import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Supabase client used only for Auth (sign in / sign up). Null when not configured. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
