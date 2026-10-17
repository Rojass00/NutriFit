import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tu-proyecto.supabase.co' // Reemplaza con tu URL de Supabase
const SUPABASE_ANON_KEY = 'tu-anon-key' // Reemplaza con tu Key anónima de Supabase

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
