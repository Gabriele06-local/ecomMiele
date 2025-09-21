// Componente ProductCard riutilizzabile
export class ProductCard {
  constructor(product, options = {}) {
    this.product = product
    this.options = {
      showAddToCart: true,
      showQuickView: false,
      showWishlist: false,
      onAddToCart: null,
      onQuickView: null,
      onToggleWishlist: null,
      ...options
    }
  }

  // Renderizza la card del prodotto
  render() {
    const card = document.createElement('div')
    card.className = 'product-card'
    card.dataset.productId = this.product.id

    card.innerHTML = `
      <div class="product-card-image">
        <img src="${this.getImageUrl()}" alt="${this.product.name}" loading="lazy">
        ${this.renderBadges()}
        ${this.options.showQuickView ? this.renderQuickViewButton() : ''}
      </div>
      
      <div class="product-card-content">
        <div class="product-card-category">${this.product.category}</div>
        <h3 class="product-card-title">${this.product.name}</h3>
        <p class="product-card-description">${this.truncateDescription()}</p>
        
        ${this.renderRating()}
        
        <div class="product-card-price">
          ${this.renderPrice()}
        </div>
        
        <div class="product-card-footer">
          ${this.renderActions()}
        </div>
      </div>
    `

    // Aggiungi i listener degli eventi
    this.attachEventListeners(card)

    return card
  }

  // Ottiene l'URL dell'immagine
  getImageUrl() {
    return this.product.image_url || 'assets/images/placeholder.jpg'
  }

  // Renderizza i badge del prodotto
  renderBadges() {
    const badges = []

    if (this.product.stock < 5 && this.product.stock > 0) {
      badges.push('<div class="product-card-badge sale">Ultimi pezzi</div>')
    }

    if (this.product.stock === 0) {
      badges.push('<div class="product-card-badge sold-out">Esaurito</div>')
    }

    if (this.product.featured) {
      badges.push('<div class="product-card-badge premium">Premium</div>')
    }

    return badges.join('')
  }

  // Renderizza il pulsante quick view
  renderQuickViewButton() {
    return `
      <div class="product-card-actions">
        <button class="product-card-action quick-view-btn" title="Anteprima rapida">
          <i class="fas fa-eye"></i>
        </button>
        ${this.options.showWishlist ? `
          <button class="product-card-action wishlist-btn" title="Aggiungi ai preferiti">
            <i class="fas fa-heart"></i>
          </button>
        ` : ''}
      </div>
    `
  }

  // Renderizza la valutazione
  renderRating() {
    if (!this.product.rating && !this.product.reviewCount) {
      return ''
    }

    return `
      <div class="product-card-rating">
        <div class="product-card-stars">
          ${this.generateStars(this.product.rating || 0)}
        </div>
        <span class="product-card-rating-text">(${this.product.reviewCount || 0})</span>
      </div>
    `
  }

  // Genera le stelle per la valutazione
  generateStars(rating) {
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

  // Renderizza il prezzo
  renderPrice() {
    let priceHtml = `<span class="product-card-price-current">€${this.product.price.toFixed(2)}</span>`

    if (this.product.original_price && this.product.original_price > this.product.price) {
      const discount = Math.round(((this.product.original_price - this.product.price) / this.product.original_price) * 100)
      priceHtml = `
        <span class="product-card-price-original">€${this.product.original_price.toFixed(2)}</span>
        <span class="product-card-price-current">€${this.product.price.toFixed(2)}</span>
        <span class="product-card-discount">-${discount}%</span>
      `
    }

    return priceHtml
  }

  // Renderizza le azioni
  renderActions() {
    const actions = []

    if (this.options.showAddToCart) {
      const isOutOfStock = this.product.stock === 0
      actions.push(`
        <button class="btn btn-primary product-card-btn add-to-cart-btn ${isOutOfStock ? 'disabled' : ''}" 
                data-product-id="${this.product.id}" 
                ${isOutOfStock ? 'disabled' : ''}>
          <i class="fas fa-${isOutOfStock ? 'times' : 'cart-plus'}"></i>
          ${isOutOfStock ? 'Non Disponibile' : 'Aggiungi al Carrello'}
        </button>
      `)
    }

    return actions.join('')
  }

  // Tronca la descrizione
  truncateDescription() {
    const maxLength = 100
    if (this.product.description.length <= maxLength) {
      return this.product.description
    }
    return this.product.description.substring(0, maxLength) + '...'
  }

  // Aggiunge i listener degli eventi
  attachEventListeners(card) {
    // Listener per aggiungere al carrello
    const addToCartBtn = card.querySelector('.add-to-cart-btn')
    if (addToCartBtn && this.options.onAddToCart) {
      addToCartBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.options.onAddToCart(this.product)
      })
    }

