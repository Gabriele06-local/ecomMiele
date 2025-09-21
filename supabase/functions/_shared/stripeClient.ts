// Client Stripe per Edge Functions
import Stripe from 'https://esm.sh/stripe@14.21.0'

// Configurazione Stripe
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required')
}

// Inizializza Stripe
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
})

// Funzione per creare una sessione di checkout
export async function createCheckoutSession(
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  metadata: Record<string, string> = {},
  successUrl?: string,
  cancelUrl?: string
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || `${Deno.env.get('SITE_URL')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${Deno.env.get('SITE_URL')}/cart`,
      metadata,
      shipping_address_collection: {
        allowed_countries: ['IT', 'FR', 'DE', 'ES', 'AT', 'CH'],
      },
      billing_address_collection: 'required',
      customer_creation: 'if_required',
      invoice_creation: {
        enabled: true,
      },
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

// Funzione per recuperare una sessione di checkout
export async function retrieveCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent', 'customer']
    })

    return session
  } catch (error) {
    console.error('Error retrieving checkout session:', error)
    throw new Error('Failed to retrieve checkout session')
  }
}

// Funzione per creare un payment intent
export async function createPaymentIntent(
  amount: number,
  currency = 'eur',
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centesimi
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error('Failed to create payment intent')
  }
}

// Funzione per recuperare un payment intent
export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error('Failed to retrieve payment intent')
  }
}

// Funzione per creare un customer
export async function createCustomer(
  email: string,
  name?: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    })

    return customer
  } catch (error) {
    console.error('Error creating customer:', error)
    throw new Error('Failed to create customer')
  }
}

// Funzione per recuperare un customer
export async function retrieveCustomer(
  customerId: string
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer as Stripe.Customer
  } catch (error) {
    console.error('Error retrieving customer:', error)
    throw new Error('Failed to retrieve customer')
  }
}

// Funzione per creare un refund
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams.Reason,
  metadata: Record<string, string> = {}
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason,
      metadata,
    })

    return refund
  } catch (error) {
    console.error('Error creating refund:', error)
    throw new Error('Failed to create refund')
  }
}

// Funzione per verificare la firma del webhook
export function verifyWebhookSignature(
  payload: string,
  signature: string
): Stripe.Event {
  if (!stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required')
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeWebhookSecret
    )

    return event
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

// Funzione per gestire gli eventi del webhook
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`Processing webhook event: ${event.type}`)

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
      break
    
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
      break
    
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
      break
    
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
      break
    
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

// Handler per checkout session completata
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id)
  
  // Aggiorna lo stato dell'ordine nel database
  // Questo sarà implementato nella funzione webhook
}

// Handler per payment intent riuscito
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id)
  
  // Aggiorna lo stato dell'ordine nel database
  // Questo sarà implementato nella funzione webhook
}

// Handler per payment intent fallito
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id)
  
  // Aggiorna lo stato dell'ordine nel database
  // Questo sarà implementato nella funzione webhook
}

// Handler per pagamento fattura riuscito
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id)
}

// Handler per pagamento fattura fallito
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id)
}

// Funzione per formattare gli errori Stripe
export function formatStripeError(error: any): string {
  if (error.type) {
    switch (error.type) {
      case 'card_error':
        return error.message || 'Errore nella carta di credito'
      case 'rate_limit_error':
        return 'Troppe richieste, riprova più tardi'
      case 'invalid_request_error':
        return 'Richiesta non valida'
      case 'authentication_error':
        return 'Errore di autenticazione'
      case 'api_connection_error':
        return 'Errore di connessione'
      case 'api_error':
        return 'Errore del server, riprova più tardi'
      default:
        return 'Errore sconosciuto'
    }
  }

  return error.message || 'Errore sconosciuto'
}

// Funzione per convertire centesimi in euro
export function centsToEuros(cents: number): number {
  return cents / 100
}

// Funzione per convertire euro in centesimi
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

// Funzione per validare l'importo
export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 999999.99
}

// Funzione per ottenere i metadati dell'ordine
export function getOrderMetadata(orderId: string, userId?: string): Record<string, string> {
  const metadata: Record<string, string> = {
    order_id: orderId,
    source: 'ecommerce_miele'
  }

  if (userId) {
    metadata.user_id = userId
  }

  return metadata
}
