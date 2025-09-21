// Servizio per la gestione del carrello
import { supabase } from './supabaseClient.js'
import { getCurrentUser } from './auth.js'

// Chiavi base per localStorage
const CART_STORAGE_BASE = 'miele_cart'
const CART_SYNC_BASE = 'cart_synced'

// Classe per gestire il carrello
class CartService {
  constructor() {
    this.items = []
    this.isSynced = false
    this.currentUserId = null
    // Non caricare subito dal storage, aspetta che venga impostato l'utente
  }

  // Ottiene le chiavi localStorage specifiche per l'utente
  getStorageKeys() {
    const userId = this.currentUserId || 'anonymous'
    return {
      cart: `${CART_STORAGE_BASE}_${userId}`,
      sync: `${CART_SYNC_BASE}_${userId}`
    }
  }

  // Carica il carrello dal localStorage
  loadFromStorage() {
    try {
      const keys = this.getStorageKeys()
      const stored = localStorage.getItem(keys.cart)
      const synced = localStorage.getItem(keys.sync)
      
      if (stored) {
        this.items = JSON.parse(stored)
      }
      
      if (synced) {
        this.isSynced = JSON.parse(synced)
      }
    } catch (error) {
      console.error('Errore caricamento carrello:', error)
      this.items = []
      this.isSynced = false
    }
  }

  // Salva il carrello nel localStorage
  saveToStorage() {
    try {
      const keys = this.getStorageKeys()
      localStorage.setItem(keys.cart, JSON.stringify(this.items))
      localStorage.setItem(keys.sync, JSON.stringify(this.isSynced))
    } catch (error) {
      console.error('Errore salvataggio carrello:', error)
    }
  }

  // Imposta l'utente corrente e ricarica il carrello
  async setCurrentUser(userId) {
    console.log(`🛒 Cambio utente carrello: ${this.currentUserId} -> ${userId}`)
    
    // Se cambia utente, salva il carrello corrente
    if (this.currentUserId !== userId) {
      // Salva il carrello dell'utente precedente (se c'era)
      if (this.currentUserId !== null) {
        this.saveToStorage()
      }
      
      // Cambia utente
      this.currentUserId = userId
      
      // Resetta e carica il carrello del nuovo utente
      this.items = []
      this.isSynced = false
      this.loadFromStorage()
      
      console.log(`🛒 Carrello caricato per utente ${userId}:`, this.items.length, 'elementi')
      
      // Se l'utente è loggato, sincronizza con il database
      if (userId) {
        await this.syncWithDatabase()
      }
      
      // Notifica i listener del cambiamento
      this.notifyListeners()
    }
  }

  // Pulisce il carrello dell'utente corrente
  clearUserCart() {
    try {
      const keys = this.getStorageKeys()
      localStorage.removeItem(keys.cart)
      localStorage.removeItem(keys.sync)
      this.items = []
      this.isSynced = false
    } catch (error) {
      console.error('Errore pulizia carrello:', error)
    }
  }

  // Aggiunge un prodotto al carrello
  async addItem(productId, quantity = 1, productData = null) {
    try {
      // Verifica se il prodotto è già nel carrello
      const existingItem = this.items.find(item => item.product_id === productId)
      
      if (existingItem) {
        // Aggiorna la quantità
        existingItem.quantity += quantity
      } else {
        // Aggiunge un nuovo elemento
        const newItem = {
          id: Date.now(), // ID temporaneo
          product_id: productId,
          quantity: quantity,
          added_at: new Date().toISOString(),
          ...productData
        }
        this.items.push(newItem)
      }

      this.saveToStorage()
      
      // Sincronizza con il database se l'utente è loggato
      if (await getCurrentUser()) {
        await this.syncWithDatabase()
      }

      this.notifyListeners()
      return { success: true }
    } catch (error) {
      console.error('Errore aggiunta prodotto al carrello:', error)
      return { success: false, error: error.message }
    }
  }

  // Rimuove un prodotto dal carrello
  async removeItem(productId) {
    try {
      this.items = this.items.filter(item => item.product_id !== productId)
      this.saveToStorage()
      
      // Sincronizza con il database se l'utente è loggato
      if (await getCurrentUser()) {
        await this.syncWithDatabase()
      }

      this.notifyListeners()
      return { success: true }
    } catch (error) {
      console.error('Errore rimozione prodotto dal carrello:', error)
      return { success: false, error: error.message }
    }
  }

  // Aggiorna la quantità di un prodotto
  async updateQuantity(productId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeItem(productId)
      }

      const item = this.items.find(item => item.product_id === productId)
      if (item) {
        item.quantity = quantity
        this.saveToStorage()
        
        // Sincronizza con il database se l'utente è loggato
        if (await getCurrentUser()) {
          await this.syncWithDatabase()
        }

        this.notifyListeners()
      }

