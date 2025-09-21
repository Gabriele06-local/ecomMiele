// Pagina admin
import { getCurrentUser, isUserAdmin } from '../services/auth.js'
import { 
  getProducts, 
  getAdminStats, 
  getAdminOrders,
  getRecentOrders,
  getPendingReviews,
  getAdminReviews,
  approveReview,
  rejectReview,
  getAdminCustomers,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus
} from '../services/api.js'

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
    totalOrdersElement.textContent = adminStats.total_orders || 0
  }

  if (totalRevenueElement) {
    totalRevenueElement.textContent = `€${(adminStats.total_revenue || 0).toFixed(2)}`
  }

  if (totalCustomersElement) {
    totalCustomersElement.textContent = adminStats.total_customers || 0
  }

  if (totalProductsElement) {
    totalProductsElement.textContent = adminStats.total_products || 0
  }
}

// Inizializza i componenti specifici delle tab
function initializeTabComponents() {
  // Inizializza i filtri dei prodotti
  initializeProductFilters()
  
  // Inizializza i filtri degli ordini
  initializeOrderFilters()
  
  // Inizializza i filtri delle recensioni
  initializeReviewFilters()
  
  // Inizializza i filtri dei clienti
  initializeCustomerFilters()
  
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

// Inizializza i filtri degli ordini
function initializeOrderFilters() {
  const statusFilter = document.getElementById('orderStatusFilter')
  
  if (statusFilter) {
    statusFilter.addEventListener('change', loadOrders)
  }
}

// Inizializza i filtri delle recensioni
function initializeReviewFilters() {
  const statusFilter = document.getElementById('reviewStatusFilter')
  
  if (statusFilter) {
    statusFilter.addEventListener('change', loadReviews)
  }
}

// Inizializza i filtri dei clienti
function initializeCustomerFilters() {
  const searchInput = document.getElementById('customerSearch')
  
  if (searchInput) {
    let searchTimeout
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        loadCustomers()
      }, 500)
    })
  }
}

