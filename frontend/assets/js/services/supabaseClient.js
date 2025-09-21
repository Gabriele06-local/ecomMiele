// Configurazione Supabase Client
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

// Configurazione Supabase - Usa variabili d'ambiente o fallback
const supabaseUrl = window.location.hostname === 'localhost' 
  ? 'https://roagnpympvjkbqbtmtnt.supabase.co'  // Fallback per sviluppo locale
  : 'https://roagnpympvjkbqbtmtnt.supabase.co'  // URL del tuo progetto Supabase

const supabaseAnonKey = window.location.hostname === 'localhost'
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvYWducHltcHZqa2JxYnRtdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTMyNDIsImV4cCI6MjA3NDAyOTI0Mn0.QROghbzXqTwweLnIQ1JIWVhNnraQ2sHV5MvbDlPLZtk'
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvYWducHltcHZqa2JxYnRtdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTMyNDIsImV4cCI6MjA3NDAyOTI0Mn0.QROghbzXqTwweLnIQ1JIWVhNnraQ2sHV5MvbDlPLZtk'

console.log('🔧 Supabase URL:', supabaseUrl)
console.log('🔑 Supabase Key:', supabaseAnonKey.substring(0, 20) + '...')

// Creazione del client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // Cambiato a false per evitare problemi
    flowType: 'pkce'  // Usa PKCE flow per sicurezza
  }
})

// Funzione per ottenere l'URL corrente (per configurazione dinamica)
export function getSupabaseUrl() {
  // In produzione, questo potrebbe essere configurato tramite variabili d'ambiente
  return import.meta.env.VITE_SUPABASE_URL || supabaseUrl
}

// Funzione per ottenere la chiave anonima
export function getSupabaseAnonKey() {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseAnonKey
}

// Funzione per inizializzare Supabase con configurazione dinamica
export function initializeSupabase() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  
  if (url === 'YOUR_SUPABASE_URL' || key === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('⚠️ Supabase non configurato correttamente. Aggiorna supabaseClient.js con le tue credenziali.')
    return null
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

// Esportazione predefinita
export default supabase
