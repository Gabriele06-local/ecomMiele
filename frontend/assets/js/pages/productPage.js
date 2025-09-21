// Pagina prodotti
import { getProducts, getCategories } from '../services/api.js'
import { createProductCard, renderProductCards } from '../components/ProductCard.js'
import { addToCart } from '../services/cart.js'

// Variabili globali
let currentProducts = []
let currentFilters = {
  category: '',
  priceRange: '',
  sortBy: 'name',
  search: ''
}
let currentPage = 1
let totalPages = 1
const productsPerPage = 12

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📦 Inizializzazione pagina prodotti')
  
  try {
    await initializeProductPage()
  } catch (error) {
    console.error('Errore inizializzazione pagina prodotti:', error)
    showError('Errore caricamento prodotti')
  }
})

async function initializeProductPage() {
  // Carica i parametri dalla URL
  loadUrlParams()
  
  // Inizializza i filtri
  initializeFilters()
  
  // Carica le categorie
  await loadCategories()
  
  // Carica i prodotti
  await loadProducts()
  
  // Inizializza la paginazione
  initializePagination()
  
  // Inizializza la ricerca
  initializeSearch()
}

// Carica i parametri dalla URL
function loadUrlParams() {
  const urlParams = new URLSearchParams(window.location.search)
  
  currentFilters.search = urlParams.get('search') || ''
  currentFilters.category = urlParams.get('category') || ''
  currentFilters.priceRange = urlParams.get('price') || ''
  currentFilters.sortBy = urlParams.get('sort') || 'name'
  currentPage = parseInt(urlParams.get('page')) || 1
}

// Inizializza i filtri
function initializeFilters() {
  const categoryFilter = document.getElementById('categoryFilter')
  const priceFilter = document.getElementById('priceFilter')
  const sortFilter = document.getElementById('sortFilter')
  const clearFiltersBtn = document.getElementById('clearFilters')

  // Imposta i valori correnti
  if (categoryFilter) {
    categoryFilter.value = currentFilters.category
    categoryFilter.addEventListener('change', handleFilterChange)
  }

  if (priceFilter) {
    priceFilter.value = currentFilters.priceRange
    priceFilter.addEventListener('change', handleFilterChange)
  }

  if (sortFilter) {
    sortFilter.value = currentFilters.sortBy
    sortFilter.addEventListener('change', handleFilterChange)
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters)
  }
}

// Carica le categorie
async function loadCategories() {
  try {
    const result = await getCategories()
    
    if (result.success) {
      const categoryFilter = document.getElementById('categoryFilter')
      if (categoryFilter) {
        // Mantieni l'opzione "Tutte le categorie" e aggiorna le altre
        const currentValue = categoryFilter.value
        const allOption = categoryFilter.querySelector('option[value=""]')
        categoryFilter.innerHTML = ''
        
        if (allOption) {
          categoryFilter.appendChild(allOption)
        }
        
        result.data.forEach(category => {
          const option = document.createElement('option')
          option.value = category
          option.textContent = category.charAt(0).toUpperCase() + category.slice(1)
          categoryFilter.appendChild(option)
        })
        
        categoryFilter.value = currentValue
      }
    }
  } catch (error) {
    console.error('Errore caricamento categorie:', error)
  }
}

