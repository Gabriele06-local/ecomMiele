// Script principale dell'applicazione
import { getCurrentUser, onAuthStateChange, isUserAdmin } from './services/auth.js'
import { cartService, onCartChange } from './services/cart.js'
import { supabase } from './services/supabaseClient.js'

// ===== INIZIALIZZAZIONE =====

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🐝 Miele d\'Autore - Inizializzazione applicazione')
  
  try {
    // Inizializza i componenti dell'applicazione
    await initializeApp()
    
    // Configura i listener globali
    setupGlobalListeners()
    
    // Carica i dati iniziali
    await loadInitialData()
    
    console.log('✅ Applicazione inizializzata con successo')
  } catch (error) {
    console.error('❌ Errore inizializzazione applicazione:', error)
    showNotification('Errore di inizializzazione', 'error')
  }
})

// ===== INIZIALIZZAZIONE APPLICAZIONE =====

async function initializeApp() {
  // Verifica la configurazione Supabase
  if (!supabase) {
    console.warn('⚠️ Supabase non configurato correttamente')
    return
  }

  // Inizializza l'autenticazione
  await initializeAuth()
  
  // Inizializza il carrello
  await initializeCart()
  
  // Inizializza la navbar
  initializeNavbar()
  
  // Inizializza l'AI chatbot
  initializeAIChatbot()
  
  // Inizializza i componenti specifici della pagina
  initializePageComponents()
}

// ===== AUTENTICAZIONE =====

async function initializeAuth() {
  // Listener per i cambiamenti di autenticazione
  onAuthStateChange(async (event, session) => {
    console.log('🔐 Cambio stato autenticazione:', event)
    
    if (event === 'SIGNED_IN' && session) {
      // Utente loggato
      await handleUserLogin(session.user)
    } else if (event === 'SIGNED_OUT') {
      // Utente disconnesso
      handleUserLogout()
    }
  })

  // Verifica se c'è già una sessione attiva
  const user = await getCurrentUser()
  if (user) {
    await handleUserLogin(user)
  }
}

async function handleUserLogin(user) {
  try {
    console.log('👤 Utente loggato:', user.email)
    
    // Aggiorna la navbar
    updateNavbarForLoggedUser(user)
    
    // Sincronizza il carrello con il database
    await cartService.syncWithDatabase()
    
    // Carica le preferenze utente
    await loadUserPreferences(user.id)
    
  } catch (error) {
    console.error('Errore gestione login:', error)
  }
}

function handleUserLogout() {
  console.log('👤 Utente disconnesso')
  
  // Aggiorna la navbar
  updateNavbarForLoggedOutUser()
  
  // Pulisci i dati locali
  clearUserData()
}

// ===== NAVBAR =====

function initializeNavbar() {
  const navbarToggle = document.getElementById('navbarToggle')
  const navbarMenu = document.getElementById('navbarMenu')
  const userBtn = document.getElementById('userBtn')
  const userMenu = document.getElementById('userMenu')
  const logoutBtn = document.getElementById('logoutBtn')

  // Toggle menu mobile
  if (navbarToggle && navbarMenu) {
    navbarToggle.addEventListener('click', () => {
      navbarMenu.classList.toggle('active')
      navbarToggle.classList.toggle('active')
    })
  }

  // Toggle menu utente
  if (userBtn && userMenu) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      userMenu.classList.toggle('active')
    })
  }

  // Chiudi menu utente quando si clicca fuori
  document.addEventListener('click', (e) => {
    if (userMenu && !userMenu.contains(e.target) && !userBtn?.contains(e.target)) {
      userMenu.classList.remove('active')
    }
  })

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const { signOut } = await import('./services/auth.js')
        await signOut()
        window.location.href = 'index.html'
      } catch (error) {
        console.error('Errore logout:', error)
        showNotification('Errore durante il logout', 'error')
      }
    })
  }
}

