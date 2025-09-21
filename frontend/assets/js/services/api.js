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

// ===== ADMIN - ORDINI =====

// Ottiene tutti gli ordini per l'admin
export async function getAdminOrders(filters = {}) {
  try {
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_price,
        status,
        created_at,
        profiles (
          first_name,
          last_name
        ),
        order_items (
          id,
          quantity,
          price,
          products (
            name,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Applica filtri
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore recupero ordini admin:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero ordini admin:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Aggiorna lo stato di un ordine
export async function updateOrderStatus(orderId, newStatus, adminNotes = '') {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Errore aggiornamento stato ordine:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore aggiornamento stato ordine:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Ottiene ordini recenti per la dashboard
export async function getRecentOrders(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_price,
        status,
        created_at,
        profiles (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Errore recupero ordini recenti:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero ordini recenti:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== ADMIN - RECENSIONI =====

// Ottiene le recensioni in attesa di moderazione
export async function getPendingReviews(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        products (
          name
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Errore recupero recensioni in attesa:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero recensioni in attesa:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Ottiene tutte le recensioni per l'admin
export async function getAdminReviews(filters = {}) {
  try {
    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        is_approved,
        created_at,
        products (
          name
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    // Applica filtri
    if (filters.status === 'pending') {
      query = query.eq('is_approved', false)
    } else if (filters.status === 'approved') {
      query = query.eq('is_approved', true)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore recupero recensioni admin:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero recensioni admin:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Approva una recensione
export async function approveReview(reviewId) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        is_approved: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (error) {
      console.error('Errore approvazione recensione:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore approvazione recensione:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Rifiuta una recensione
export async function rejectReview(reviewId, moderationNotes = '') {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        is_approved: false,
        moderation_notes: moderationNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (error) {
      console.error('Errore rifiuto recensione:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore rifiuto recensione:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== ADMIN - CLIENTI =====

// Ottiene tutti i clienti per l'admin
export async function getAdminCustomers(filters = {}) {
  console.log('🔍 getAdminCustomers chiamata - NO API ADMIN')
  
  try {
    // Query SOLO sui profili - nessuna chiamata API admin
    let profileQuery = supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        created_at,
        loyalty_points,
        orders (
          id,
          total_price,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (filters.limit) {
      profileQuery = profileQuery.limit(filters.limit)
    }

    if (filters.search) {
      profileQuery = profileQuery.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
    }

    const { data: profilesData, error: profilesError } = await profileQuery

    if (profilesError) {
      console.error('Errore recupero clienti admin:', profilesError)
      return { success: false, error: profilesError.message }
    }

    console.log('✅ Profili caricati:', profilesData.length)

    // Calcola statistiche per ogni cliente (SENZA email)
    const customersWithStats = profilesData.map(customer => {
      const orders = customer.orders || []
      const completedOrders = orders.filter(order => order.status === 'completato')
      const totalSpent = completedOrders.reduce((sum, order) => sum + order.total_price, 0)

      return {
        ...customer,
        orderCount: orders.length,
        totalSpent,
        email: 'Email non disponibile' // Nessuna chiamata API admin
      }
    })

    console.log('✅ Clienti elaborati:', customersWithStats.length)
    return { success: true, data: customersWithStats }
  } catch (error) {
    console.error('❌ Errore recupero clienti admin:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== ADMIN - PRODOTTI CRUD =====

// Crea un nuovo prodotto
export async function createProduct(productData) {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price),
        category: productData.category,
        stock: parseInt(productData.stock),
        image_url: productData.image_url,
        is_active: productData.is_active !== false,
        slug: productData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      })
      .select()
      .single()

    if (error) {
      console.error('Errore creazione prodotto:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore creazione prodotto:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Aggiorna un prodotto esistente
export async function updateProduct(productId, productData) {
  try {
    const updates = {
      ...productData,
      updated_at: new Date().toISOString()
    }

    if (productData.name) {
      updates.slug = productData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('Errore aggiornamento prodotto:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore aggiornamento prodotto:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Elimina un prodotto
export async function deleteProduct(productId) {
  try {
    // Prima disattiva il prodotto invece di eliminarlo fisicamente
    const { data, error } = await supabase
      .from('products')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('Errore eliminazione prodotto:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore eliminazione prodotto:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Ottiene tutti i prodotti per l'admin (inclusi quelli inattivi)
export async function getAdminProducts(filters = {}) {
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
        created_at
      `)
      .order('created_at', { ascending: false })

    // Applica filtri
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.status === 'active') {
      query = query.eq('is_active', true)
    } else if (filters.status === 'inactive') {
      query = query.eq('is_active', false)
    } else if (filters.status === 'out_of_stock') {
      query = query.eq('stock', 0)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore recupero prodotti admin:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero prodotti admin:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== ADMIN - ANALYTICS =====

// Ottiene i prodotti più venduti
export async function getBestSellingProducts(limit = 10, days = 30) {
  try {
    const { data, error } = await supabase
      .rpc('get_best_selling_products', {
        limit_count: limit,
        days_back: days
      })

    if (error) {
      console.error('Errore recupero prodotti più venduti:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero prodotti più venduti:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// Ottiene le statistiche avanzate dell'admin
export async function getAdvancedAdminStats() {
  try {
    const { data, error } = await supabase
      .rpc('get_admin_dashboard_stats')

    if (error) {
      console.error('Errore recupero statistiche avanzate:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Errore recupero statistiche avanzate:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}

// ===== STATISTICHE =====

// Ottiene le statistiche per l'admin
export async function getAdminStats() {
  try {
    // Prova prima con le statistiche avanzate dal database
    const advancedResult = await getAdvancedAdminStats()
    if (advancedResult.success) {
      return advancedResult
    }

    // Fallback alle statistiche di base
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
        total_orders: ordersResult.count || 0,
        total_customers: customersResult.count || 0,
        total_products: productsResult.count || 0,
        total_revenue: totalRevenue,
        // Valori di default per le statistiche avanzate
        pending_orders: 0,
        completed_orders: 0,
        average_order_value: totalRevenue / (ordersResult.count || 1),
        pending_reviews: 0,
        total_reviews: 0,
        average_rating: 0
      }
    }
  } catch (error) {
    console.error('Errore recupero statistiche:', error)
    return { success: false, error: 'Errore di connessione' }
  }
}
