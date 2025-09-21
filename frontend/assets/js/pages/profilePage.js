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
        
        // Carica i contatori totali
        await loadUserStats(user.id)
        
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
    
    // Aggiorna il programma fedeltà
    updateLoyaltyProgram(profile.loyalty_points || 0)
    
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

async function loadUserStats(userId) {
    try {
        // Conta tutti gli ordini dell'utente
        const { count: ordersCount, error: ordersError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
        
        if (ordersError) {
            console.error('❌ Errore conteggio ordini:', ordersError)
        } else {
            const ordersCountElement = document.getElementById('ordersCount')
            if (ordersCountElement) {
                ordersCountElement.textContent = ordersCount || 0
            }
        }
        
        // Conta tutte le recensioni dell'utente
        const { count: reviewsCount, error: reviewsError } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
        
        if (reviewsError) {
            console.error('❌ Errore conteggio recensioni:', reviewsError)
        } else {
            const reviewsCountElement = document.getElementById('reviewsCount')
            if (reviewsCountElement) {
                reviewsCountElement.textContent = reviewsCount || 0
            }
        }
        
        console.log('✅ Statistiche caricate:', { ordini: ordersCount, recensioni: reviewsCount })
        
    } catch (error) {
        console.error('❌ Errore caricamento statistiche:', error)
    }
}

function updateLoyaltyProgram(currentPoints) {
    // Sistema punti fedeltà: ogni 150 punti = livello successivo
    const pointsPerLevel = 150
    const currentLevel = Math.floor(currentPoints / pointsPerLevel)
    const pointsInCurrentLevel = currentPoints % pointsPerLevel
    const pointsToNextLevel = pointsPerLevel - pointsInCurrentLevel
    const progressPercentage = (pointsInCurrentLevel / pointsPerLevel) * 100
    
    // Aggiorna il numero dei punti nella card fedeltà
    const loyaltyPointsElement = document.querySelector('.loyalty-points .points-count')
    if (loyaltyPointsElement) {
        loyaltyPointsElement.textContent = currentPoints
    }
    
    // Aggiorna il testo "punti per il prossimo livello"
    const nextLevelElement = document.querySelector('.next-level-text')
    if (nextLevelElement) {
        if (pointsToNextLevel > 0) {
            nextLevelElement.textContent = `${pointsToNextLevel} punti per il prossimo livello`
        } else {
            nextLevelElement.textContent = `Congratulazioni! Hai raggiunto il livello ${currentLevel + 1}`
        }
    }
    
    // Aggiorna la barra di progresso
    const progressBar = document.querySelector('.progress-bar')
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`
    }
    
    // Aggiorna il livello attuale se c'è un elemento per mostrarlo
    const currentLevelElement = document.querySelector('.current-level')
    if (currentLevelElement) {
        currentLevelElement.textContent = `Livello ${currentLevel + 1}`
    }
    
    console.log('✅ Programma fedeltà aggiornato:', { 
        punti: currentPoints, 
        livello: currentLevel + 1, 
        progresso: `${progressPercentage.toFixed(1)}%` 
    })
}

// Funzioni di supporto per gli stati degli ordini
function getOrderStatusText(status) {
    switch (status) {
        case 'pending_payment': return 'Pagamento in Attesa'
        case 'payment_failed': return 'Pagamento Fallito'
        case 'in_corso': return 'In Corso'
        case 'spedito': return 'Spedito'
        case 'completato': return 'Completato'
        case 'cancellato': return 'Cancellato'
        default: return 'Stato Sconosciuto'
    }
}

function getOrderStatusClass(status) {
    switch (status) {
        case 'pending_payment': return 'status-pending'
        case 'payment_failed': return 'status-failed'
        case 'in_corso': return 'status-processing'
        case 'spedito': return 'status-shipped'
        case 'completato': return 'status-completed'
        case 'cancellato': return 'status-cancelled'
        default: return 'status-unknown'
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
    
    const ordersHTML = orders.map(order => {
        const statusText = getOrderStatusText(order.status)
        const statusClass = getOrderStatusClass(order.status)
        const itemsCount = order.order_items?.length || 0
        
        return `
            <div class="order-item">
                <div class="order-info">
                    <h4>Ordine #${order.order_number}</h4>
                    <p>Data: ${new Date(order.created_at).toLocaleDateString('it-IT')}</p>
                    <p>Totale: €${order.total_price.toFixed(2)} (${itemsCount} prodotti)</p>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                <div class="order-actions">
                    <button class="btn btn-outline btn-small" onclick="viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i> Dettagli
                    </button>
                </div>
            </div>
        `
    }).join('')
    
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
    
    const reviewsHTML = reviews.map(review => {
        const rating = '★'.repeat(review.rating)
        const emptyStars = '☆'.repeat(5 - review.rating)
        const reviewDate = new Date(review.created_at).toLocaleDateString('it-IT')
        const approvalStatus = review.is_approved ? 'Approvata' : 'In attesa di moderazione'
        const approvalClass = review.is_approved ? 'approved' : 'pending'
        
        return `
            <div class="review-item">
                <div class="review-header">
                    <h4>${review.products?.name || 'Prodotto'}</h4>
                    <div class="review-rating">${rating}${emptyStars}</div>
                </div>
                <div class="review-content">
                    <p>${review.comment || 'Nessun commento'}</p>
                    <div class="review-meta">
                        <span class="review-date">${reviewDate}</span>
                        <span class="review-status ${approvalClass}">${approvalStatus}</span>
                    </div>
                </div>
            </div>
        `
    }).join('')
    
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

// Visualizza i dettagli di un ordine
function viewOrderDetails(orderId) {
    console.log('👁️ Visualizza dettagli ordine:', orderId)
    
    // Crea un modal semplice per i dettagli dell'ordine
    const modalHtml = `
        <div class="modal active" id="orderDetailsModal" style="z-index: 1001;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Dettagli Ordine</h2>
                    <button class="modal-close" onclick="closeOrderDetailsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Caricamento dettagli...</p>
                    </div>
                </div>
            </div>
        </div>
    `

    // Rimuovi modal esistente se presente
    const existingModal = document.getElementById('orderDetailsModal')
    if (existingModal) {
        existingModal.remove()
    }

    // Aggiungi il nuovo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml)

    // Carica i dettagli dell'ordine
    loadOrderDetails(orderId)

    // Aggiungi event listener per chiudere cliccando fuori
    const modal = document.getElementById('orderDetailsModal')
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeOrderDetailsModal()
        }
    })
}

// Carica i dettagli dell'ordine
async function loadOrderDetails(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (
                        name,
                        image_url,
                        price
                    )
                )
            `)
            .eq('id', orderId)
            .single()

        if (error) {
            throw new Error(error.message)
        }

        const modalBody = document.querySelector('#orderDetailsModal .modal-body')
        if (modalBody) {
            const statusText = getOrderStatusText(order.status)
            const orderDate = new Date(order.created_at).toLocaleDateString('it-IT')
            
            modalBody.innerHTML = `
                <div class="order-details">
                    <div class="order-header">
                        <h3>Ordine #${order.order_number}</h3>
                        <span class="order-status ${getOrderStatusClass(order.status)}">${statusText}</span>
                    </div>
                    
                    <div class="order-info-grid">
                        <div class="info-item">
                            <strong>Data:</strong> ${orderDate}
                        </div>
                        <div class="info-item">
                            <strong>Totale:</strong> €${order.total_price.toFixed(2)}
                        </div>
                        <div class="info-item">
                            <strong>Spedizione:</strong> €${order.shipping_cost.toFixed(2)}
                        </div>
                        <div class="info-item">
                            <strong>Metodo Pagamento:</strong> ${order.payment_method || 'Non specificato'}
                        </div>
                    </div>
                    
                    <div class="order-items">
                        <h4>Prodotti Ordinati</h4>
                        ${order.order_items.map(item => `
                            <div class="order-item-detail">
                                <img src="${item.products?.image_url || 'assets/images/placeholder.jpg'}" 
                                     alt="${item.products?.name}" class="item-image">
                                <div class="item-info">
                                    <h5>${item.products?.name}</h5>
                                    <p>Quantità: ${item.quantity}</p>
                                    <p>Prezzo: €${item.price.toFixed(2)}</p>
                                </div>
                                <div class="item-total">
                                    €${item.total_price.toFixed(2)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        }

    } catch (error) {
        console.error('❌ Errore caricamento dettagli ordine:', error)
        const modalBody = document.querySelector('#orderDetailsModal .modal-body')
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Errore caricamento dettagli ordine</span>
                </div>
            `
        }
    }
}

// Chiude il modal dei dettagli ordine
function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal')
    if (modal) {
        modal.remove()
    }
}

// Rendi le funzioni disponibili globalmente
window.viewOrderDetails = viewOrderDetails
window.closeOrderDetailsModal = closeOrderDetailsModal

// Esporta funzioni per uso esterno
export { loadUserProfile, loadUserOrders, loadUserReviews }
