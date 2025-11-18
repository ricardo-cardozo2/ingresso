// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vlbjivrwlxvqywbjweeb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYmppdnJ3bHh2cXl3Ymp3ZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAzNzUsImV4cCI6MjA3ODYxNjM3NX0.WpvfEvYAO8jJcy6zYSKlUznrvusJYhtqLiYiSnZs6Wo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
