
// Supabase Configuration
// REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://kqqmcdlxgwudqxywmgdj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW1jZGx4Z3d1ZHF4eXdtZ2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODQ4NjMsImV4cCI6MjA4MTA2MDg2M30.ZoNF4tHSWztVJ5vItuAdjEoyMmYNSX-N5J7Hhn7VA2M';

let supabaseInstance = null;

if (window.supabase) {
    // If loaded via CDN in head (which it still is in index.html for now)
    try {
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase Connection Established (Module)");
    } catch (e) {
        console.error("Failed to create Supabase client:", e);
    }
} else {
    console.error("Supabase SDK not found on window. Ensure CDN script is loaded.");
}

export const supabase = supabaseInstance;
export const config = {
    url: SUPABASE_URL,
    key: SUPABASE_KEY
};