function updateNavbarForLoggedUser(user) {
  const navbarAuth = document.getElementById('navbarAuth')
  const navbarUser = document.getElementById('navbarUser')
  const userName = document.getElementById('userName')
  const adminLink = document.getElementById('adminLink')

  if (navbarAuth) navbarAuth.style.display = 'none'
  if (navbarUser) navbarUser.style.display = 'block'
  if (userName) userName.textContent = user.user_metadata?.first_name || user.email

  // Verifica se l'utente è admin
  isUserAdmin().then(isAdmin => {
    if (adminLink) {
      adminLink.style.display = isAdmin ? 'block' : 'none'
    }
  })
}

function updateNavbarForLoggedOutUser() {
  const navbarAuth = document.getElementById('navbarAuth')
  const navbarUser = document.getElementById('navbarUser')

  if (navbarAuth) navbarAuth.style.display = 'flex'
  if (navbarUser) navbarUser.style.display = 'none'
}

// ===== CARRELLO =====

async function initializeCart() {
  // Listener per i cambiamenti del carrello
  onCartChange((items, count, total) => {
    updateCartUI(count)
  })

  // Aggiorna l'UI iniziale
  updateCartUI(cartService.getItemCount())
}

function updateCartUI(itemCount) {
  const cartCount = document.getElementById('cartCount')
  if (cartCount) {
    cartCount.textContent = itemCount
    cartCount.style.display = itemCount > 0 ? 'flex' : 'none'
  }
}

// ===== AI CHATBOT =====

function initializeAIChatbot() {
  const chatbot = document.getElementById('aiChatbot')
  const chatbotToggle = document.getElementById('aiAssistantToggle')
  const chatbotClose = document.getElementById('chatbotClose')
  const chatbotSend = document.getElementById('chatbotSend')
  const chatbotInput = document.getElementById('chatbotInput')
  const aiAssistantBtn = document.getElementById('aiAssistantBtn')

  // Toggle chatbot
  if (chatbotToggle && chatbot) {
    chatbotToggle.addEventListener('click', () => {
      chatbot.classList.toggle('active')
    })
  }

  if (aiAssistantBtn && chatbot) {
    aiAssistantBtn.addEventListener('click', () => {
      chatbot.classList.toggle('active')
    })
  }

  // Chiudi chatbot
  if (chatbotClose && chatbot) {
    chatbotClose.addEventListener('click', () => {
      chatbot.classList.remove('active')
    })
  }

  // Invio messaggio
  if (chatbotSend && chatbotInput) {
    chatbotSend.addEventListener('click', sendAIMessage)
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendAIMessage()
      }
    })
  }
}

