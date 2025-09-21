// Servizio API per le chiamate al database
import { supabase } from './supabaseClient.js'

// ===== PRODOTTI =====

// Ottiene tutti i prodotti
export async function getProducts(filters = {}) {
  try {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        category,
        image_url,
        stock,
        is_active,
        created_at,
        reviews (
          id,
          rating,
          comment,
          created_at,
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('is_active', true)

    // Applica filtri
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice)
    }

    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Ordinamento
    const sortBy = filters.sortBy || 'created_at'
    const ascending = filters.ascending !== false
    query = query.order(sortBy, { ascending })

    // Paginazione
    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Errore recupero prodotti:', error)
      return { success: false, error: error.message }
    }

    // Calcola la media delle recensioni per ogni prodotto
    const productsWithRating = data.map(product => {
      const reviews = product.reviews || []
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0
      
      return {
        ...product,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length
      }
    })

    return { 
      success: true, 
      data: productsWithRating,
      count: count || productsWithRating.length
    }
  } catch (error) {
    console.error('Errore recupero prodotti:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Ottiene un prodotto specifico
export async function getProduct(productId) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        reviews (
          id,
          rating,
          comment,
          created_at,
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Errore recupero prodotto:', error)
      return { success: false, error: error.message }
    }

    // Calcola la media delle recensioni
    const reviews = data.reviews || []
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0

    const productWithRating = {
      ...data,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length
    }

    return { success: true, data: productWithRating }
  } catch (error) {
    console.error('Errore recupero prodotto:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Ottiene i prodotti in evidenza
export async function getFeaturedProducts(limit = 4) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        category,
        image_url,
        stock,
        created_at,
        reviews (
          rating
        )
      `)
      .eq('is_active', true)
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Errore recupero prodotti in evidenza:', error)
      return { success: false, error: error.message }
    }

    // Calcola la media delle recensioni
    const productsWithRating = data.map(product => {
      const reviews = product.reviews || []
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0
      
      return {
        ...product,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length
      }
    })

    return { success: true, data: productsWithRating }
  } catch (error) {
    console.error('Errore recupero prodotti in evidenza:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== RECENSIONI =====

// Ottiene le recensioni di un prodotto
export async function getProductReviews(productId, limit = 10, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Errore recupero recensioni:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero recensioni:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Aggiunge una recensione
export async function addReview(productId, orderId, rating, comment) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        order_id: orderId,
        rating,
        comment: comment.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('Errore aggiunta recensione:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore aggiunta recensione:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== ORDINI =====

// Ottiene gli ordini dell'utente
export async function getUserOrders(userId, limit = 10, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_price,
        status,
        created_at,
        order_items (
          id,
          quantity,
          price,
          products (
            id,
            name,
            image_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Errore recupero ordini:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero ordini:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Ottiene un ordine specifico
export async function getOrder(orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          price,
          products (
            id,
            name,
            image_url,
            description
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('Errore recupero ordine:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero ordine:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== PROFILO UTENTE =====

// Ottiene il profilo utente
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Errore recupero profilo:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero profilo:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Aggiorna il profilo utente
export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Errore aggiornamento profilo:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore aggiornamento profilo:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== CATEGORIE =====

// Ottiene tutte le categorie
export async function getCategories() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null)

    if (error) {
      console.error('Errore recupero categorie:', error)
      return { success: false, error: error.message }
    }

    // Estrae le categorie uniche
    const categories = [...new Set(data.map(item => item.category))]
      .filter(category => category)
      .sort()

    return { success: true, data: categories }
  } catch (error) {
    console.error('Errore recupero categorie:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== STATISTICHE =====

// Ottiene le statistiche per l'admin
export async function getAdminStats() {
  try {
    // Conta ordini, clienti, prodotti
    const [ordersResult, customersResult, productsResult] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true)
    ])

    // Calcola ricavi totali
    const { data: revenueData, error: revenueError } = await supabase
      .from('orders')
      .select('total_price')
      .eq('status', 'completato')

    if (revenueError) {
      console.error('Errore calcolo ricavi:', revenueError)
    }

    const totalRevenue = revenueData 
      ? revenueData.reduce((sum, order) => sum + order.total_price, 0)
      : 0

    return {
      success: true,
      data: {
        totalOrders: ordersResult.count || 0,
        totalCustomers: customersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalRevenue
      }
    }
  } catch (error) {
    console.error('Errore recupero statistiche:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}
