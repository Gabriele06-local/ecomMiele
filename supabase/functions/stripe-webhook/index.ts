// Edge Function per gestire i webhook di Stripe
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createCorsResponse, handleCors } from '../_shared/cors.ts'
import { supabase } from '../_shared/supabaseClient.ts'
import { verifyWebhookSignature, retrieveCheckoutSession } from '../_shared/stripeClient.ts'

serve(async (req) => {
  try {
    // Verifica il metodo HTTP
    if (req.method !== 'POST') {
      return createCorsResponse(
        { success: false, error: 'Method not allowed' },
        405
      )
    }

    // Ottieni il body della richiesta
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return createCorsResponse(
        { success: false, error: 'Missing stripe signature' },
        400
      )
    }

    // Verifica la firma del webhook
    let event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return createCorsResponse(
        { success: false, error: 'Invalid signature' },
        400
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Gestisci l'evento
    await handleWebhookEvent(event)

    return createCorsResponse({
      success: true,
      message: 'Webhook processed successfully'
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return createCorsResponse(
      { success: false, error: 'Internal server error' },
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
    // Recupera gli elementi dell'ordine
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId)

    if (error || !orderItems) {
      console.error('Error fetching order items:', error)
      return
    }

    // Aggiorna lo stock per ogni prodotto
    for (const item of orderItems) {
      const { error: updateError } = await supabase.rpc('decrement_product_stock', {
        product_id: item.product_id,
        quantity: item.quantity
      })

      if (updateError) {
        console.error('Error updating stock for product:', item.product_id, updateError)
      }
    }

  } catch (error) {
    console.error('Error updating product stock:', error)
  }
}

// Funzione per inviare email di conferma
async function sendOrderConfirmationEmail(orderId: string) {
  try {
    // Implementa l'invio dell'email usando il servizio email preferito
    // Per ora, logga l'evento
    console.log('Order confirmation email should be sent for order:', orderId)
    
    // Esempio di implementazione con un servizio email esterno:
    // await sendEmail({
    //   to: order.user_email,
    //   subject: 'Conferma Ordine - Miele d\'Autore',
    //   template: 'order_confirmation',
    //   data: { order }
    // })

  } catch (error) {
    console.error('Error sending order confirmation email:', error)
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