async function sendAIMessage() {
  const chatbotInput = document.getElementById('chatbotInput')
  const chatbotMessages = document.getElementById('chatbotMessages')
  
  if (!chatbotInput || !chatbotMessages) return

  const message = chatbotInput.value.trim()
  if (!message) return

  // Aggiungi il messaggio utente
  addMessageToChat('user', message)
  
  // Pulisci l'input
  chatbotInput.value = ''

  try {
    // Invia il messaggio all'AI
    const response = await fetch('/api/ai-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    })

    if (!response.ok) {
      throw new Error('Errore risposta AI')
    }

    const data = await response.json()
    addMessageToChat('assistant', data.response)
  } catch (error) {
    console.error('Errore invio messaggio AI:', error)
    addMessageToChat('assistant', 'Mi dispiace, si è verificato un errore. Riprova più tardi.')
  }
}

function addMessageToChat(type, message) {
  const chatbotMessages = document.getElementById('chatbotMessages')
  if (!chatbotMessages) return

  const messageDiv = document.createElement('div')
  messageDiv.className = `message ${type}-message`

  const avatar = document.createElement('div')
  avatar.className = 'message-avatar'
  avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'

  const content = document.createElement('div')
  content.className = 'message-content'
  content.innerHTML = `<p>${message}</p>`

  messageDiv.appendChild(avatar)
  messageDiv.appendChild(content)
  chatbotMessages.appendChild(messageDiv)

  // Scroll to bottom
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight
}

// ===== COMPONENTI PAGINA =====

function initializePageComponents() {
  const currentPage = getCurrentPage()

  switch (currentPage) {
    case 'index':
      initializeHomePage()
      break
    case 'product':
      initializeProductPage()
      break
    case 'cart':
      initializeCartPage()
      break
    case 'login':
      initializeLoginPage()
      break
    case 'signup':
      initializeSignupPage()
      break
    case 'profile':
      initializeProfilePage()
      break
    case 'admin':
      initializeAdminPage()
      break
  }
}

function getCurrentPage() {
  const path = window.location.pathname
  const filename = path.split('/').pop()
  return filename.replace('.html', '') || 'index'
}

// ===== PAGINE SPECIFICHE =====

function initializeHomePage() {
  // Carica prodotti in evidenza
  loadFeaturedProducts()
}

function initializeProductPage() {
  // Implementato in productPage.js
}

function initializeCartPage() {
  // Implementato in cartPage.js
}

function initializeLoginPage() {
  // Implementato nei rispettivi file
}

function initializeSignupPage() {
  // Implementato nei rispettivi file
}

function initializeProfilePage() {
  // Implementato nei rispettivi file
}

function initializeAdminPage() {
  // Implementato in adminPage.js
}

// ===== CARICAMENTO DATI =====

async function loadInitialData() {
  // Carica solo i dati necessari per la pagina corrente
  const currentPage = getCurrentPage()
  
  if (currentPage === 'index') {
    await loadFeaturedProducts()
  }
}

async function loadFeaturedProducts() {
  try {
    const { getFeaturedProducts } = await import('./services/api.js')
    const result = await getFeaturedProducts(4)
    
    if (result.success) {
      displayFeaturedProducts(result.data)
    }
  } catch (error) {
    console.error('Errore caricamento prodotti in evidenza:', error)
  }
}

function displayFeaturedProducts(products) {
  const container = document.getElementById('featuredProducts')
  if (!container) return

  if (products.length === 0) {
    container.innerHTML = '<p>Nessun prodotto disponibile al momento.</p>'
    return
  }

  container.innerHTML = products.map(product => `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-card-image">
        <img src="${product.image_url || 'assets/images/placeholder.jpg'}" alt="${product.name}" loading="lazy">
        ${product.stock < 5 ? '<div class="product-card-badge sale">Ultimi pezzi</div>' : ''}
      </div>
      <div class="product-card-content">
        <div class="product-card-category">${product.category}</div>
        <h3 class="product-card-title">${product.name}</h3>
        <p class="product-card-description">${product.description}</p>
        <div class="product-card-rating">
          <div class="product-card-stars">
            ${generateStars(product.rating)}
          </div>
          <span class="product-card-rating-text">(${product.reviewCount})</span>
        </div>
        <div class="product-card-price">
          <span class="product-card-price-current">€${product.price.toFixed(2)}</span>
        </div>
        <div class="product-card-footer">
          <button class="btn btn-primary product-card-btn" onclick="addToCartFromCard('${product.id}')">
            <i class="fas fa-cart-plus"></i>
            Aggiungi al Carrello
          </button>
        </div>
      </div>
    </div>
  `).join('')
}

function generateStars(rating) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  let stars = ''
  
  // Stelle piene
  for (let i = 0; i < fullStars; i++) {
    stars += '<i class="fas fa-star product-card-star"></i>'
  }
  
  // Mezza stella
  if (hasHalfStar) {
    stars += '<i class="fas fa-star-half-alt product-card-star"></i>'
  }
  
  // Stelle vuote
  for (let i = 0; i < emptyStars; i++) {
    stars += '<i class="far fa-star product-card-star empty"></i>'
  }
  
  return stars
}

// ===== LISTENER GLOBALI =====

function setupGlobalListeners() {
  // Listener per i pulsanti "Aggiungi al carrello" globali
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.add-to-cart-btn')) {
      e.preventDefault()
      const button = e.target.closest('.add-to-cart-btn')
      const productId = button.dataset.productId
      const quantity = parseInt(button.dataset.quantity) || 1
      
      if (productId) {
        await addToCartFromButton(button, productId, quantity)
      }
    }
  })

  // Listener per i form di ricerca
  document.addEventListener('submit', async (e) => {
    if (e.target.classList.contains('search-form')) {
      e.preventDefault()
      const formData = new FormData(e.target)
      const query = formData.get('search')
      if (query) {
        window.location.href = `product.html?search=${encodeURIComponent(query)}`
      }
    }
  })
}