// Inizializza i modali
function initializeModals() {
  const productModal = document.getElementById('productModal')
  const productModalClose = document.getElementById('productModalClose')
  const addProductBtn = document.getElementById('addProductBtn')
  const productForm = document.getElementById('productForm')

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

  // Form prodotto submit
  if (productForm) {
    productForm.addEventListener('submit', handleProductSubmit)
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

  try {
    const result = await getRecentOrders(5)
    
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(order => {
        const customerName = order.profiles ? 
          `${order.profiles.first_name} ${order.profiles.last_name}` : 
          'Cliente sconosciuto'
        
        const statusClass = getOrderStatusClass(order.status)
        const statusText = getOrderStatusText(order.status)
        
        return `
          <div class="recent-order-item">
            <div class="order-info">
              <span class="order-id">#${order.order_number}</span>
              <span class="order-customer">${customerName}</span>
            </div>
            <div class="order-status ${statusClass}">${statusText}</div>
            <div class="order-total">€${order.total_price.toFixed(2)}</div>
          </div>
        `
      }).join('')
    } else {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-inbox"></i>
          <span>Nessun ordine recente</span>
        </div>
      `
    }
  } catch (error) {
    console.error('Errore caricamento ordini recenti:', error)
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Errore caricamento ordini</span>
      </div>
    `
  }
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

  try {
    const result = await getPendingReviews(5)
    
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(review => {
        const authorName = review.profiles ? 
          `${review.profiles.first_name} ${review.profiles.last_name}` : 
          'Utente sconosciuto'
        
        const rating = '⭐'.repeat(review.rating)
        
        return `
          <div class="pending-review-item">
            <div class="review-content">
              <div class="review-product">${review.products?.name || 'Prodotto sconosciuto'}</div>
              <div class="review-rating">${rating}</div>
              <p class="review-text">${review.comment || 'Nessun commento'}</p>
              <span class="review-author">${authorName}</span>
            </div>
            <div class="review-actions">
              <button class="btn btn-success btn-small" onclick="handleApproveReview('${review.id}')">
                <i class="fas fa-check"></i>
              </button>
              <button class="btn btn-danger btn-small" onclick="handleRejectReview('${review.id}')">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        `
      }).join('')
    } else {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-star"></i>
          <span>Nessuna recensione in attesa</span>
        </div>
      `
    }
  } catch (error) {
    console.error('Errore caricamento recensioni in attesa:', error)
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Errore caricamento recensioni</span>
      </div>
    `
  }
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
    const result = await getAdminProducts(filters)
    
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
          <button class="btn btn-danger btn-small" onclick="handleDeleteProduct('${product.id}')">
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

  try {
    const statusFilter = document.getElementById('orderStatusFilter')
    const filters = {
      status: statusFilter?.value || '',
      limit: 50
    }
    
    const result = await getAdminOrders(filters)
    
    if (result.success) {
      displayOrdersTable(result.data)
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore caricamento ordini:', error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="error-cell">
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Errore caricamento ordini</span>
          </div>
        </td>
      </tr>
    `
  }
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

  try {
    const statusFilter = document.getElementById('reviewStatusFilter')
    const filters = {
      status: statusFilter?.value || '',
      limit: 20
    }
    
    const result = await getAdminReviews(filters)
    
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(review => {
        const authorName = review.profiles ? 
          `${review.profiles.first_name} ${review.profiles.last_name}` : 
          'Utente sconosciuto'
        
        const rating = '⭐'.repeat(review.rating)
        const date = new Date(review.created_at).toLocaleDateString('it-IT')
        const statusClass = review.is_approved ? 'approved' : 'pending'
        
        return `
          <div class="admin-review-item ${statusClass}">
            <div class="review-header">
              <div class="review-product">${review.products?.name || 'Prodotto sconosciuto'}</div>
              <div class="review-rating">${rating}</div>
              <div class="review-status ${review.is_approved ? 'approved' : 'pending'}">
                ${review.is_approved ? 'Approvata' : 'In attesa'}
              </div>
            </div>
            <div class="review-content">
              <p>${review.comment || 'Nessun commento'}</p>
              <div class="review-meta">
                <span class="review-author">${authorName}</span>
                <span class="review-date">${date}</span>
              </div>
            </div>
            ${!review.is_approved ? `
              <div class="review-actions">
                <button class="btn btn-success btn-small" onclick="handleApproveReview('${review.id}')">
                  <i class="fas fa-check"></i> Approva
                </button>
                <button class="btn btn-danger btn-small" onclick="handleRejectReview('${review.id}')">
                  <i class="fas fa-times"></i> Rifiuta
                </button>
              </div>
            ` : ''}
          </div>
        `
      }).join('')
    } else {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-star"></i>
          <span>Nessuna recensione trovata</span>
        </div>
      `
    }
  } catch (error) {
    console.error('Errore caricamento recensioni:', error)
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Errore caricamento recensioni</span>
      </div>
    `
  }
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

  try {
    const searchInput = document.getElementById('customerSearch')
    const filters = {
      search: searchInput?.value || '',
      limit: 50
    }
    
    const result = await getAdminCustomers(filters)
    
    if (result.success) {
      displayCustomersTable(result.data)
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore caricamento clienti:', error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="error-cell">
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Errore caricamento clienti</span>
          </div>
        </td>
      </tr>
    `
  }
}

// Carica le analytics
async function loadAnalytics() {
  try {
    // Carica i prodotti più venduti
    await loadTopProducts()
    
    // Carica metriche di conversione (simulata per ora)
    await loadConversionMetrics()
    
    // Carica dati per regione (simulata per ora)
    await loadCustomersRegion()
    
    console.log('Analytics caricate con successo')
  } catch (error) {
    console.error('Errore caricamento analytics:', error)
  }
}

// Carica i prodotti più venduti
async function loadTopProducts() {
  const container = document.getElementById('topProducts')
  if (!container) return

  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Caricamento...</p>
    </div>
  `

  try {
    const result = await getBestSellingProducts(5, 30)
    
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map((product, index) => `
        <div class="top-product-item">
          <div class="product-rank">${index + 1}</div>
          <div class="product-info">
            <div class="product-name">${product.product_name}</div>
            <div class="product-sales">${product.total_quantity_sold} venduti</div>
          </div>
          <div class="product-revenue">€${product.total_revenue.toFixed(2)}</div>
        </div>
      `).join('')
    } else {
      // Fallback con dati simulati basati sui prodotti esistenti
      const productsResult = await getAdminProducts({ limit: 5 })
      if (productsResult.success) {
        container.innerHTML = productsResult.data.slice(0, 5).map((product, index) => `
          <div class="top-product-item">
            <div class="product-rank">${index + 1}</div>
            <div class="product-info">
              <div class="product-name">${product.name}</div>
              <div class="product-sales">${Math.floor(Math.random() * 50) + 10} venduti</div>
            </div>
            <div class="product-revenue">€${(Math.random() * 500 + 100).toFixed(2)}</div>
          </div>
        `).join('')
      } else {
        container.innerHTML = `
          <div class="no-data-message">
            <i class="fas fa-chart-bar"></i>
            <span>Dati non disponibili</span>
          </div>
        `
      }
    }
  } catch (error) {
    console.error('Errore caricamento prodotti più venduti:', error)
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Errore caricamento dati</span>
      </div>
    `
  }
}

