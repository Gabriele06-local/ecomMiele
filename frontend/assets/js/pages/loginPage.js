// Gestione pagina di login
import { supabase } from '../services/supabaseClient.js'
import { showNotification } from '../utils/notifications.js'

document.addEventListener('DOMContentLoaded', function() {
    initializeLoginPage()
})

function initializeLoginPage() {
    console.log('🔐 Inizializzazione pagina login')
    
    const loginForm = document.getElementById('loginForm')
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin)
    }
    
    // Gestione toggle password visibility
    const togglePassword = document.getElementById('togglePassword')
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility)
    }
    
    // Gestione social login
    const googleLogin = document.getElementById('googleLogin')
    if (googleLogin) {
        googleLogin.addEventListener('click', handleGoogleLogin)
    }
    
    const facebookLogin = document.getElementById('facebookLogin')
    if (facebookLogin) {
        facebookLogin.addEventListener('click', handleFacebookLogin)
    }
}

async function handleLogin(event) {
    event.preventDefault()
    console.log('🔐 Tentativo di login')
    
    const formData = new FormData(event.target)
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe')
    }
    
    // Validazione
    if (!validateLoginForm(loginData)) {
        return
    }
    
    // Mostra loading
    const submitButton = event.target.querySelector('button[type="submit"]')
    const originalText = submitButton.textContent
    submitButton.textContent = 'Accesso in corso...'
    submitButton.disabled = true
    
    try {
        console.log('🔐 Login utente:', loginData.email)
        
        // Login con Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginData.email,
            password: loginData.password
        })
        
        if (error) {
            console.error('❌ Errore login:', error)
            
            // Messaggi di errore personalizzati
            let errorMessage = 'Errore durante l\'accesso'
            switch (error.message) {
                case 'Invalid login credentials':
                    errorMessage = 'Email o password non corretti'
                    break
                case 'Email not confirmed':
                    errorMessage = 'Conferma la tua email prima di accedere'
                    break
                case 'Too many requests':
                    errorMessage = 'Troppi tentativi. Riprova tra qualche minuto'
                    break
                default:
                    errorMessage = error.message
            }
            
            showNotification(errorMessage, 'error')
            return
        }
        
        if (data.user) {
            console.log('✅ Login effettuato con successo:', data.user.email)
            showNotification('Benvenuto! Accesso effettuato con successo.', 'success')
            
            // Reindirizza alla homepage dopo 2 secondi
            setTimeout(() => {
                window.location.href = '/index.html'
            }, 2000)
        }
        
    } catch (error) {
        console.error('❌ Errore generico:', error)
        showNotification('Errore durante l\'accesso. Riprova.', 'error')
    } finally {
        // Ripristina button
        submitButton.textContent = originalText
        submitButton.disabled = false
    }
}

function validateLoginForm(loginData) {
    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!loginData.email || !emailRegex.test(loginData.email)) {
        showNotification('Email non valida', 'error')
        return false
    }
    
    // Validazione password
    if (!loginData.password || loginData.password.length < 1) {
        showNotification('Password richiesta', 'error')
        return false
    }
    
    return true
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password')
    const toggleButton = document.getElementById('togglePassword')
    const icon = toggleButton.querySelector('i')
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text'
        icon.classList.remove('fa-eye')
        icon.classList.add('fa-eye-slash')
    } else {
        passwordInput.type = 'password'
        icon.classList.remove('fa-eye-slash')
        icon.classList.add('fa-eye')
    }
}

async function handleGoogleLogin() {
    try {
        console.log('🔐 Login con Google')
        showNotification('Reindirizzamento a Google...', 'info')
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/index.html`
            }
        })
        
        if (error) {
            console.error('❌ Errore Google login:', error)
            showNotification('Errore durante il login con Google', 'error')
        }
        
    } catch (error) {
        console.error('❌ Errore generico Google:', error)
        showNotification('Errore durante il login con Google', 'error')
    }
}

async function handleFacebookLogin() {
    try {
        console.log('🔐 Login con Facebook')
        showNotification('Reindirizzamento a Facebook...', 'info')
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: `${window.location.origin}/index.html`
            }
        })
        
        if (error) {
            console.error('❌ Errore Facebook login:', error)
            showNotification('Errore durante il login con Facebook', 'error')
        }
        
    } catch (error) {
        console.error('❌ Errore generico Facebook:', error)
        showNotification('Errore durante il login con Facebook', 'error')
    }
}

// Funzione per logout (se chiamata da altre pagine)
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            console.error('❌ Errore logout:', error)
            showNotification('Errore durante il logout', 'error')
            return
        }
        
        console.log('✅ Logout effettuato con successo')
        showNotification('Logout effettuato con successo', 'success')
        
        // Reindirizza al login
        setTimeout(() => {
            window.location.href = '/login.html'
        }, 1500)
        
    } catch (error) {
        console.error('❌ Errore generico logout:', error)
        showNotification('Errore durante il logout', 'error')
    }
}