// ===== FUNZIONI UTILITÀ =====

async function addToCartFromCard(productId) {
  try {
    const { addToCart } = await import('./services/cart.js')
    const { getProduct } = await import('./services/api.js')
    
    // Ottieni i dettagli del prodotto
    const productResult = await getProduct(productId)
    if (!productResult.success) {
      throw new Error('Errore recupero prodotto')
    }

    const product = productResult.data
    const result = await addToCart(productId, 1, {
      name: product.name,
      price: product.price,
      image_url: product.image_url
    })

    if (result.success) {
      showNotification(`${product.name} aggiunto al carrello!`, 'success')
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore aggiunta al carrello:', error)
    showNotification('Errore aggiunta al carrello', 'error')
  }
}

async function addToCartFromButton(button, productId, quantity) {
  const originalText = button.innerHTML
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
  button.disabled = true

  try {
    const { addToCart } = await import('./services/cart.js')
    const { getProduct } = await import('./services/api.js')
    
    const productResult = await getProduct(productId)
    if (!productResult.success) {
      throw new Error('Errore recupero prodotto')
    }

    const product = productResult.data
    const result = await addToCart(productId, quantity, {
      name: product.name,
      price: product.price,
      image_url: product.image_url
    })

    if (result.success) {
      showNotification(`${product.name} aggiunto al carrello!`, 'success')
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore aggiunta al carrello:', error)
    showNotification('Errore aggiunta al carrello', 'error')
  } finally {
    button.innerHTML = originalText
    button.disabled = false
  }
}

function clearUserData() {
  // Pulisci i dati dell'utente dal localStorage
  localStorage.removeItem('user_preferences')
  // Il carrello viene pulito automaticamente dal servizio auth
}

async function loadUserPreferences(userId) {
  try {
    // Carica le preferenze utente se necessario
    console.log('Caricamento preferenze utente:', userId)
  } catch (error) {
    console.error('Errore caricamento preferenze:', error)
  }
}

// ===== NOTIFICHE =====

function showNotification(message, type = 'info') {
  // Crea l'elemento notifica
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${getNotificationIcon(type)}"></i>
      <span>${message}</span>
    </div>
    <button class="notification-close">
      <i class="fas fa-times"></i>
    </button>
  `

  // Aggiungi gli stili se non esistono
  if (!document.getElementById('notification-styles')) {
    const styles = document.createElement('style')
    styles.id = 'notification-styles'
    styles.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        min-width: 300px;
        animation: slideIn 0.3s ease-out;
      }
      
      .notification-success {
        border-left: 4px solid var(--success-color);
      }
      
      .notification-error {
        border-left: 4px solid var(--error-color);
      }
      
      .notification-warning {
        border-left: 4px solid var(--warning-color);
      }
      
      .notification-info {
        border-left: 4px solid var(--info-color);
      }
      
      .notification-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex: 1;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: var(--text-light);
        cursor: pointer;
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
      }
      
      .notification-close:hover {
        background: var(--bg-secondary);
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `
    document.head.appendChild(styles)
  }

  // Aggiungi al DOM
  document.body.appendChild(notification)

  // Listener per chiudere la notifica
  const closeBtn = notification.querySelector('.notification-close')
  closeBtn.addEventListener('click', () => {
    notification.remove()
  })

  // Rimuovi automaticamente dopo 5 secondi
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success': return 'check-circle'
    case 'error': return 'exclamation-circle'
    case 'warning': return 'exclamation-triangle'
    case 'info': return 'info-circle'
    default: return 'info-circle'
  }
}

// ===== ESERCIZIO FUNZIONI GLOBALI =====

// Rendi disponibili alcune funzioni globalmente
window.addToCartFromCard = addToCartFromCard
window.showNotification = showNotification
