// Edge Function per il checkout sicuro
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createCorsResponse, handleCors } from '../_shared/cors.ts'
import { supabase, getUserFromRequest, validateInput, sanitizeText } from '../_shared/supabaseClient.ts'
import { createCheckoutSession, getOrderMetadata, validateAmount, formatStripeError } from '../_shared/stripeClient.ts'

interface CheckoutRequest {
  items: Array<{
    product_id: string
    quantity: number
  }>
  coupon_code?: string
  shipping_address?: any
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  is_active: boolean
}

serve(async (req) => {
  // Gestisci CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Verifica il metodo HTTP
    if (req.method !== 'POST') {
      return createCorsResponse(
        { success: false, error: 'Method not allowed' },
        405
      )
    }

    // Verifica l'autenticazione
    const user = await getUserFromRequest(req)
    console.log('Checkout request from user:', user.id)

    // Parsing del body della richiesta
    const body: CheckoutRequest = await req.json()
    
    // Validazione input
    validateInput(body, ['items'])
    
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return createCorsResponse(
        { success: false, error: 'Items array is required and cannot be empty' },
        400
      )
    }

    // Validazione rate limiting
    const rateLimitKey = `checkout_${user.id}`
    const isAllowed = checkRateLimit(rateLimitKey, 5, 60000) // 5 richieste per minuto
    
    if (!isAllowed) {
      return createCorsResponse(
        { success: false, error: 'Too many checkout attempts. Please try again later.' },
        429
      )
    }

    // Validazione e recupero prodotti dal database
    const validatedItems = await validateAndGetProducts(body.items)
    
    if (validatedItems.length === 0) {
      return createCorsResponse(
        { success: false, error: 'No valid products found' },
        400
      )
    }

    // Calcolo totali
    const totals = calculateTotals(validatedItems, body.coupon_code)
    
    if (!validateAmount(totals.total)) {
      return createCorsResponse(
        { success: false, error: 'Invalid total amount' },
        400
      )
    }

    // Creazione ordine nel database
    const order = await createOrder(user.id, validatedItems, totals, body)
    
    // Creazione sessione Stripe
    const lineItems = validatedItems.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.product.name,
          description: item.product.description || undefined,
          images: item.product.image_url ? [item.product.image_url] : undefined,
        },
        unit_amount: Math.round(item.product.price * 100), // Stripe usa centesimi
      },
      quantity: item.quantity,
    }))

    const metadata = getOrderMetadata(order.id, user.id)
    metadata.items_count = validatedItems.length.toString()
    metadata.total_amount = totals.total.toString()

    const session = await createCheckoutSession(
      lineItems,
      metadata,
      `${Deno.env.get('SITE_URL')}/success?session_id={CHECKOUT_SESSION_ID}`,
      `${Deno.env.get('SITE_URL')}/cart`
    )

    // Aggiorna l'ordine con l'ID della sessione Stripe
    await supabase
      .from('orders')
      .update({ 
        stripe_session_id: session.id,
        payment_intent_id: session.payment_intent as string
      })
      .eq('id', order.id)

    console.log('Checkout session created:', session.id)

    return createCorsResponse({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id,
        order_id: order.id
      }
    })

  } catch (error) {
    console.error('Checkout error:', error)
    
    if (error.message.includes('Stripe')) {
      return createCorsResponse(
        { success: false, error: formatStripeError(error) },
        400
      )
    }
    
    return createCorsResponse(
      { success: false, error: 'Internal server error' },
      500
    )
  }
})

// Funzione per validare e recuperare i prodotti
async function validateAndGetProducts(items: Array<{product_id: string, quantity: number}>) {
  const validatedItems = []

  for (const item of items) {
    try {
      // Validazione input
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        console.log('Invalid item:', item)
        continue
      }

      // Recupero prodotto dal database
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, stock, is_active, description, image_url')
        .eq('id', item.product_id)
        .eq('is_active', true)
        .single()

      if (error || !product) {
        console.log('Product not found or inactive:', item.product_id)
        continue
      }

      // Verifica stock
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`)
      }

      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        product: product
      })

    } catch (error) {
      console.error('Error validating item:', error)
      throw error
    }
  }

  return validatedItems
}

// Funzione per calcolare i totali
async function calculateTotals(items: any[], couponCode?: string) {
  let subtotal = 0
  let discountAmount = 0

  // Calcola subtotale
  for (const item of items) {
    subtotal += item.product.price * item.quantity
  }

  // Applica coupon se fornito
  if (couponCode) {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (!error && coupon) {
      // Verifica validità del coupon
      const now = new Date()
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        throw new Error('Coupon expired')
      }

      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        throw new Error('Coupon usage limit exceeded')
      }

      if (subtotal < coupon.minimum_amount) {
        throw new Error(`Minimum order amount not met for this coupon (€${coupon.minimum_amount})`)
      }

      // Calcola sconto
      switch (coupon.type) {
        case 'percentage':
          discountAmount = (subtotal * coupon.value) / 100
          if (coupon.maximum_discount) {
            discountAmount = Math.min(discountAmount, coupon.maximum_discount)
          }
          break
        case 'fixed_amount':
          discountAmount = coupon.value
          break
        case 'free_shipping':
          // Gestito separatamente
          break
      }
    }
  }

  // Calcola spedizione
  const shippingThreshold = 50
  const shippingCost = (subtotal - discountAmount) >= shippingThreshold ? 0 : 5.99

  // Se il coupon è per spedizione gratuita, forza il costo a 0
  if (couponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('type')
      .eq('code', couponCode.toUpperCase())
      .single()
    
    if (coupon?.type === 'free_shipping') {
      shippingCost = 0
    }
  }

  const total = subtotal - discountAmount + shippingCost

  return {
    subtotal,
    discountAmount,
    shippingCost,
    total
  }
}

// Funzione per creare l'ordine nel database
async function createOrder(
  userId: string, 
  items: any[], 
  totals: any, 
  requestData: CheckoutRequest
) {
  try {
    // Crea l'ordine
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending_payment',
        total_price: totals.total,
        subtotal: totals.subtotal,
        shipping_cost: totals.shippingCost,
        discount_amount: totals.discountAmount,
        billing_address: requestData.shipping_address || {},
        shipping_address: requestData.shipping_address || {}
      })
      .select()
      .single()

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`)
    }

    // Crea gli elementi dell'ordine
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.product.price,
      total_price: item.product.price * item.quantity,
      product_snapshot: {
        name: item.product.name,
        price: item.product.price,
        image_url: item.product.image_url
      }
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback dell'ordine se gli elementi falliscono
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(`Failed to create order items: ${itemsError.message}`)
    }

    // Applica il coupon se fornito
    if (requestData.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('id')
        .eq('code', requestData.coupon_code.toUpperCase())
        .single()

      if (coupon) {
        await supabase
          .from('order_coupons')
          .insert({
            order_id: order.id,
            coupon_id: coupon.id,
            discount_amount: totals.discountAmount
          })
      }
    }

    console.log('Order created successfully:', order.id)
    return order

  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

// Funzione per il rate limiting (semplificata)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const key = `${identifier}_${Math.floor(now / windowMs)}`
  
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= limit) {
    return false
  }
  
  current.count++
  return true
}