// Carica metriche di conversione
async function loadConversionMetrics() {
  const container = document.getElementById('conversionMetrics')
  if (!container) return

  try {
    // Per ora usiamo dati simulati, ma potresti implementare calcoli reali
    const stats = await getAdminStats()
    
    if (stats.success) {
      const conversionRate = stats.data.total_orders > 0 ? 
        ((stats.data.completed_orders || stats.data.total_orders * 0.7) / stats.data.total_orders * 100).toFixed(1) : 
        '0.0'
      
      const avgOrderValue = stats.data.average_order_value || 
        (stats.data.total_revenue / (stats.data.total_orders || 1))

      container.innerHTML = `
        <div class="metric-item">
          <span class="metric-label">Tasso di Conversione</span>
          <span class="metric-value">${conversionRate}%</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Carrello Abbandonato</span>
          <span class="metric-value">${(100 - parseFloat(conversionRate)).toFixed(1)}%</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Valore Medio Ordine</span>
          <span class="metric-value">€${avgOrderValue.toFixed(2)}</span>
        </div>
      `
    }
  } catch (error) {
    console.error('Errore caricamento metriche conversione:', error)
  }
}

// Carica dati clienti per regione
async function loadCustomersRegion() {
  const container = document.getElementById('customersRegion')
  if (!container) return

  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Caricamento...</p>
    </div>
  `

  try {
    // Simuliamo dati regionali per ora
    const regions = [
      { name: 'Lombardia', customers: Math.floor(Math.random() * 50) + 20 },
      { name: 'Lazio', customers: Math.floor(Math.random() * 40) + 15 },
      { name: 'Veneto', customers: Math.floor(Math.random() * 35) + 10 },
      { name: 'Piemonte', customers: Math.floor(Math.random() * 30) + 8 },
      { name: 'Emilia-Romagna', customers: Math.floor(Math.random() * 25) + 5 }
    ]

    container.innerHTML = regions.map(region => `
      <div class="region-item">
        <div class="region-name">${region.name}</div>
        <div class="region-customers">${region.customers} clienti</div>
      </div>
    `).join('')

  } catch (error) {
    console.error('Errore caricamento dati regionali:', error)
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Errore caricamento dati</span>
      </div>
    `
  }
}

// Carica le impostazioni
async function loadSettings() {
  try {
    // Inizializza il form delle impostazioni
    initializeSettingsForm()
    
    // Carica le impostazioni salvate (per ora usiamo localStorage come fallback)
    loadSavedSettings()
    
    console.log('Impostazioni caricate con successo')
  } catch (error) {
    console.error('Errore caricamento impostazioni:', error)
  }
}

// Inizializza il form delle impostazioni
function initializeSettingsForm() {
  const settingsForm = document.getElementById('adminSettingsForm')
  if (!settingsForm) return

  settingsForm.addEventListener('submit', handleSettingsSubmit)
}

