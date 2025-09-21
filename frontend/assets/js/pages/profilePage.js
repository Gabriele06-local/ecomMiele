// Gestione pagina profilo utente
import { supabase } from '../services/supabaseClient.js'
import { showNotification } from '../utils/notifications.js'

document.addEventListener('DOMContentLoaded', function() {
    initializeProfilePage()
})

async function initializeProfilePage() {
    console.log('👤 Inizializzazione pagina profilo')
    
    try {
        // Ottieni l'utente corrente
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
            console.log('❌ Utente non autenticato')
            window.location.href = '/login.html'
            return
        }
        
        console.log('👤 Utente autenticato:', user.email)
        
        // Carica i dati del profilo
        await loadUserProfile(user)
        
        // Carica gli ordini
        await loadUserOrders(user.id)
        
        // Carica le recensioni
        await loadUserReviews(user.id)
        
        // Configura i gestori di eventi
        setupEventListeners(user)
        
    } catch (error) {
        console.error('❌ Errore inizializzazione profilo:', error)
        showNotification('Errore nel caricamento del profilo', 'error')
    }
}

async function loadUserProfile(user) {
    try {
        // Carica il profilo dal database
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        
        if (error) {
            console.error('❌ Errore caricamento profilo:', error)
            // Se il profilo non esiste, crealo
            await createUserProfile(user)
            return
        }
        
        console.log('✅ Profilo caricato:', profile)
        
        // Aggiorna l'interfaccia con i dati del profilo
        updateProfileUI(user, profile)
        
    } catch (error) {
        console.error('❌ Errore caricamento profilo:', error)
    }
}

async function createUserProfile(user) {
    try {
        const { error } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                first_name: user.user_metadata?.first_name || 'Nome',
                last_name: user.user_metadata?.last_name || 'Cognome',
                phone: user.user_metadata?.phone || null,
                newsletter: user.user_metadata?.accept_newsletter || false
            })
        
        if (error) {
            console.error('❌ Errore creazione profilo:', error)
            return
        }
        
        console.log('✅ Profilo creato')
        
        // Ricarica il profilo
        await loadUserProfile(user)
        
    } catch (error) {
        console.error('❌ Errore creazione profilo:', error)
    }
}

function updateProfileUI(user, profile) {
    console.log('🔄 Aggiornamento UI profilo:', { user: user.email, profile })
    
    // Aggiorna nome utente nella sidebar
    const profileNameElement = document.getElementById('profileName')
    if (profileNameElement) {
        profileNameElement.textContent = `${profile.first_name} ${profile.last_name}`
    }
    
    // Aggiorna email nella sidebar
    const profileEmailElement = document.getElementById('profileEmail')
    if (profileEmailElement) {
        profileEmailElement.textContent = user.email
    }
    
    // Aggiorna avatar (se disponibile)
    const profileAvatarElement = document.getElementById('profileAvatar')
    if (profileAvatarElement && profile.avatar_url) {
        profileAvatarElement.src = profile.avatar_url
    }
    
    // Aggiorna statistiche nella sidebar
    const ordersCountElement = document.getElementById('ordersCount')
    if (ordersCountElement) {
        ordersCountElement.textContent = '0' // Sarà aggiornato quando carichiamo gli ordini
    }
    
    const reviewsCountElement = document.getElementById('reviewsCount')
    if (reviewsCountElement) {
        reviewsCountElement.textContent = '0' // Sarà aggiornato quando carichiamo le recensioni
    }
    
    const pointsCountElement = document.getElementById('pointsCount')
    if (pointsCountElement) {
        pointsCountElement.textContent = profile.loyalty_points || 0
    }
    
    // Aggiorna anche la navbar
    updateNavbarProfile(user, profile)
    
    // Aggiorna info account
    updateAccountInfo(profile)
}

function updateNavbarProfile(user, profile) {
    // Aggiorna nome nella navbar
    const navbarUserName = document.getElementById('userName')
    if (navbarUserName) {
        navbarUserName.textContent = `${profile.first_name} ${profile.last_name}`
    }
    
    // Aggiorna email nella navbar se esiste
    const navbarUserEmail = document.querySelector('.user-email')
    if (navbarUserEmail) {
        navbarUserEmail.textContent = user.email
    }
}

