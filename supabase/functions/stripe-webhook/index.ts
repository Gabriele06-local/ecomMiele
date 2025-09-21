// Edge Function per gestire i webhook di Stripe
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createCorsResponse, handleCors } from '../_shared/cors.ts'
import { supabase } from '../_shared/supabaseClient.ts'
import { verifyWebhookSignature, retrieveCheckoutSession } from '../_shared/stripeClient.ts'
import { sendOrderConfirmationEmail as sendOrderEmail, sendOrderStatusUpdateEmail } from '../_shared/emailService.ts'

serve(async (req) => {
  const startTime = Date.now()
  let eventType = 'unknown'
  
  try {
    // Gestisci CORS preflight
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    // Verifica il metodo HTTP
    if (req.method !== 'POST') {
      console.warn('❌ Invalid method:', req.method)
      return createCorsResponse(
        { success: false, error: 'Method not allowed' },
        405
      )
    }

    // Verifica rate limiting (semplice implementazione)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    if (!isRequestAllowed(clientIP)) {
      console.warn('❌ Rate limit exceeded for IP:', clientIP)
      return createCorsResponse(
        { success: false, error: 'Rate limit exceeded' },
        429
      )
    }

    // Ottieni il body della richiesta
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    // Validazione input
    if (!body || body.trim().length === 0) {
      console.error('❌ Empty request body')
      return createCorsResponse(
        { success: false, error: 'Empty request body' },
        400
      )
    }

    if (!signature) {
      console.error('❌ Missing Stripe signature header')
      return createCorsResponse(
        { success: false, error: 'Missing stripe signature' },
        400
      )
    }

    // Verifica la firma del webhook
    let event
    try {
      event = verifyWebhookSignature(body, signature)
      eventType = event.type
      console.log(`🎯 Processing webhook event: ${eventType} (${event.id})`)
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error.message)
      return createCorsResponse(
        { success: false, error: 'Invalid signature' },
        400
      )
    }

    // Verifica che l'evento non sia già stato processato (idempotenza)
    const isAlreadyProcessed = await checkEventIdempotence(event.id)
    if (isAlreadyProcessed) {
      console.log(`✅ Event ${event.id} already processed, skipping`)
      return createCorsResponse({
        success: true,
        message: 'Event already processed'
      })
    }

    // Registra l'evento per idempotenza
    await recordEventProcessing(event.id, eventType)

    // Gestisci l'evento
    const result = await handleWebhookEvent(event)
    
    const processingTime = Date.now() - startTime
    console.log(`✅ Webhook processed successfully: ${eventType} in ${processingTime}ms`)

    return createCorsResponse({
      success: true,
      message: 'Webhook processed successfully',
      event_id: event.id,
      processing_time: processingTime
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ Webhook processing error for ${eventType}:`, error)
    
    // Registra l'errore per debugging
    await logWebhookError(eventType, error, processingTime)
    
    return createCorsResponse(
      { 
        success: false, 
        error: 'Internal server error',
        event_type: eventType,
        processing_time: processingTime
      },
      500
    )
  }
})

// Funzione per gestire gli eventi del webhook
async function handleWebhookEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object)
      break
    
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object)
      break
    
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object)
      break
    
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object)
      break
    
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object)
      break
    
    case 'charge.dispute.created':
      await handleChargeDisputeCreated(event.data.object)
      break
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

// Handler per checkout session completata
async function handleCheckoutSessionCompleted(session: any) {
  console.log('Checkout session completed:', session.id)
  
  try {
    // Recupera l'ordine dal database usando l'ID della sessione
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', session.id)
      .single()

    if (orderError || !order) {
      console.error('Order not found for session:', session.id)
      return
    }

    // Recupera i dettagli completi della sessione da Stripe
    const fullSession = await retrieveCheckoutSession(session.id)
    
    // Aggiorna lo stato dell'ordine
    const updateData: any = {
      status: 'in_corso',
      payment_status: 'paid',
      payment_method: 'card',
      updated_at: new Date().toISOString()
    }

    // Se ci sono informazioni di fatturazione nella sessione, aggiornale
    if (fullSession.customer_details) {
      updateData.billing_address = {
        name: fullSession.customer_details.name,
        email: fullSession.customer_details.email,
        address: fullSession.customer_details.address,
        phone: fullSession.customer_details.phone
      }
    }

    if (fullSession.shipping_details) {
      updateData.shipping_address = {
        name: fullSession.shipping_details.name,
        address: fullSession.shipping_details.address,
        phone: fullSession.shipping_details.phone
      }
    }

    // Aggiorna l'ordine nel database
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return
    }

    // Aggiorna lo stock dei prodotti
    await updateProductStock(order.id)

    // Invia email di conferma (opzionale)
    await sendOrderConfirmationEmail(order.id)

    // Aggiorna i punti fedeltà dell'utente
    if (order.user_id) {
      await updateLoyaltyPoints(order.user_id, order.total_price)
    }

    console.log('Order updated successfully:', order.id)

  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

// Handler per payment intent riuscito
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Payment intent succeeded:', paymentIntent.id)
  
  try {
    // Aggiorna l'ordine se non è già stato aggiornato
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_intent_id', paymentIntent.id)
      .single()

    if (orderError || !order) {
      console.error('Order not found for payment intent:', paymentIntent.id)
      return
    }

    // Aggiorna solo se lo stato è ancora pending
    if (order.status === 'pending_payment') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'in_corso',
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Error updating order from payment intent:', updateError)
      }
    }

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
  }
}

// Handler per payment intent fallito
async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('Payment intent failed:', paymentIntent.id)
  
  try {
    // Aggiorna l'ordine
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'payment_failed',
        payment_status: 'failed',
        admin_notes: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id)

    if (updateError) {
      console.error('Error updating order for failed payment:', updateError)
    }

  } catch (error) {
    console.error('Error handling payment intent failed:', error)
  }
}

// Handler per pagamento fattura riuscito
async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('Invoice payment succeeded:', invoice.id)
  // Implementa la logica per le fatture se necessario
}

// Handler per pagamento fattura fallito
async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice.id)
  // Implementa la logica per le fatture fallite se necessario
}

// Handler per dispute creato
async function handleChargeDisputeCreated(dispute: any) {
  console.log('Charge dispute created:', dispute.id)
  
  try {
    // Trova l'ordine associato al charge
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_intent_id', dispute.payment_intent)
      .single()

    if (orderError || !order) {
      console.error('Order not found for dispute:', dispute.id)
      return
    }

    // Aggiorna l'ordine con informazioni sulla dispute
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        admin_notes: `Dispute created: ${dispute.reason} - ${dispute.id}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order for dispute:', updateError)
    }

  } catch (error) {
    console.error('Error handling charge dispute created:', error)
  }
}

