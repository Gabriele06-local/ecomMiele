// Pagina admin
import { getCurrentUser, isUserAdmin } from '../services/auth.js'
import { getProducts, getAdminStats } from '../services/api.js'

// Variabili globali
let currentTab = 'overview'
let currentProducts = []
let adminStats = {}

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', async () => {
  console.log('⚙️ Inizializzazione pagina admin')
  
  try {
    // Verifica se l'utente è admin
    const user = await getCurrentUser()
    if (!user) {
      redirectToLogin()
      return
    }

    const isAdmin = await isUserAdmin()
    if (!isAdmin) {
      redirectToHome()
      return
    }

    await initializeAdminPage()
  } catch (error) {
    console.error('Errore inizializzazione pagina admin:', error)
    showError('Errore caricamento dashboard admin')
  }
})

async function initializeAdminPage() {
  // Inizializza la navigazione
  initializeAdminNavigation()
  
  // Carica i dati iniziali
  await loadInitialData()
  
  // Inizializza i componenti specifici delle tab
  initializeTabComponents()
}

// Inizializza la navigazione admin
function initializeAdminNavigation() {
  const navItems = document.querySelectorAll('.admin-nav-item')
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.tab
      switchTab(tabName)
    })
  })
}

// Cambia tab
function switchTab(tabName) {
  // Aggiorna la navigazione
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.remove('active')
  })
  
  const activeNavItem = document.querySelector(`[data-tab="${tabName}"]`)
  if (activeNavItem) {
    activeNavItem.classList.add('active')
  }

  // Aggiorna il contenuto
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.classList.remove('active')
  })
  
  const activeTab = document.getElementById(`${tabName}Tab`)
  if (activeTab) {
    activeTab.classList.add('active')
  }

  currentTab = tabName

  // Carica i dati specifici della tab
  loadTabData(tabName)
}

// Carica i dati iniziali
async function loadInitialData() {
  try {
    // Carica le statistiche per la panoramica
    await loadAdminStats()
  } catch (error) {
    console.error('Errore caricamento dati iniziali:', error)
  }
}

// Carica le statistiche admin
async function loadAdminStats() {
  try {
    const result = await getAdminStats()
    
    if (result.success) {
      adminStats = result.data
      updateStatsDisplay()
    }
  } catch (error) {
    console.error('Errore caricamento statistiche:', error)
  }
}

// Aggiorna la visualizzazione delle statistiche
function updateStatsDisplay() {
  const totalOrdersElement = document.getElementById('totalOrders')
  const totalRevenueElement = document.getElementById('totalRevenue')
  const totalCustomersElement = document.getElementById('totalCustomers')
  const totalProductsElement = document.getElementById('totalProducts')

  if (totalOrdersElement) {
    totalOrdersElement.textContent = adminStats.totalOrders || 0
  }

  if (totalRevenueElement) {
    totalRevenueElement.textContent = `€${(adminStats.totalRevenue || 0).toFixed(2)}`
  }

  if (totalCustomersElement) {
    totalCustomersElement.textContent = adminStats.totalCustomers || 0
  }

  if (totalProductsElement) {
    totalProductsElement.textContent = adminStats.totalProducts || 0
  }
}

// Inizializza i componenti specifici delle tab
function initializeTabComponents() {
  // Inizializza i filtri dei prodotti
  initializeProductFilters()
  
  // Inizializza i modali
  initializeModals()
}

// Inizializza i filtri dei prodotti
function initializeProductFilters() {
  const searchInput = document.getElementById('productSearch')
  const categoryFilter = document.getElementById('categoryFilter')
  const statusFilter = document.getElementById('statusFilter')

  if (searchInput) {
    let searchTimeout
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        loadProducts()
      }, 500)
    })
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', loadProducts)
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', loadProducts)
  }
}

// Inizializza i modali
function initializeModals() {
  const productModal = document.getElementById('productModal')
  const productModalClose = document.getElementById('productModalClose')
  const addProductBtn = document.getElementById('addProductBtn')

  // Modal prodotto
  if (productModalClose && productModal) {
    productModalClose.addEventListener('click', () => {
      productModal.classList.remove('active')
    })
  }

  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      openProductModal()
    })
  }

  // Chiudi modali cliccando fuori
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active')
    }
  })
}

// Carica i dati specifici della tab
async function loadTabData(tabName) {
  switch (tabName) {
    case 'overview':
      await loadOverviewData()
      break
    case 'products':
      await loadProducts()
      break
    case 'orders':
      await loadOrders()
      break
    case 'reviews':
      await loadReviews()
      break
    case 'customers':
      await loadCustomers()
      break
    case 'analytics':
      await loadAnalytics()
      break
    case 'settings':
      await loadSettings()
      break
  }
}