// Carica le impostazioni salvate
function loadSavedSettings() {
  try {
    const savedSettings = localStorage.getItem('adminSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      
      // Popola i campi del form
      const storeNameInput = document.getElementById('storeName')
      const storeEmailInput = document.getElementById('storeEmail')
      const storePhoneInput = document.getElementById('storePhone')
      const freeShippingInput = document.getElementById('freeShippingThreshold')
      const shippingCostInput = document.getElementById('shippingCost')
      const aiModerationInput = document.getElementById('aiModeration')
      const aiRecommendationsInput = document.getElementById('aiRecommendations')

      if (storeNameInput && settings.storeName) storeNameInput.value = settings.storeName
      if (storeEmailInput && settings.storeEmail) storeEmailInput.value = settings.storeEmail
      if (storePhoneInput && settings.storePhone) storePhoneInput.value = settings.storePhone
      if (freeShippingInput && settings.freeShippingThreshold) freeShippingInput.value = settings.freeShippingThreshold
      if (shippingCostInput && settings.shippingCost) shippingCostInput.value = settings.shippingCost
      if (aiModerationInput && typeof settings.aiModeration === 'boolean') aiModerationInput.checked = settings.aiModeration
      if (aiRecommendationsInput && typeof settings.aiRecommendations === 'boolean') aiRecommendationsInput.checked = settings.aiRecommendations
    }
  } catch (error) {
    console.error('Errore caricamento impostazioni salvate:', error)
  }
}

// Gestisce il submit del form impostazioni
async function handleSettingsSubmit(event) {
  event.preventDefault()
  
  const form = event.target
  const formData = new FormData(form)
  
  const settings = {
    storeName: formData.get('storeName'),
    storeEmail: formData.get('storeEmail'),
    storePhone: formData.get('storePhone'),
    freeShippingThreshold: parseFloat(formData.get('freeShippingThreshold')) || 50,
    shippingCost: parseFloat(formData.get('shippingCost')) || 5.99,
    aiModeration: formData.get('aiModeration') === 'on',
    aiRecommendations: formData.get('aiRecommendations') === 'on',
    updatedAt: new Date().toISOString()
  }

  try {
    // Per ora salviamo in localStorage, ma potresti implementare il salvataggio nel database
    localStorage.setItem('adminSettings', JSON.stringify(settings))
    
    // In futuro potresti implementare una funzione API per salvare nel database
    // const result = await saveAdminSettings(settings)
    
    showNotification('Impostazioni salvate con successo', 'success')
    
    console.log('Impostazioni salvate:', settings)
  } catch (error) {
    console.error('Errore salvataggio impostazioni:', error)
    showNotification('Errore salvataggio impostazioni', 'error')
  }
}

// ===== FUNZIONI PER I PRODOTTI =====

// Variabile globale per tenere traccia del prodotto in modifica
let currentEditingProductId = null

// Apre il modal del prodotto
function openProductModal(productId = null) {
  const modal = document.getElementById('productModal')
  const title = document.getElementById('productModalTitle')
  const form = document.getElementById('productForm')
  
  if (!modal || !title || !form) return

  currentEditingProductId = productId

  if (productId) {
    // Modifica prodotto esistente
    title.textContent = 'Modifica Prodotto'
    loadProductData(productId)
  } else {
    // Nuovo prodotto
    title.textContent = 'Aggiungi Prodotto'
    form.reset()
    currentEditingProductId = null
  }

  modal.classList.add('active')
}

// Carica i dati del prodotto nel form per la modifica
async function loadProductData(productId) {
  const product = currentProducts.find(p => p.id === productId)
  if (!product) return

  document.getElementById('productName').value = product.name || ''
  document.getElementById('productCategory').value = product.category || ''
  document.getElementById('productPrice').value = product.price || ''
  document.getElementById('productStock').value = product.stock || ''
  document.getElementById('productDescription').value = product.description || ''
}