      return { success: true }
    } catch (error) {
      console.error('Errore aggiornamento quantità:', error)
      return { success: false, error: error.message }
    }
  }

  // Svuota il carrello
  async clearCart() {
    try {
      this.items = []
      this.saveToStorage()
      
      // Sincronizza con il database se l'utente è loggato
      if (await getCurrentUser()) {
        await this.syncWithDatabase()
      }

      this.notifyListeners()
      return { success: true }
    } catch (error) {
      console.error('Errore svuotamento carrello:', error)
      return { success: false, error: error.message }
    }
  }

  // Ottiene tutti gli elementi del carrello
  getItems() {
    return [...this.items]
  }

  // Ottiene il numero totale di elementi
  getItemCount() {
    return this.items.reduce((total, item) => total + item.quantity, 0)
  }

  // Ottiene il totale del carrello
  getTotal() {
    return this.items.reduce((total, item) => {
      const price = item.price || 0
      return total + (price * item.quantity)
    }, 0)
  }

  // Sincronizza il carrello con il database
  async syncWithDatabase() {
    try {
      const user = await getCurrentUser()
      if (!user) {
        this.isSynced = false
        return { success: false, error: 'Utente non autenticato' }
      }

      // Ottieni il carrello dell'utente dal database
      const { data: userCart, error: cartError } = await supabase
        .from('carts')
        .select(`
          id,
          cart_items (
            id,
            product_id,
            quantity,
            products (
              id,
              name,
              price,
              image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .single()

      if (cartError && cartError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Errore recupero carrello database:', cartError)
        return { success: false, error: cartError.message }
      }

      // Se non esiste un carrello nel database, creane uno
      let cartId = userCart?.id
      if (!cartId) {
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select()
          .single()

        if (createError) {
          console.error('Errore creazione carrello:', createError)
          return { success: false, error: createError.message }
        }

        cartId = newCart.id
      }

      // Sincronizza gli elementi
      if (this.isSynced) {
        // Il carrello è già sincronizzato, aggiorna solo le differenze
        await this.updateDatabaseCart(cartId)
      } else {
        // Prima sincronizzazione, carica dal database o salva il carrello locale
        if (userCart?.cart_items?.length > 0) {
          // Carica dal database
          this.items = userCart.cart_items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.products.price,
            name: item.products.name,
            image_url: item.products.image_url,
            added_at: new Date().toISOString()
          }))
          this.saveToStorage()
        } else {
          // Salva il carrello locale nel database
          await this.saveLocalCartToDatabase(cartId)
        }
        
        this.isSynced = true
        this.saveToStorage()
      }

      return { success: true }
    } catch (error) {
      console.error('Errore sincronizzazione carrello:', error)
      return { success: false, error: error.message }
    }
  }

  // Salva il carrello locale nel database
  async saveLocalCartToDatabase(cartId) {
    try {
      if (this.items.length === 0) return

      const cartItems = this.items.map(item => ({
        cart_id: cartId,
        product_id: item.product_id,
        quantity: item.quantity
      }))

      // Usa upsert per evitare errori di duplicazione
      const { error } = await supabase
        .from('cart_items')
        .upsert(cartItems, {
          onConflict: 'cart_id,product_id'
        })

      if (error) {
        console.error('Errore salvataggio carrello nel database:', error)
        throw error
      }
    } catch (error) {
      console.error('Errore salvataggio carrello locale:', error)
      throw error
    }
  }

  // Aggiorna il carrello nel database
  async updateDatabaseCart(cartId) {
    try {
      // Prima cancella tutti gli elementi esistenti
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)

      if (deleteError) {
        console.error('Errore cancellazione elementi carrello:', deleteError)
        throw deleteError
      }

      // Poi inserisci i nuovi elementi
      if (this.items.length > 0) {
        await this.saveLocalCartToDatabase(cartId)
      }
    } catch (error) {
      console.error('Errore aggiornamento carrello database:', error)
      throw error
    }
  }

  // Listener per i cambiamenti del carrello
  listeners = []

  addListener(callback) {
    this.listeners.push(callback)
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback)
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.getItems(), this.getItemCount(), this.getTotal())
      } catch (error) {
        console.error('Errore notifica listener carrello:', error)
      }
    })
  }
}

// Istanza singleton del servizio carrello
export const cartService = new CartService()

// Funzioni di utilità per l'uso diretto
export async function addToCart(productId, quantity = 1, productData = null) {
  return await cartService.addItem(productId, quantity, productData)
}

export async function removeFromCart(productId) {
  return await cartService.removeItem(productId)
}

export async function updateCartQuantity(productId, quantity) {
  return await cartService.updateQuantity(productId, quantity)
}

export async function clearCart() {
  return await cartService.clearCart()
}

export function getCartItems() {
  return cartService.getItems()
}

export function getCartItemCount() {
  return cartService.getItemCount()
}

export function getCartTotal() {
  return cartService.getTotal()
}

export function onCartChange(callback) {
  cartService.addListener(callback)
}

export function offCartChange(callback) {
  cartService.removeListener(callback)
}

export async function syncCart() {
  return await cartService.syncWithDatabase()
}

// Esportazione predefinita
export default cartService