// Carica i dati della panoramica
async function loadOverviewData() {
  try {
    // Carica ordini recenti
    await loadRecentOrders()
    
    // Carica recensioni in attesa
    await loadPendingReviews()
  } catch (error) {
    console.error('Errore caricamento dati panoramica:', error)
  }
}

// Carica ordini recenti
async function loadRecentOrders() {
  const container = document.getElementById('adminRecentOrders')
  if (!container) return

  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Caricamento ordini...</p>
    </div>
  `

  // Simula il caricamento degli ordini
  setTimeout(() => {
    container.innerHTML = `
      <div class="recent-order-item">
        <div class="order-info">
          <span class="order-id">#ORD-001</span>
          <span class="order-customer">Mario Rossi</span>
        </div>
        <div class="order-status pending">In Corso</div>
        <div class="order-total">€45.20</div>
      </div>
      <div class="recent-order-item">
        <div class="order-info">
          <span class="order-id">#ORD-002</span>
          <span class="order-customer">Giulia Bianchi</span>
        </div>
        <div class="order-status completed">Completato</div>
        <div class="order-total">€32.50</div>
      </div>
    `
  }, 1000)
}

// Carica recensioni in attesa
async function loadPendingReviews() {
  const container = document.getElementById('pendingReviews')
  if (!container) return

  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Caricamento recensioni...</p>
    </div>
  `

  // Simula il caricamento delle recensioni
  setTimeout(() => {
    container.innerHTML = `
      <div class="pending-review-item">
        <div class="review-content">
          <div class="review-rating">⭐⭐⭐⭐⭐</div>
          <p class="review-text">Ottimo miele, molto saporito!</p>
          <span class="review-author">Marco Verdi</span>
        </div>
        <div class="review-actions">
          <button class="btn btn-success btn-small" onclick="approveReview(1)">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-danger btn-small" onclick="rejectReview(1)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `
  }, 1000)
}

// Carica i prodotti
async function loadProducts() {
  const tableBody = document.getElementById('productsTableBody')
  if (!tableBody) return

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="loading-cell">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Caricamento prodotti...</p>
        </div>
      </td>
    </tr>
  `

  try {
    const filters = getProductFilters()
    const result = await getProducts(filters)
    
    if (result.success) {
      currentProducts = result.data
      displayProductsTable(currentProducts)
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore caricamento prodotti:', error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="error-cell">
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Errore caricamento prodotti</span>
          </div>
        </td>
      </tr>
    `
  }
}

// Ottiene i filtri dei prodotti
function getProductFilters() {
  const searchInput = document.getElementById('productSearch')
  const categoryFilter = document.getElementById('categoryFilter')
  const statusFilter = document.getElementById('statusFilter')

  return {
    search: searchInput?.value || '',
    category: categoryFilter?.value || '',
    status: statusFilter?.value || '',
    limit: 50
  }
}

