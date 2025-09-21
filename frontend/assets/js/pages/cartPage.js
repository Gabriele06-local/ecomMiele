// Pagina carrello
import { supabase } from '../services/supabaseClient.js'
import { cartService, updateCartQuantity, removeFromCart, clearCart } from '../services/cart.js'
import { getCurrentUser } from '../services/auth.js'

// Variabili globali
let cartItems = []
let cartTotal = 0
let isLoggedIn = false

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🛒 Inizializzazione pagina carrello')
  
  try {
    await initializeCartPage()
  } catch (error) {
    console.error('Errore inizializzazione pagina carrello:', error)
    showError('Errore caricamento carrello')
  }
})

async function initializeCartPage() {
  // Verifica se l'utente è loggato
  const user = await getCurrentUser()
  isLoggedIn = !!user

  // Carica il carrello
  await loadCart()
  
  // Inizializza i listener degli eventi
  initializeEventListeners()
  
  // Aggiorna l'UI
  updateCartUI()
}

// Carica il carrello
async function loadCart() {
  try {
    // Imposta l'utente corrente se loggato
    if (isLoggedIn) {
      const user = await getCurrentUser()
      await cartService.setCurrentUser(user.id)
    } else {
      await cartService.setCurrentUser(null)
    }

    cartItems = cartService.getItems()
    cartTotal = cartService.getTotal()
    
    console.log('Carrello caricato:', cartItems)
  } catch (error) {
    console.error('Errore caricamento carrello:', error)
    throw error
  }
}

// Inizializza i listener degli eventi
function initializeEventListeners() {
  // Listener per i cambiamenti del carrello
  cartService.addListener(handleCartChange)
  
  // Listener per il checkout
  const checkoutBtn = document.getElementById('checkoutBtn')
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout)
  }

  // Listener per continuare come ospite
  const continueAsGuestBtn = document.getElementById('continueAsGuest')
  if (continueAsGuestBtn) {
    continueAsGuestBtn.addEventListener('click', handleContinueAsGuest)
  }

  // Listener per i modali
  initializeModalListeners()
}

// Gestisce i cambiamenti del carrello
function handleCartChange(items, count, total) {
  cartItems = items
  cartTotal = total
  updateCartUI()
}

// Aggiorna l'UI del carrello
function updateCartUI() {
  updateCartItems()
  updateCartSummary()
  updateEmptyState()
}