    // Listener per quick view
    const quickViewBtn = card.querySelector('.quick-view-btn')
    if (quickViewBtn && this.options.onQuickView) {
      quickViewBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.options.onQuickView(this.product)
      })
    }

    // Listener per wishlist
    const wishlistBtn = card.querySelector('.wishlist-btn')
    if (wishlistBtn && this.options.onToggleWishlist) {
      wishlistBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.options.onToggleWishlist(this.product)
      })
    }

    // Listener per il click sulla card (per andare al dettaglio)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        window.location.href = `product.html?id=${this.product.id}`
      }
    })
  }

  // Aggiorna lo stato della card
  updateState(newProduct) {
    this.product = { ...this.product, ...newProduct }
    
    // Aggiorna gli elementi della card
    const card = document.querySelector(`[data-product-id="${this.product.id}"]`)
    if (!card) return

    // Aggiorna il prezzo
    const priceElement = card.querySelector('.product-card-price')
    if (priceElement) {
      priceElement.innerHTML = this.renderPrice()
    }

    // Aggiorna i badge
    const imageElement = card.querySelector('.product-card-image')
    if (imageElement) {
      const existingBadges = imageElement.querySelectorAll('.product-card-badge')
      existingBadges.forEach(badge => badge.remove())
      imageElement.insertAdjacentHTML('beforeend', this.renderBadges())
    }

    // Aggiorna il pulsante aggiungi al carrello
    const addToCartBtn = card.querySelector('.add-to-cart-btn')
    if (addToCartBtn) {
      const isOutOfStock = this.product.stock === 0
      addToCartBtn.disabled = isOutOfStock
      addToCartBtn.className = `btn btn-primary product-card-btn add-to-cart-btn ${isOutOfStock ? 'disabled' : ''}`
      addToCartBtn.innerHTML = `
        <i class="fas fa-${isOutOfStock ? 'times' : 'cart-plus'}"></i>
        ${isOutOfStock ? 'Non Disponibile' : 'Aggiungi al Carrello'}
      `
    }
  }
}

// Funzione helper per creare una ProductCard
export function createProductCard(product, options = {}) {
  return new ProductCard(product, options)
}

// Funzione helper per renderizzare multiple ProductCards
export function renderProductCards(products, container, options = {}) {
  if (!container) return

  const defaultOptions = {
    onAddToCart: async (product) => {
      try {
        const { addToCart } = await import('../services/cart.js')
        const { getProduct } = await import('../services/api.js')
        
        const productResult = await getProduct(product.id)
        if (!productResult.success) {
          throw new Error('Errore recupero prodotto')
        }

        const fullProduct = productResult.data
        const result = await addToCart(product.id, 1, {
          name: fullProduct.name,
          price: fullProduct.price,
          image_url: fullProduct.image_url
        })

        if (result.success) {
          if (window.showNotification) {
            window.showNotification(`${fullProduct.name} aggiunto al carrello!`, 'success')
          }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('Errore aggiunta al carrello:', error)
        if (window.showNotification) {
          window.showNotification('Errore aggiunta al carrello', 'error')
        }
      }
    },
    onQuickView: (product) => {
      // Implementa la quick view se necessario
      console.log('Quick view per prodotto:', product.name)
    },
    onToggleWishlist: async (product) => {
      // Implementa la wishlist se necessario
      console.log('Toggle wishlist per prodotto:', product.name)
    },
    ...options
  }

  container.innerHTML = products.map(product => {
    const card = new ProductCard(product, defaultOptions)
    return card.render().outerHTML
  }).join('')
}
