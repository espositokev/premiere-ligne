import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wfpzwrgkttmsgrzujshr.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcHp3cmdrdHRtc2dyenVqc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjA4MDksImV4cCI6MjA5NDU5NjgwOX0.URkU308ic0AxGc9Y2q5xPVStakGo-6pJMTsuo0ZMRDM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