function updateAccountInfo(profile) {
    // Aggiorna statistiche
    const stats = {
        orders: 0,
        reviews: 0,
        loyaltyPoints: profile.loyalty_points || 0
    }
    
    // Aggiorna elementi UI
    const orderCountElement = document.querySelector('.order-count')
    if (orderCountElement) {
        orderCountElement.textContent = stats.orders
    }
    
    const reviewCountElement = document.querySelector('.review-count')
    if (reviewCountElement) {
        reviewCountElement.textContent = stats.reviews
    }
    
    const loyaltyPointsElement = document.querySelector('.loyalty-points')
    if (loyaltyPointsElement) {
        loyaltyPointsElement.textContent = stats.loyaltyPoints
    }
}

async function loadUserOrders(userId) {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (
                        name,
                        price,
                        image_url
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5)
        
        if (error) {
            console.error('❌ Errore caricamento ordini:', error)
            return
        }
        
        console.log('✅ Ordini caricati:', orders.length)
        
        // Aggiorna l'UI con gli ordini
        updateOrdersUI(orders)
        
    } catch (error) {
        console.error('❌ Errore caricamento ordini:', error)
    }
}

async function loadUserReviews(userId) {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                products (
                    name,
                    image_url
                )
            `)
            .eq('user_id', userId)
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(5)
        
        if (error) {
            console.error('❌ Errore caricamento recensioni:', error)
            return
        }
        
        console.log('✅ Recensioni caricate:', reviews.length)
        
        // Aggiorna l'UI con le recensioni
        updateReviewsUI(reviews)
        
    } catch (error) {
        console.error('❌ Errore caricamento recensioni:', error)
    }
}

function updateOrdersUI(orders) {
    const ordersContainer = document.querySelector('.recent-orders')
    if (!ordersContainer) return
    
    // Aggiorna il contatore degli ordini
    const ordersCountElement = document.getElementById('ordersCount')
    if (ordersCountElement) {
        ordersCountElement.textContent = orders.length
    }
    
    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>Nessun ordine trovato</p>'
        return
    }
    
    const ordersHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <h4>Ordine #${order.order_number}</h4>
                <p>Data: ${new Date(order.created_at).toLocaleDateString('it-IT')}</p>
                <p>Totale: €${order.total_amount}</p>
                <span class="order-status status-${order.status}">${order.status}</span>
            </div>
        </div>
    `).join('')
    
    ordersContainer.innerHTML = ordersHTML
}

function updateReviewsUI(reviews) {
    const reviewsContainer = document.querySelector('.recent-reviews')
    if (!reviewsContainer) return
    
    // Aggiorna il contatore delle recensioni
    const reviewsCountElement = document.getElementById('reviewsCount')
    if (reviewsCountElement) {
        reviewsCountElement.textContent = reviews.length
    }
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p>Nessuna recensione trovata</p>'
        return
    }
    
    const reviewsHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-info">
                <h4>${review.products?.name || 'Prodotto'}</h4>
                <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <p>${review.comment}</p>
                <small>${new Date(review.created_at).toLocaleDateString('it-IT')}</small>
            </div>
        </div>
    `).join('')
    
    reviewsContainer.innerHTML = reviewsHTML
}

function setupEventListeners(user) {
    // Logout button
    const logoutButton = document.querySelector('.logout-btn')
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await logout()
        })
    }
    
    // Edit profile button
    const editProfileButton = document.querySelector('.edit-profile-btn')
    if (editProfileButton) {
        editProfileButton.addEventListener('click', () => {
            editProfile(user)
        })
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            console.error('❌ Errore logout:', error)
            showNotification('Errore durante il logout', 'error')
            return
        }
        
        console.log('✅ Logout effettuato')
        showNotification('Logout effettuato con successo', 'success')
        
        // Reindirizza al login
        setTimeout(() => {
            window.location.href = '/login.html'
        }, 1500)
        
    } catch (error) {
        console.error('❌ Errore logout:', error)
        showNotification('Errore durante il logout', 'error')
    }
}

function editProfile(user) {
    // Implementa la modifica del profilo
    showNotification('Funzionalità di modifica profilo in arrivo!', 'info')
}

// Esporta funzioni per uso esterno
export { loadUserProfile, loadUserOrders, loadUserReviews }
