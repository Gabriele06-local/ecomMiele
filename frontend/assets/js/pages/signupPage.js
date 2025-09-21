// Gestione pagina di registrazione
import { supabase } from '../services/supabaseClient.js'
import { showNotification } from '../utils/notifications.js'

document.addEventListener('DOMContentLoaded', function() {
    initializeSignupPage()
})

function initializeSignupPage() {
    console.log('📝 Inizializzazione pagina registrazione')
    
    const signupForm = document.getElementById('signupForm')
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup)
    }
    
    // Validazione password in tempo reale
    const passwordInput = document.getElementById('password')
    const confirmPasswordInput = document.getElementById('confirmPassword')
    
    if (passwordInput) {
        passwordInput.addEventListener('input', validatePassword)
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch)
    }
}

async function handleSignup(event) {
    event.preventDefault()
    console.log('📝 Tentativo di registrazione')
    
    const formData = new FormData(event.target)
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        phone: formData.get('phone'),
        acceptTerms: formData.get('acceptTerms'),
        acceptNewsletter: formData.get('acceptNewsletter')
    }
    
    // Validazione
    if (!validateForm(userData)) {
        return
    }
    
    // Mostra loading
    const submitButton = event.target.querySelector('button[type="submit"]')
    const originalText = submitButton.textContent
    submitButton.textContent = 'Creazione Account...'
    submitButton.disabled = true
    
    try {
        console.log('🔐 Registrazione utente:', userData.email)
        
        // Registrazione con Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    phone: userData.phone || null,
                    accept_newsletter: userData.acceptNewsletter === 'on'
                }
            }
        })
        
        if (error) {
            console.error('❌ Errore registrazione:', error)
            showNotification('Errore durante la registrazione: ' + error.message, 'error')
            return
        }
        
        if (data.user) {
            console.log('✅ Utente registrato con successo:', data.user.email)
            showNotification('Account creato con successo! Controlla la tua email per verificare l\'account.', 'success')
            
            // Reindirizza al login dopo 3 secondi
            setTimeout(() => {
                window.location.href = '/login.html'
            }, 3000)
        }
        
    } catch (error) {
        console.error('❌ Errore generico:', error)
        showNotification('Errore durante la registrazione. Riprova.', 'error')
    } finally {
        // Ripristina button
        submitButton.textContent = originalText
        submitButton.disabled = false
    }
}

function validateForm(userData) {
    // Validazione nome
    if (!userData.firstName || userData.firstName.trim().length < 2) {
        showNotification('Nome deve essere di almeno 2 caratteri', 'error')
        return false
    }
    
    // Validazione cognome
    if (!userData.lastName || userData.lastName.trim().length < 2) {
        showNotification('Cognome deve essere di almeno 2 caratteri', 'error')
        return false
    }
    
    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!userData.email || !emailRegex.test(userData.email)) {
        showNotification('Email non valida', 'error')
        return false
    }
    
    // Validazione password
    if (!userData.password || userData.password.length < 8) {
        showNotification('Password deve essere di almeno 8 caratteri', 'error')
        return false
    }
    
    // Validazione conferma password
    if (userData.password !== userData.confirmPassword) {
        showNotification('Le password non coincidono', 'error')
        return false
    }
    
    // Validazione termini
    if (!userData.acceptTerms) {
        showNotification('Devi accettare i Termini di Servizio', 'error')
        return false
    }
    
    return true
}

function validatePassword(event) {
    const password = event.target.value
    const strengthIndicator = document.getElementById('passwordStrength')
    
    if (!strengthIndicator) return
    
    let strength = 0
    let message = ''
    
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    switch (strength) {
        case 0:
        case 1:
            message = 'Password debole'
            strengthIndicator.className = 'password-strength weak'
            break
        case 2:
        case 3:
            message = 'Password media'
            strengthIndicator.className = 'password-strength medium'
            break
        case 4:
        case 5:
            message = 'Password forte'
            strengthIndicator.className = 'password-strength strong'
            break
    }
    
    strengthIndicator.textContent = message
}

function validatePasswordMatch(event) {
    const password = document.getElementById('password').value
    const confirmPassword = event.target.value
    const matchIndicator = document.getElementById('passwordMatch')
    
    if (!matchIndicator) return
    
    if (confirmPassword && password !== confirmPassword) {
        matchIndicator.textContent = 'Le password non coincidono'
        matchIndicator.className = 'password-match error'
    } else if (confirmPassword) {
        matchIndicator.textContent = 'Le password coincidono'
        matchIndicator.className = 'password-match success'
    } else {
        matchIndicator.textContent = ''
        matchIndicator.className = 'password-match'
    }
}