// Carica i prodotti
async function loadProducts() {
  try {
    showLoading()
    
    // Costruisci i filtri per l'API
    const filters = {
      category: currentFilters.category || undefined,
      search: currentFilters.search || undefined,
      sortBy: currentFilters.sortBy,
      limit: productsPerPage,
      offset: (currentPage - 1) * productsPerPage
    }

    // Applica il filtro prezzo
    if (currentFilters.priceRange) {
      const [min, max] = currentFilters.priceRange.split('-').map(Number)
      if (min !== undefined) filters.minPrice = min
      if (max !== undefined) filters.maxPrice = max
    }

    const result = await getProducts(filters)
    
    if (result.success) {
      currentProducts = result.data
      totalPages = Math.ceil(result.count / productsPerPage)
      
      displayProducts(currentProducts)
      updatePagination()
      updateUrl()
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Errore caricamento prodotti:', error)
    showError('Errore caricamento prodotti')
  } finally {
    hideLoading()
  }
}

// Visualizza i prodotti
function displayProducts(products) {
  const container = document.getElementById('productsGrid')
  if (!container) return

  if (products.length === 0) {
    container.innerHTML = `
      <div class="no-products">
        <div class="no-products-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>Nessun prodotto trovato</h3>
        <p>Prova a modificare i filtri o la ricerca per trovare quello che cerchi.</p>
        <button class="btn btn-primary" onclick="clearFilters()">
          <i class="fas fa-times"></i>
          Cancella Filtri
        </button>
      </div>
    `
    return
  }

  // Renderizza le card dei prodotti
  renderProductCards(products, container, {
    onAddToCart: handleAddToCart,
    onQuickView: handleQuickView
  })
}

// Gestisce il cambio di filtro
async function handleFilterChange() {
  const categoryFilter = document.getElementById('categoryFilter')
  const priceFilter = document.getElementById('priceFilter')
  const sortFilter = document.getElementById('sortFilter')

  currentFilters.category = categoryFilter?.value || ''
  currentFilters.priceRange = priceFilter?.value || ''
  currentFilters.sortBy = sortFilter?.value || 'name'
  currentPage = 1

  await loadProducts()
}

// Pulisce tutti i filtri
async function clearFilters() {
  const categoryFilter = document.getElementById('categoryFilter')
  const priceFilter = document.getElementById('priceFilter')
  const sortFilter = document.getElementById('sortFilter')

  if (categoryFilter) categoryFilter.value = ''
  if (priceFilter) priceFilter.value = ''
  if (sortFilter) sortFilter.value = 'name'

  currentFilters = {
    category: '',
    priceRange: '',
    sortBy: 'name',
    search: ''
  }
  currentPage = 1

  await loadProducts()
}

// Gestisce l'aggiunta al carrello
async function handleAddToCart(product) {
  try {
    const result = await addToCart(product.id, 1, {
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

// Gestisce la quick view
function handleQuickView(product) {
  // Implementa la quick view se necessario
  console.log('Quick view per:', product.name)
  
  // Per ora, reindirizza alla pagina del prodotto
  window.location.href = `product.html?id=${product.id}`
}

// Inizializza la paginazione
function initializePagination() {
  const paginationContainer = document.getElementById('pagination')
  if (!paginationContainer) return

  // La paginazione viene aggiornata in updatePagination()
}

// Aggiorna la paginazione
function updatePagination() {
  const paginationContainer = document.getElementById('pagination')
  if (!paginationContainer) return

  if (totalPages <= 1) {
    paginationContainer.innerHTML = ''
    return
  }

  let paginationHTML = ''

  // Pulsante precedente
  if (currentPage > 1) {
    paginationHTML += `
      <button class="pagination-btn" onclick="goToPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
        Precedente
      </button>
    `
  }

  // Numeri delle pagine
  const startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, currentPage + 2)

  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage ? 'active' : ''
    paginationHTML += `<button class="pagination-btn ${isActive}" onclick="goToPage(${i})">${i}</button>`
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`
    }
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`
  }

  // Pulsante successivo
  if (currentPage < totalPages) {
    paginationHTML += `
      <button class="pagination-btn" onclick="goToPage(${currentPage + 1})">
        Successivo
        <i class="fas fa-chevron-right"></i>
      </button>
    `
  }

  paginationContainer.innerHTML = paginationHTML
}

// Va a una pagina specifica
async function goToPage(page) {
  if (page < 1 || page > totalPages) return

  currentPage = page
  await loadProducts()
  
  // Scrolla in cima alla pagina
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Inizializza la ricerca
function initializeSearch() {
  const searchInput = document.getElementById('productSearch')
  if (!searchInput) return

  let searchTimeout
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout)
    
    searchTimeout = setTimeout(() => {
      currentFilters.search = e.target.value.trim()
      currentPage = 1
      loadProducts()
    }, 500) // Debounce di 500ms
  })

  // Imposta il valore corrente se c'è una ricerca nell'URL
  if (currentFilters.search) {
    searchInput.value = currentFilters.search
  }
}

// Aggiorna l'URL con i parametri correnti
function updateUrl() {
  const params = new URLSearchParams()
  
  if (currentFilters.search) params.set('search', currentFilters.search)
  if (currentFilters.category) params.set('category', currentFilters.category)
  if (currentFilters.priceRange) params.set('price', currentFilters.priceRange)
  if (currentFilters.sortBy !== 'name') params.set('sort', currentFilters.sortBy)
  if (currentPage > 1) params.set('page', currentPage)

  const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
  window.history.replaceState({}, '', newUrl)
}

// Mostra il loading
function showLoading() {
  const container = document.getElementById('productsGrid')
  if (!container) return

  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Caricamento prodotti...</p>
    </div>
  `
}

// Nasconde il loading
function hideLoading() {
  // Il loading viene sostituito dai prodotti o dal messaggio di errore
}

// Mostra un errore
function showError(message) {
  const container = document.getElementById('productsGrid')
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
window.goToPage = goToPage
window.clearFilters = clearFilters
