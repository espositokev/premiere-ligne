import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wfpzwrgkttmsgrzujshr.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xBUL3FFFrerjUKqdgOO6nw_bNnMIL6p'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
