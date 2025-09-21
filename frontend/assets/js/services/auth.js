// Servizio di autenticazione
import { supabase } from './supabaseClient.js'

// Tipi di errore per l'autenticazione
export const AuthError = {
  INVALID_CREDENTIALS: 'Credenziali non valide',
  EMAIL_NOT_CONFIRMED: 'Email non confermata',
  WEAK_PASSWORD: 'Password troppo debole',
  EMAIL_ALREADY_EXISTS: 'Email già registrata',
  NETWORK_ERROR: 'Errore di connessione',
  UNKNOWN_ERROR: 'Errore sconosciuto'
}

// Funzione per ottenere l'utente corrente
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Errore nel recupero utente:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Errore nel recupero utente:', error)
    return null
  }
}

// Funzione per ottenere la sessione corrente
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Errore nel recupero sessione:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Errore nel recupero sessione:', error)
    return null
  }
}

// Funzione per il login con email e password
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    })

    if (error) {
      console.error('Errore login:', error)
      return { success: false, error: mapAuthError(error) }
    }

    return { success: true, user: data.user }
  } catch (error) {
    console.error('Errore login:', error)
    return { success: false, error: AuthError.UNKNOWN_ERROR }
  }
}

// Funzione per la registrazione
export async function signUp(email, password, userData = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone
        }
      }
    })

    if (error) {
      console.error('Errore registrazione:', error)
      return { success: false, error: mapAuthError(error) }
    }

    return { success: true, user: data.user }
  } catch (error) {
    console.error('Errore registrazione:', error)
    return { success: false, error: AuthError.UNKNOWN_ERROR }
  }
}

// Funzione per il logout
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Errore logout:', error)
      return { success: false, error: error.message }
    }

    // Pulisci il localStorage
    localStorage.removeItem('cart')
    localStorage.removeItem('user_preferences')
    
    return { success: true }
  } catch (error) {
    console.error('Errore logout:', error)
    return { success: false, error: AuthError.UNKNOWN_ERROR }
  }
}

// Funzione per reimpostare la password
export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`
      }
    )

    if (error) {
      console.error('Errore reset password:', error)
      return { success: false, error: mapAuthError(error) }
    }

    return { success: true }
  } catch (error) {
    console.error('Errore reset password:', error)
    return { success: false, error: AuthError.UNKNOWN_ERROR }
  }
}

// Funzione per aggiornare la password
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Errore aggiornamento password:', error)
      return { success: false, error: mapAuthError(error) }
    }

    return { success: true }
  } catch (error) {
    console.error('Errore aggiornamento password:', error)
    return { success: false, error: AuthError.UNKNOWN_ERROR }
  }
}

// Funzione per aggiornare il profilo utente
export async function updateProfile(updates) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    })

    if (error) {
      console.error('Errore aggiornamento profilo:', error)
      return { success: false, error: mapAuthError(error) }
    }

    return { success: true, user: data.user }
  } catch (error) {
    console.error('Errore aggiornamento profilo:', error)
    return { success: false, error: AuthError.UNKNOWN_ERROR }
  }
}

// Funzione per mappare gli errori Supabase a messaggi user-friendly
function mapAuthError(error) {
  switch (error.message) {
    case 'Invalid login credentials':
      return AuthError.INVALID_CREDENTIALS
    case 'Email not confirmed':
      return AuthError.EMAIL_NOT_CONFIRMED
    case 'Password should be at least 6 characters':
      return AuthError.WEAK_PASSWORD
    case 'User already registered':
      return AuthError.EMAIL_ALREADY_EXISTS
    default:
      if (error.message.includes('network')) {
        return AuthError.NETWORK_ERROR
      }
      return error.message || AuthError.UNKNOWN_ERROR
  }
}

// Listener per i cambiamenti di autenticazione
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

// Funzione per verificare se l'utente è admin
export async function isUserAdmin() {
  try {
    const user = await getCurrentUser()
    if (!user) return false
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Errore verifica ruolo admin:', error)
      return false
    }
    
    return profile?.role === 'admin'
  } catch (error) {
    console.error('Errore verifica ruolo admin:', error)
    return false
  }
}

// Funzione per ottenere il profilo utente
export async function getUserProfile() {
  try {
    const user = await getCurrentUser()
    if (!user) return null
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Errore recupero profilo:', error)
      return null
    }
    
    return profile
  } catch (error) {
    console.error('Errore recupero profilo:', error)
    return null
  }
}