// Visualizza la tabella dei prodotti
function displayProductsTable(products) {
  const tableBody = document.getElementById('productsTableBody')
  if (!tableBody) return

  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="no-data-cell">
          <div class="no-data-message">
            <i class="fas fa-box-open"></i>
            <span>Nessun prodotto trovato</span>
          </div>
        </td>
      </tr>
    `
    return
  }

  tableBody.innerHTML = products.map(product => `
    <tr>
      <td>
        <img src="${product.image_url || 'assets/images/placeholder.jpg'}" 
             alt="${product.name}" 
             class="product-thumbnail">
      </td>
      <td>
        <div class="product-name">${product.name}</div>
        <div class="product-category">${product.category}</div>
      </td>
      <td>${product.category}</td>
      <td>€${product.price.toFixed(2)}</td>
      <td>
        <span class="stock-indicator ${getStockClass(product.stock)}">
          ${product.stock}
        </span>
      </td>
      <td>
        <span class="status-indicator ${product.is_active ? 'active' : 'inactive'}">
          ${product.is_active ? 'Attivo' : 'Inattivo'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-outline btn-small" onclick="editProduct('${product.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-small" onclick="deleteProduct('${product.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('')
}

// Ottiene la classe CSS per lo stock
function getStockClass(stock) {
  if (stock === 0) return 'out-of-stock'
  if (stock < 5) return 'low-stock'
  return 'in-stock'
}

// Carica gli ordini
async function loadOrders() {
  const tableBody = document.getElementById('ordersTableBody')
  if (!tableBody) return

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="loading-cell">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Caricamento ordini...</p>
        </div>
      </td>
    </tr>
  `

  // Simula il caricamento degli ordini
  setTimeout(() => {
    tableBody.innerHTML = `
      <tr>
        <td>#ORD-001</td>
        <td>Mario Rossi</td>
        <td>2024-01-15</td>
        <td>€45.20</td>
        <td><span class="status-indicator in-progress">In Corso</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline btn-small" onclick="viewOrder('ORD-001')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-primary btn-small" onclick="updateOrderStatus('ORD-001')">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `
  }, 1000)
}

// Carica le recensioni
async function loadReviews() {
  const container = document.getElementById('adminReviewsList')
  if (!container) return

  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Caricamento recensioni...</p>
    </div>
  `

  // Simula il caricamento delle recensioni
  setTimeout(() => {
    container.innerHTML = `
      <div class="admin-review-item">
        <div class="review-header">
          <div class="review-product">Miele di Acacia</div>
          <div class="review-rating">⭐⭐⭐⭐⭐</div>
        </div>
        <div class="review-content">
          <p>Ottimo miele, molto saporito e naturale!</p>
          <div class="review-meta">
            <span class="review-author">Marco Verdi</span>
            <span class="review-date">2024-01-15</span>
          </div>
        </div>
        <div class="review-actions">
          <button class="btn btn-success btn-small" onclick="approveReview(1)">
            <i class="fas fa-check"></i> Approva
          </button>
          <button class="btn btn-danger btn-small" onclick="rejectReview(1)">
            <i class="fas fa-times"></i> Rifiuta
          </button>
        </div>
      </div>
    `
  }, 1000)
}

// Carica i clienti
async function loadCustomers() {
  const tableBody = document.getElementById('customersTableBody')
  if (!tableBody) return

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="loading-cell">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Caricamento clienti...</p>
        </div>
      </td>
    </tr>
  `

  // Simula il caricamento dei clienti
  setTimeout(() => {
    tableBody.innerHTML = `
      <tr>
        <td>Mario Rossi</td>
        <td>mario.rossi@email.com</td>
        <td>2024-01-10</td>
        <td>3</td>
        <td>€127.50</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline btn-small" onclick="viewCustomer('customer-1')">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </td>
      </tr>
    `
  }, 1000)
}

// Carica le analytics
async function loadAnalytics() {
  // Implementa il caricamento delle analytics
  console.log('Caricamento analytics...')
}

// Carica le impostazioni
async function loadSettings() {
  // Implementa il caricamento delle impostazioni
  console.log('Caricamento impostazioni...')
}

// ===== FUNZIONI PER I PRODOTTI =====

// Apre il modal del prodotto
function openProductModal(productId = null) {
  const modal = document.getElementById('productModal')
  const title = document.getElementById('productModalTitle')
  const form = document.getElementById('productForm')
  
  if (!modal || !title || !form) return

  if (productId) {
    // Modifica prodotto esistente
    title.textContent = 'Modifica Prodotto'
    loadProductData(productId)
  } else {
    // Nuovo prodotto
    title.textContent = 'Aggiungi Prodotto'
    form.reset()
  }

  modal.classList.add('active')
}

// Modifica un prodotto
function editProduct(productId) {
  openProductModal(productId)
}

// Elimina un prodotto
async function deleteProduct(productId) {
  if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) {
    return
  }

  try {
    // Implementa l'eliminazione del prodotto
    console.log('Eliminazione prodotto:', productId)
    showNotification('Prodotto eliminato con successo', 'success')
    loadProducts()
  } catch (error) {
    console.error('Errore eliminazione prodotto:', error)
    showNotification('Errore eliminazione prodotto', 'error')
  }
}

// ===== FUNZIONI UTILITÀ =====

// Reindirizza al login
function redirectToLogin() {
  window.location.href = 'login.html'
}

// Reindirizza alla home
function redirectToHome() {
  window.location.href = 'index.html'
}

// Mostra un errore
function showError(message) {
  console.error('Errore admin:', message)
  // Implementa la visualizzazione dell'errore
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
window.editProduct = editProduct
window.deleteProduct = deleteProduct
window.approveReview = (id) => console.log('Approvazione recensione:', id)
window.rejectReview = (id) => console.log('Rifiuto recensione:', id)
window.viewOrder = (id) => console.log('Visualizza ordine:', id)
window.updateOrderStatus = (id) => console.log('Aggiorna stato ordine:', id)
window.viewCustomer = (id) => console.log('Visualizza cliente:', id)