// Aggiorna gli elementi del carrello
function updateCartItems() {
  const container = document.getElementById('cartItems')
  const emptyCart = document.getElementById('emptyCart')
  const cartSummary = document.getElementById('cartSummary')
  
  if (!container) return

  if (cartItems.length === 0) {
    container.style.display = 'none'
    if (emptyCart) emptyCart.style.display = 'block'
    if (cartSummary) cartSummary.style.display = 'none'
    return
  }

  container.style.display = 'block'
  if (emptyCart) emptyCart.style.display = 'none'
  if (cartSummary) cartSummary.style.display = 'block'

  container.innerHTML = cartItems.map(item => `
    <div class="cart-item" data-product-id="${item.product_id}">
      <div class="cart-item-image">
        <img src="${item.image_url || 'assets/images/placeholder.jpg'}" alt="${item.name}" loading="lazy">
      </div>
      
      <div class="cart-item-info">
        <h3 class="cart-item-name">${item.name}</h3>
        <div class="cart-item-category">${item.category || ''}</div>
        <div class="cart-item-price">€${(item.price || 0).toFixed(2)}</div>
      </div>
      
      <div class="cart-item-actions">
        <div class="quantity-controls">
          <button class="quantity-btn decrease-btn" onclick="decreaseQuantity('${item.product_id}')">
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" 
                 onchange="updateQuantity('${item.product_id}', this.value)">
          <button class="quantity-btn increase-btn" onclick="increaseQuantity('${item.product_id}')">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        
        <button class="cart-item-remove" onclick="removeItem('${item.product_id}')" title="Rimuovi">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('')
}

// Aggiorna il riepilogo del carrello
function updateCartSummary() {
  const subtotalElement = document.getElementById('subtotal')
  const shippingElement = document.getElementById('shipping')
  const totalElement = document.getElementById('total')
  const shippingNote = document.getElementById('shippingNote')
  
  if (!subtotalElement || !totalElement) return

  const subtotal = cartTotal
  const shippingThreshold = 50
  const shippingCost = subtotal >= shippingThreshold ? 0 : 5.99
  const total = subtotal + shippingCost

  subtotalElement.textContent = `€${subtotal.toFixed(2)}`
  
  if (shippingElement) {
    shippingElement.textContent = shippingCost === 0 ? 'Gratuita' : `€${shippingCost.toFixed(2)}`
  }
  
  totalElement.textContent = `€${total.toFixed(2)}`

  // Mostra/nasconde la nota sulla spedizione gratuita
  if (shippingNote) {
    shippingNote.style.display = subtotal < shippingThreshold ? 'block' : 'none'
  }
}

// Aggiorna lo stato vuoto del carrello
function updateEmptyState() {
  const emptyCart = document.getElementById('emptyCart')
  const cartItems = document.getElementById('cartItems')
  
  if (!emptyCart) return

  if (cartItems.length === 0) {
    emptyCart.style.display = 'block'
    if (cartItems) cartItems.style.display = 'none'
  } else {
    emptyCart.style.display = 'none'
    if (cartItems) cartItems.style.display = 'block'
  }
}

// Gestisce il checkout
async function handleCheckout() {
  try {
    if (cartItems.length === 0) {
      showNotification('Il carrello è vuoto', 'warning')
      return
    }

    // Verifica se l'utente è loggato
    if (!isLoggedIn) {
      showLoginPrompt()
      return
    }

    // Procedi al checkout
    await proceedToCheckout()
  } catch (error) {
    console.error('Errore checkout:', error)
    showNotification('Errore durante il checkout', 'error')
  }
}

// Procede al checkout
async function proceedToCheckout() {
  try {
    showLoading('Elaborazione ordine...')

    // Prepara i dati per il checkout
    const checkoutData = {
      items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
    }

    // Invia la richiesta di checkout usando Supabase Edge Function
    const { data: result, error } = await supabase.functions.invoke('checkout', {
      body: checkoutData
    })

    if (error) {
      throw new Error(error.message || 'Errore connessione checkout')
    }

    if (result && result.success && result.data?.checkout_url) {
      // Reindirizza a Stripe
      window.location.href = result.data.checkout_url
    } else {
      throw new Error(result?.error || 'Errore durante la creazione del checkout')
    }
  } catch (error) {
    console.error('Errore checkout:', error)
    showNotification('Errore durante il checkout. Riprova più tardi.', 'error')
  } finally {
    hideLoading()
  }
}

// Mostra il prompt di login
function showLoginPrompt() {
  const modal = document.getElementById('loginPromptModal')
  if (modal) {
    modal.classList.add('active')
  }
}

// Gestisce il continuare come ospite
function handleContinueAsGuest() {
  // Chiudi il modal
  const modal = document.getElementById('loginPromptModal')
  if (modal) {
    modal.classList.remove('active')
  }
  
  // Procedi al checkout come ospite
  proceedToCheckout()
}

// Inizializza i listener dei modali
function initializeModalListeners() {
  const loginPromptModal = document.getElementById('loginPromptModal')
  const loginPromptClose = document.getElementById('loginPromptClose')

  if (loginPromptClose && loginPromptModal) {
    loginPromptClose.addEventListener('click', () => {
      loginPromptModal.classList.remove('active')
    })
  }

  // Chiudi il modal cliccando fuori
  if (loginPromptModal) {
    loginPromptModal.addEventListener('click', (e) => {
      if (e.target === loginPromptModal) {
        loginPromptModal.classList.remove('active')
      }
    })
  }
}

// ===== FUNZIONI PER GESTIRE QUANTITÀ E RIMOZIONE =====

// Diminuisce la quantità
async function decreaseQuantity(productId) {
  const item = cartItems.find(item => item.product_id === productId)
  if (!item) return

  const newQuantity = Math.max(1, item.quantity - 1)
  await updateQuantity(productId, newQuantity)
}

// Aumenta la quantità
async function increaseQuantity(productId) {
  const item = cartItems.find(item => item.product_id === productId)
  if (!item) return

  const newQuantity = Math.min(99, item.quantity + 1)
  await updateQuantity(productId, newQuantity)
}

// Aggiorna la quantità
async function updateQuantity(productId, quantity) {
  try {
    const numQuantity = parseInt(quantity)
    
    if (isNaN(numQuantity) || numQuantity < 1) {
      throw new Error('Quantità non valida')
    }

    const result = await updateCartQuantity(productId, numQuantity)
    
    if (!result.success) {
      throw new Error(result.error)
    }

    showNotification('Quantità aggiornata', 'success')
  } catch (error) {
    console.error('Errore aggiornamento quantità:', error)
    showNotification('Errore aggiornamento quantità', 'error')
    
    // Ripristina il valore originale
    const item = cartItems.find(item => item.product_id === productId)
    if (item) {
      const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`)
      if (input) {
        input.value = item.quantity
      }
    }
  }
}

// Rimuove un elemento dal carrello
async function removeItem(productId) {
  try {
    const item = cartItems.find(item => item.product_id === productId)
    if (!item) return

    // Conferma la rimozione
    if (!confirm(`Sei sicuro di voler rimuovere "${item.name}" dal carrello?`)) {
      return
    }

    const result = await removeFromCart(productId)
    
    if (!result.success) {
      throw new Error(result.error)
    }

    showNotification(`${item.name} rimosso dal carrello`, 'success')
  } catch (error) {
    console.error('Errore rimozione elemento:', error)
    showNotification('Errore rimozione elemento', 'error')
  }
}

// ===== FUNZIONI UTILITÀ =====

// Mostra il loading
function showLoading(message = 'Caricamento...') {
  // Implementa un overlay di loading se necessario
  console.log('Loading:', message)
}

// Nasconde il loading
function hideLoading() {
  // Rimuovi l'overlay di loading se necessario
}

// Mostra un errore
function showError(message) {
  const container = document.getElementById('cartItems')
  if (!container) return

  container.innerHTML = `
    <div class="error-message">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h3>Errore</h3>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="location.reload()">
        <i class="fas fa-refresh"></i>
        Riprova
      </button>
    </div>
  `
}

// Mostra una notifica
function showNotification(message, type = 'info') {
  if (window.showNotification) {
    window.showNotification(message, type)
  } else {
    console.log(`${type.toUpperCase()}: ${message}`)
  }
}

// Rendi disponibili le funzioni globalmente
window.decreaseQuantity = decreaseQuantity
window.increaseQuantity = increaseQuantity
window.updateQuantity = updateQuantity
window.removeItem = removeItem
