// Using `any` for Supabase types because the library is loaded from a CDN.
// In a project with a package manager, you would import types:
// import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: any | null = null;

export const initializeSupabase = (): any | null => {
    const supabaseUrl = localStorage.getItem('supabaseUrl');
    const supabaseAnonKey = localStorage.getItem('supabaseAnonKey');

    // @ts-ignore - supabase is loaded from CDN
    const { createClient } = window.supabase;

    if (supabaseUrl && supabaseAnonKey && createClient) {
        if (!supabase) { // Initialize only once
            supabase = createClient(supabaseUrl, supabaseAnonKey);
        }
        return supabase;
    }
    return null;
};

export const getSupabase = (): any => {
    if (!supabase) {
        throw new Error("Supabase has not been initialized. Call initializeSupabase first.");
    }
    return supabase;
}