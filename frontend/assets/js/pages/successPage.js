// Success Page - Gestione completamento ordine
import { supabase } from '../services/supabaseClient.js'
import { getCurrentUser, updateAuthUI } from '../services/auth.js'
import { showNotification } from '../utils/notifications.js'

// Elementi DOM
let loadingState, successState, errorState
let orderNumber, orderDate, orderTotal, orderItemsList, shippingAddress
let errorMessage

// Inizializzazione pagina
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎉 Success Page initialized')
  
  initializeElements()
  await updateAuthUI()
  await handleOrderSuccess()
})

// Inizializza elementi DOM
function initializeElements() {
  loadingState = document.getElementById('loadingState')
  successState = document.getElementById('successState')
  errorState = document.getElementById('errorState')
  
  orderNumber = document.getElementById('orderNumber')
  orderDate = document.getElementById('orderDate')
  orderTotal = document.getElementById('orderTotal')
  orderItemsList = document.getElementById('orderItemsList')
  shippingAddress = document.getElementById('shippingAddress')
  errorMessage = document.getElementById('errorMessage')
}

// Gestisce il completamento dell'ordine
async function handleOrderSuccess() {
  try {
    showLoading()
    
    // Ottieni session_id dall'URL
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    
    if (!sessionId) {
      throw new Error('Session ID mancante. Verifica il link ricevuto.')
    }
    
    console.log('🔍 Verifying order for session:', sessionId)
    
    // Verifica l'utente corrente
    const user = await getCurrentUser()
    if (!user) {
      // Reindirizza al login mantenendo il session_id
      window.location.href = `login.html?redirect=success.html?session_id=${sessionId}`
      return
    }
    
    // Recupera l'ordine dal database
    const order = await getOrderBySessionId(sessionId, user.id)
    
    if (!order) {
      throw new Error('Ordine non trovato. Controlla i tuoi ordini nel profilo.')
    }
    
    // Recupera i dettagli completi dell'ordine
    const orderDetails = await getOrderDetails(order.id)
    
    // Mostra i dettagli dell'ordine
    displayOrderSuccess(orderDetails)
    
    // Pulisci il carrello dopo ordine completato
    await clearUserCart(user.id)
    
    // Mostra notifica di successo
    showNotification('Ordine completato con successo! 🎉', 'success')
    
  } catch (error) {
    console.error('❌ Error handling order success:', error)
    showError(error.message)
  }
}

// Recupera ordine dal session ID
async function getOrderBySessionId(sessionId, userId) {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching order:', error)
      return null
    }
    
    return order
  } catch (error) {
    console.error('Error in getOrderBySessionId:', error)
    return null
  }
}

// Recupera dettagli completi dell'ordine
async function getOrderDetails(orderId) {
  try {
    // Recupera ordine con items e prodotti
    const { data: orderData, error: orderError } = await supabase
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
    
    if (orderError) {
      throw new Error(`Errore nel recupero ordine: ${orderError.message}`)
    }
    
    return orderData
  } catch (error) {
    console.error('Error getting order details:', error)
    throw error
  }
}

// Mostra i dettagli dell'ordine completato
function displayOrderSuccess(order) {
  try {
    // Informazioni base ordine
    orderNumber.textContent = order.order_number || order.id.substring(0, 8).toUpperCase()
    orderDate.textContent = new Date(order.created_at).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    orderTotal.textContent = `€${order.total_price.toFixed(2)}`
    
    // Lista prodotti
    displayOrderItems(order.order_items)
    
    // Indirizzo di spedizione
    displayShippingAddress(order.shipping_address)
    
    // Mostra stato successo
    showSuccess()
    
  } catch (error) {
    console.error('Error displaying order success:', error)
    showError('Errore nella visualizzazione dei dettagli ordine')
  }
}

// Mostra lista prodotti ordinati
function displayOrderItems(items) {
  if (!items || items.length === 0) {
    orderItemsList.innerHTML = '<p>Nessun prodotto trovato</p>'
    return
  }
  
  const itemsHTML = items.map(item => {
    const product = item.products || item.product_snapshot
    const productName = product?.name || 'Prodotto sconosciuto'
    const productImage = product?.image_url || 'assets/images/honey-jar.jpg'
    const productPrice = item.price || product?.price || 0
    
    return `
      <div class="order-item">
        <div class="item-image">
          <img src="${productImage}" alt="${productName}" onerror="this.src='assets/images/honey-jar.jpg'">
        </div>
        <div class="item-details">
          <h4>${productName}</h4>
          <p class="item-price">€${productPrice.toFixed(2)} x ${item.quantity}</p>
          <p class="item-total">Subtotale: €${(productPrice * item.quantity).toFixed(2)}</p>
        </div>
      </div>
    `
  }).join('')
  
  orderItemsList.innerHTML = itemsHTML
}

// Mostra indirizzo di spedizione
function displayShippingAddress(address) {
  if (!address) {
    shippingAddress.innerHTML = '<p>Indirizzo non disponibile</p>'
    return
  }
  
  let addressHTML = ''
  
  if (typeof address === 'string') {
    addressHTML = `<p>${address}</p>`
  } else if (typeof address === 'object') {
    addressHTML = `
      <div class="address-details">
        ${address.name ? `<p><strong>${address.name}</strong></p>` : ''}
        ${address.address_line_1 ? `<p>${address.address_line_1}</p>` : ''}
        ${address.address_line_2 ? `<p>${address.address_line_2}</p>` : ''}
        ${address.city || address.postal_code ? `<p>${address.postal_code || ''} ${address.city || ''}</p>` : ''}
        ${address.country ? `<p>${address.country}</p>` : ''}
        ${address.phone ? `<p>Tel: ${address.phone}</p>` : ''}
      </div>
    `
  }
  
  shippingAddress.innerHTML = addressHTML || '<p>Indirizzo non disponibile</p>'
}

// Pulisci carrello utente dopo ordine completato
async function clearUserCart(userId) {
  try {
    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId)
    
    if (error) {
      console.warn('Warning: Could not clear cart:', error)
      // Non bloccare il flusso per questo errore
    } else {
      console.log('✅ Cart cleared after successful order')
    }
  } catch (error) {
    console.warn('Warning: Error clearing cart:', error)
  }
}

// Mostra stato di caricamento
function showLoading() {
  loadingState.style.display = 'block'
  successState.style.display = 'none'
  errorState.style.display = 'none'
}

// Mostra stato di successo
function showSuccess() {
  loadingState.style.display = 'none'
  successState.style.display = 'block'
  errorState.style.display = 'none'
}

// Mostra stato di errore
function showError(message) {
  loadingState.style.display = 'none'
  successState.style.display = 'none'
  errorState.style.display = 'block'
  
  if (errorMessage) {
    errorMessage.textContent = message
  }
}

// Funzioni di utilità per la formattazione
function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Esporta funzioni per testing
export {
  handleOrderSuccess,
  getOrderBySessionId,
  getOrderDetails,
  displayOrderSuccess
}