// Funzione per aggiornare lo stock dei prodotti
async function updateProductStock(orderId: string) {
  try {
    console.log('📦 Updating product stock for order:', orderId)
    
    // Recupera gli elementi dell'ordine con dettagli prodotto
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        product_id, 
        quantity,
        products (
          name,
          stock,
          is_active
        )
      `)
      .eq('order_id', orderId)

    if (error || !orderItems) {
      console.error('Error fetching order items:', error)
      return
    }

    // Aggiorna lo stock per ogni prodotto
    for (const item of orderItems) {
      const currentStock = item.products?.stock || 0
      const productName = item.products?.name || 'Prodotto sconosciuto'
      
      console.log(`Updating stock for ${productName}: ${currentStock} -> ${currentStock - item.quantity}`)
      
      try {
        // Usa la funzione database per decrementare lo stock
        const { error: updateError } = await supabase.rpc('decrement_product_stock', {
          product_id: item.product_id,
          quantity: item.quantity
        })

        if (updateError) {
          console.error('Error updating stock for product:', item.product_id, updateError)
          continue
        }

        // Calcola il nuovo stock dopo l'aggiornamento
        const newStock = currentStock - item.quantity

        // Controlla se il prodotto è esaurito o ha stock basso
        if (newStock <= 0) {
          console.warn(`🚨 Product ${productName} is now out of stock`)
          
          // Disattiva il prodotto se esaurito
          await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', item.product_id)
          
          // Notifica admin
          await notifyAdminOutOfStock(item.product_id, productName)
          
        } else if (newStock <= 5) {
          console.warn(`⚠️ Low stock alert for ${productName}: ${newStock} remaining`)
          await notifyAdminLowStock(item.product_id, productName, newStock)
        }

        console.log(`✅ Stock updated for ${productName}`)

      } catch (stockError) {
        console.error(`Error updating stock for product ${item.product_id}:`, stockError)
      }
    }

    console.log('✅ Product stock update completed for order:', orderId)

  } catch (error) {
    console.error('❌ Error updating product stock:', error)
  }
}

// Funzione per notificare admin di prodotto esaurito
async function notifyAdminOutOfStock(productId: string, productName: string) {
  try {
    console.log(`🚨 Admin notification: Product "${productName}" is out of stock`)
    
    // Inserisci log nell'ordine per tracking
    // TODO: Implementare sistema notifiche admin (email, push, dashboard)
    
    // Per ora registriamo l'evento nel log
    console.log(`ADMIN_ALERT: Product ${productId} (${productName}) is OUT OF STOCK`)
    
  } catch (error) {
    console.error('Error notifying admin of out of stock:', error)
  }
}

// Funzione per notificare admin di stock basso
async function notifyAdminLowStock(productId: string, productName: string, remainingStock: number) {
  try {
    console.log(`⚠️ Admin notification: Product "${productName}" has low stock: ${remainingStock}`)
    
    // Per ora registriamo l'evento nel log
    console.log(`ADMIN_ALERT: Product ${productId} (${productName}) has LOW STOCK: ${remainingStock}`)
    
    // TODO: Implementare sistema notifiche admin (email, push, dashboard)
    
  } catch (error) {
    console.error('Error notifying admin of low stock:', error)
  }
}

// Funzione per inviare email di conferma
async function sendOrderConfirmationEmail(orderId: string) {
  try {
    console.log('📧 Sending order confirmation email for order:', orderId)
    
    // Recupera i dettagli dell'ordine con items e prodotti
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_user_id_fkey (
          full_name,
          email
        ),
        order_items (
          *,
          products (
            name,
            price,
            image_url
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !orderData) {
      console.error('Error fetching order for email:', orderError)
      return
    }

    const profile = orderData.profiles
    if (!profile?.email) {
      console.error('No customer email found for order:', orderId)
      return
    }

    // Prepara i dati per l'email
    const emailData = {
      orderNumber: orderData.order_number || orderData.id.substring(0, 8).toUpperCase(),
      customerName: profile.full_name || 'Cliente',
      customerEmail: profile.email,
      orderDate: new Date(orderData.created_at).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      totalAmount: orderData.total_price,
      items: orderData.order_items.map(item => ({
        name: item.products?.name || item.product_snapshot?.name || 'Prodotto',
        quantity: item.quantity,
        price: item.price,
        image_url: item.products?.image_url || item.product_snapshot?.image_url
      })),
      shippingAddress: orderData.shipping_address,
      billingAddress: orderData.billing_address
    }

    // Invia l'email usando il servizio email
    const emailSent = await sendOrderEmail(emailData)
    
    if (emailSent) {
      console.log('✅ Order confirmation email sent successfully')
      
      // Aggiorna l'ordine per indicare che l'email è stata inviata
      await supabase
        .from('orders')
        .update({ 
          admin_notes: supabase.raw('COALESCE(admin_notes, \'\') || ?', ['\nEmail conferma inviata: ' + new Date().toISOString()])
        })
        .eq('id', orderId)
    } else {
      console.warn('⚠️ Failed to send order confirmation email')
    }

  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error)
  }
}

// Funzione per aggiornare i punti fedeltà
async function updateLoyaltyPoints(userId: string, orderTotal: number) {
  try {
    // Calcola i punti da aggiungere (esempio: 1 punto per ogni euro)
    const pointsToAdd = Math.floor(orderTotal)
    
    if (pointsToAdd <= 0) return

    // Aggiorna i punti fedeltà dell'utente
    const { error } = await supabase.rpc('increment_loyalty_points', {
      user_id: userId,
      points: pointsToAdd
    })

    if (error) {
      console.error('Error updating loyalty points:', error)
    } else {
      console.log(`Added ${pointsToAdd} loyalty points to user ${userId}`)
    }

  } catch (error) {
    console.error('Error updating loyalty points:', error)
  }
}

// ===== FUNZIONI DI VALIDAZIONE E SICUREZZA =====

// Rate limiting semplice in memoria (per produzione usare Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100 // max 100 richieste per minuto per IP

function isRequestAllowed(clientIP: string): boolean {
  const now = Date.now()
  const key = `webhook_${clientIP}`
  
  const existing = rateLimitMap.get(key)
  
  if (!existing || now > existing.resetTime) {
    // Reset o prima richiesta
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }
  
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  existing.count++
  return true
}

// Verifica idempotenza eventi (evita doppia elaborazione)
const processedEvents = new Map<string, number>()
const EVENT_EXPIRY_TIME = 24 * 60 * 60 * 1000 // 24 ore

async function checkEventIdempotence(eventId: string): Promise<boolean> {
  const now = Date.now()
  
  // Pulisci eventi scaduti
  for (const [id, timestamp] of processedEvents.entries()) {
    if (now - timestamp > EVENT_EXPIRY_TIME) {
      processedEvents.delete(id)
    }
  }
  
  return processedEvents.has(eventId)
}

async function recordEventProcessing(eventId: string, eventType: string): Promise<void> {
  processedEvents.set(eventId, Date.now())
  
  // Opzionalmente, registra nel database per persistenza
  try {
    await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        processed_at: new Date().toISOString(),
        status: 'processing'
      })
      .onConflict('event_id')
      .ignore()
  } catch (error) {
    // Non bloccare il processing se il log fallisce
    console.warn('Failed to log webhook event:', error)
  }
}

// Registra errori webhook per debugging
async function logWebhookError(eventType: string, error: any, processingTime: number): Promise<void> {
  try {
    const errorLog = {
      event_type: eventType,
      error_message: error.message || 'Unknown error',
      error_stack: error.stack || '',
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    }
    
    // Log in console per sviluppo
    console.error('🚨 Webhook Error Log:', errorLog)
    
    // Opzionalmente, salva nel database
    await supabase
      .from('webhook_errors')
      .insert(errorLog)
      .onConflict()
      .ignore()
      
  } catch (logError) {
    console.error('Failed to log webhook error:', logError)
  }
}

// Validazione migliorata eventi Stripe
function validateStripeEvent(event: any): boolean {
  if (!event || typeof event !== 'object') {
    console.error('Invalid event object')
    return false
  }
  
  if (!event.id || typeof event.id !== 'string') {
    console.error('Missing or invalid event ID')
    return false
  }
  
  if (!event.type || typeof event.type !== 'string') {
    console.error('Missing or invalid event type')
    return false
  }
  
  if (!event.data || typeof event.data !== 'object') {
    console.error('Missing or invalid event data')
    return false
  }
  
  // Verifica timestamp (non troppo vecchio o futuro)
  const eventTime = event.created * 1000 // Stripe usa secondi
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minuti
  
  if (Math.abs(now - eventTime) > maxAge) {
    console.warn('Event timestamp is too old or in future:', new Date(eventTime))
    // Non bloccare, ma logga l'avviso
  }
  
  return true
}
