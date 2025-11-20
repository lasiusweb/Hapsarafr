import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export const initializeSupabase = (): SupabaseClient | null => {
    const supabaseUrl = localStorage.getItem('supabaseUrl');
    const supabaseAnonKey = localStorage.getItem('supabaseAnonKey');

    if (supabaseUrl && supabaseAnonKey) {
        if (!supabase) {
            supabase = createClient(supabaseUrl, supabaseAnonKey);
        }
        return supabase;
    }
    return null;
};

export const getSupabase = (): SupabaseClient | null => {
    // Attempt to initialize if not already done (e.g. on page reload)
    if (!supabase) {
        return initializeSupabase();
    }
    return supabase;
};