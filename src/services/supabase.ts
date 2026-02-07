
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tofecrvlbwrghxieomxh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GV6tcH3mZS4kRDq7Qd3qzA_oXqNZpAC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);