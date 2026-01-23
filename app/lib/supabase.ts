import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace these with your Supabase project credentials
const SUPABASE_URL = 'https://rslvjsflhetjoyqirgql.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbHZqc2ZsaGV0am95cWlyZ3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTg5MzcsImV4cCI6MjA4NDA5NDkzN30.L8x0tDMNw62mE8voO6sQv2CByDclWNKEHOSguWAG6_o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
