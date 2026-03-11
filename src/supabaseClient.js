// ================================================================
// POSBevMerici — Dashboard Web Distributeur
// Stack : React + Vite + TailwindCSS + @supabase/supabase-js
//
// Installation :
//   npm create vite@latest posbev-dashboard -- --template react
//   cd posbev-dashboard
//   npm install @supabase/supabase-js
//   npm install -D tailwindcss postcss autoprefixer
//   npx tailwindcss init -p
//   npm run dev
// ================================================================

// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)