// Client Supabase per Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configurazione Supabase per Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Client con privilegi di service role per le Edge Functions
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Funzione helper per ottenere l'utente dalla richiesta
export async function getUserFromRequest(request: Request): Promise<any> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.substring(7)
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      throw new Error('Invalid token')
    }
    
    return user
  } catch (error) {
    throw new Error('Authentication failed')
  }
}

// Funzione helper per verificare se l'utente è admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return false
    }

    return profile.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Funzione helper per validare l'input
export function validateInput(data: any, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

// Funzione helper per sanitizzare il testo
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return ''
  }

  return text
    .trim()
    .replace(/[<>]/g, '') // Rimuove caratteri potenzialmente pericolosi
    .substring(0, 1000) // Limita la lunghezza
}

// Funzione helper per validare l'email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Funzione helper per validare il telefono
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

// Funzione helper per generare un ID casuale
export function generateId(): string {
  return crypto.randomUUID()
}

// Funzione helper per calcolare la distanza tra due punti (per geolocalizzazione)
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371 // Raggio della Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Funzione helper per formattare la valuta
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// Funzione helper per formattare la data
export function formatDate(date: Date | string, locale = 'it-IT'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(d)
}

// Funzione helper per generare un hash sicuro
export async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Funzione helper per verificare il rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  limit: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const key = `${identifier}_${Math.floor(now / windowMs)}`
  
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= limit) {
    return false
  }
  
  current.count++
  return true
}

// Funzione helper per pulire la mappa del rate limiting
export function cleanupRateLimit(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

// Funzione helper per loggare le richieste
export function logRequest(
  method: string, 
  url: string, 
  userId?: string, 
  metadata?: any
): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method,
    url,
    userId,
    metadata,
    userAgent: 'Edge Function'
  }))
}

// Funzione helper per gestire gli errori
export function handleError(error: any, context?: string): Response {
  console.error(`Error in ${context || 'Edge Function'}:`, error)
  
  const message = error.message || 'Internal server error'
  const status = error.status || 500
  
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message 
    }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Funzione helper per risposta di successo
export function successResponse(data: any, status = 200): Response {
  return new Response(
    JSON.stringify({ 
      success: true, 
      data 
    }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