// Gestisce il submit del form prodotto
async function handleProductSubmit(event) {
  event.preventDefault()
  
  const form = event.target
  const formData = new FormData(form)
  
  const productData = {
    name: formData.get('name'),
    category: formData.get('category'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    description: formData.get('description'),
    image_url: 'assets/images/honey-jar.jpg' // Placeholder per ora
  }

  // Validazione base
  if (!productData.name || !productData.category || !productData.price || !productData.stock || !productData.description) {
    showNotification('Compila tutti i campi obbligatori', 'error')
    return
  }

  try {
    let result
    
    if (currentEditingProductId) {
      // Modifica prodotto esistente
      result = await updateProduct(currentEditingProductId, productData)
    } else {
      // Crea nuovo prodotto
      result = await createProduct(productData)
    }

    if (result.success) {
      showNotification(
        currentEditingProductId ? 'Prodotto aggiornato con successo' : 'Prodotto creato con successo', 
        'success'
      )
      
      // Chiudi modal e ricarica prodotti
      document.getElementById('productModal').classList.remove('active')
      loadProducts()
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore salvataggio prodotto:', error)
    showNotification('Errore salvataggio prodotto: ' + error.message, 'error')
  }
}

// Modifica un prodotto
function editProduct(productId) {
  openProductModal(productId)
}

// Elimina un prodotto
async function handleDeleteProduct(productId) {
  if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) {
    return
  }

  try {
    const result = await deleteProduct(productId)
    
    if (result.success) {
      showNotification('Prodotto eliminato con successo', 'success')
      loadProducts()
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore eliminazione prodotto:', error)
    showNotification('Errore eliminazione prodotto', 'error')
  }
}

// ===== FUNZIONI DI SUPPORTO =====

// Ottiene la classe CSS per lo stato dell'ordine
function getOrderStatusClass(status) {
  switch (status) {
    case 'pending_payment': return 'pending'
    case 'payment_failed': return 'failed'
    case 'in_corso': return 'in-progress'
    case 'spedito': return 'shipped'
    case 'completato': return 'completed'
    case 'cancellato': return 'cancelled'
    default: return 'pending'
  }
}

// Ottiene il testo per lo stato dell'ordine
function getOrderStatusText(status) {
  switch (status) {
    case 'pending_payment': return 'Pagamento in Attesa'
    case 'payment_failed': return 'Pagamento Fallito'
    case 'in_corso': return 'In Corso'
    case 'spedito': return 'Spedito'
    case 'completato': return 'Completato'
    case 'cancellato': return 'Cancellato'
    default: return 'Sconosciuto'
  }
}

// Visualizza la tabella degli ordini
function displayOrdersTable(orders) {
  const tableBody = document.getElementById('ordersTableBody')
  if (!tableBody) return

  if (orders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="no-data-cell">
          <div class="no-data-message">
            <i class="fas fa-shopping-cart"></i>
            <span>Nessun ordine trovato</span>
          </div>
        </td>
      </tr>
    `
    return
  }

  tableBody.innerHTML = orders.map(order => {
    const customerName = order.profiles ? 
      `${order.profiles.first_name} ${order.profiles.last_name}` : 
      'Cliente sconosciuto'
    
    const date = new Date(order.created_at).toLocaleDateString('it-IT')
    const statusClass = getOrderStatusClass(order.status)
    const statusText = getOrderStatusText(order.status)

    return `
      <tr>
        <td>#${order.order_number}</td>
        <td>${customerName}</td>
        <td>${date}</td>
        <td>€${order.total_price.toFixed(2)}</td>
        <td><span class="status-indicator ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline btn-small" onclick="viewOrder('${order.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-primary btn-small" onclick="handleUpdateOrderStatus('${order.id}', '${order.status}')">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `
  }).join('')
}

// Visualizza la tabella dei clienti
function displayCustomersTable(customers) {
  const tableBody = document.getElementById('customersTableBody')
  if (!tableBody) return

  if (customers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="no-data-cell">
          <div class="no-data-message">
            <i class="fas fa-users"></i>
            <span>Nessun cliente trovato</span>
          </div>
        </td>
      </tr>
    `
    return
  }

  tableBody.innerHTML = customers.map(customer => {
    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Nome non disponibile'
    const registrationDate = new Date(customer.created_at).toLocaleDateString('it-IT')

    return `
      <tr>
        <td>${fullName}</td>
        <td>${customer.email || 'Email non disponibile'}</td>
        <td>${registrationDate}</td>
        <td>${customer.orderCount || 0}</td>
        <td>€${(customer.totalSpent || 0).toFixed(2)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline btn-small" onclick="viewCustomer('${customer.id}')">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </td>
      </tr>
    `
  }).join('')
}

// ===== GESTIONE RECENSIONI =====

// Gestisce l'approvazione di una recensione
async function handleApproveReview(reviewId) {
  try {
    const result = await approveReview(reviewId)
    
    if (result.success) {
      showNotification('Recensione approvata con successo', 'success')
      // Ricarica le recensioni in attesa e quelle nella tab recensioni
      if (currentTab === 'overview') {
        loadPendingReviews()
      } else if (currentTab === 'reviews') {
        loadReviews()
      }
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore approvazione recensione:', error)
    showNotification('Errore approvazione recensione', 'error')
  }
}

// Gestisce il rifiuto di una recensione
async function handleRejectReview(reviewId) {
  const reason = prompt('Motivo del rifiuto (opzionale):')
  
  try {
    const result = await rejectReview(reviewId, reason || '')
    
    if (result.success) {
      showNotification('Recensione rifiutata', 'success')
      // Ricarica le recensioni in attesa e quelle nella tab recensioni
      if (currentTab === 'overview') {
        loadPendingReviews()
      } else if (currentTab === 'reviews') {
        loadReviews()
      }
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore rifiuto recensione:', error)
    showNotification('Errore rifiuto recensione', 'error')
  }
}

// ===== GESTIONE ORDINI =====

// Gestisce l'aggiornamento dello stato di un ordine
async function handleUpdateOrderStatus(orderId, currentStatus) {
  const statuses = [
    { value: 'pending_payment', text: 'Pagamento in Attesa' },
    { value: 'in_corso', text: 'In Corso' },
    { value: 'spedito', text: 'Spedito' },
    { value: 'completato', text: 'Completato' },
    { value: 'cancellato', text: 'Cancellato' }
  ]
  
  const options = statuses
    .filter(status => status.value !== currentStatus)
    .map(status => `${status.value}: ${status.text}`)
    .join('\n')
  
  const newStatus = prompt(`Seleziona il nuovo stato:\n${options}\n\nInserisci il valore:`)
  
  if (!newStatus || !statuses.find(s => s.value === newStatus)) {
    return
  }
  
  const adminNotes = prompt('Note admin (opzionale):')
  
  try {
    const result = await updateOrderStatus(orderId, newStatus, adminNotes || '')
    
    if (result.success) {
      showNotification('Stato ordine aggiornato con successo', 'success')
      loadOrders()
      if (currentTab === 'overview') {
        loadRecentOrders()
      }
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore aggiornamento stato ordine:', error)
    showNotification('Errore aggiornamento stato ordine', 'error')
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

// ===== GESTIONE CLIENTI =====

// Visualizza i dettagli di un cliente
async function viewCustomer(customerId) {
  try {
    // Trova il cliente nei dati correnti
    const customers = await getAdminCustomers({ limit: 100 })
    if (!customers.success) {
      throw new Error(customers.error)
    }
    
    const customer = customers.data.find(c => c.id === customerId)
    if (!customer) {
      showNotification('Cliente non trovato', 'error')
      return
    }

    // Crea un modal semplice per mostrare i dettagli
    const modalHtml = `
      <div class="modal active" id="customerModal" style="z-index: 1001;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Dettagli Cliente</h2>
            <button class="modal-close" onclick="closeCustomerModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="customer-details">
              <div class="detail-row">
                <strong>Nome:</strong> ${customer.first_name} ${customer.last_name}
              </div>
              <div class="detail-row">
                <strong>Email:</strong> ${customer.email}
              </div>
              <div class="detail-row">
                <strong>Data Registrazione:</strong> ${new Date(customer.created_at).toLocaleDateString('it-IT')}
              </div>
              <div class="detail-row">
                <strong>Punti Fedeltà:</strong> ${customer.loyalty_points || 0}
              </div>
              <div class="detail-row">
                <strong>Ordini Totali:</strong> ${customer.orderCount}
              </div>
              <div class="detail-row">
                <strong>Spesa Totale:</strong> €${customer.totalSpent.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // Rimuovi modal esistente se presente
    const existingModal = document.getElementById('customerModal')
    if (existingModal) {
      existingModal.remove()
    }

    // Aggiungi il nuovo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml)

    // Aggiungi event listener per chiudere cliccando fuori
    const modal = document.getElementById('customerModal')
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeCustomerModal()
      }
    })

  } catch (error) {
    console.error('Errore visualizzazione cliente:', error)
    showNotification('Errore caricamento dettagli cliente', 'error')
  }
}

// Chiude il modal del cliente
function closeCustomerModal() {
  const modal = document.getElementById('customerModal')
  if (modal) {
    modal.remove()
  }
}

// Rendi disponibili le funzioni globalmente
window.editProduct = editProduct
window.handleDeleteProduct = handleDeleteProduct
window.handleApproveReview = handleApproveReview
window.handleRejectReview = handleRejectReview
window.handleUpdateOrderStatus = handleUpdateOrderStatus
window.viewOrder = (id) => console.log('Visualizza ordine:', id)
window.viewCustomer = viewCustomer
window.closeCustomerModal = closeCustomerModal
