// Servizio Email per Conferme Ordini
// Usa Resend per l'invio delle email

interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
}

interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerEmail: string
  orderDate: string
  totalAmount: number
  items: Array<{
    name: string
    quantity: number
    price: number
    image_url?: string
  }>
  shippingAddress: any
  billingAddress: any
}

// Configurazione email
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'ordini@mieledautore.com'
const COMPANY_NAME = 'Miele d\'Autore'
const SUPPORT_EMAIL = 'support@mieledautore.com'

// Funzione principale per inviare email
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send')
    return false
  }

  try {
    console.log('📧 Sending email to:', emailData.to)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailData.from || FROM_EMAIL,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Email send failed:', response.status, errorData)
      return false
    }

    const result = await response.json()
    console.log('✅ Email sent successfully:', result.id)
    return true

  } catch (error) {
    console.error('❌ Email service error:', error)
    return false
  }
}

// Invia email di conferma ordine
export async function sendOrderConfirmationEmail(orderData: OrderEmailData): Promise<boolean> {
  const subject = `Conferma Ordine #${orderData.orderNumber} - ${COMPANY_NAME}`
  const html = generateOrderConfirmationHTML(orderData)
  
  return await sendEmail({
    to: orderData.customerEmail,
    subject,
    html
  })
}

// Invia email di aggiornamento stato ordine
export async function sendOrderStatusUpdateEmail(
  customerEmail: string,
  orderNumber: string,
  status: string,
  trackingNumber?: string
): Promise<boolean> {
  const subject = `Aggiornamento Ordine #${orderNumber} - ${COMPANY_NAME}`
  const html = generateOrderStatusHTML(orderNumber, status, trackingNumber)
  
  return await sendEmail({
    to: customerEmail,
    subject,
    html
  })
}

// Genera HTML per email di conferma ordine
function generateOrderConfirmationHTML(orderData: OrderEmailData): string {
  const itemsHTML = orderData.items.map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: left;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">` : ''}
          <div>
            <strong>${item.name}</strong>
            <br>
            <small style="color: #6b7280;">Quantità: ${item.quantity}</small>
          </div>
        </div>
      </td>
      <td style="padding: 12px; text-align: right; font-weight: 600;">
        €${(item.price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join('')

  const shippingAddressHTML = formatAddressForEmail(orderData.shippingAddress)

  return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conferma Ordine</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; color: white;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🍯 ${COMPANY_NAME}</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Grazie per il tuo ordine!</p>
    </div>

    <!-- Order Success -->
    <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
        <h2 style="color: #16a34a; margin: 0 0 10px 0;">Ordine Confermato!</h2>
        <p style="margin: 0; color: #166534;">Il tuo ordine è stato ricevuto e sarà processato a breve.</p>
    </div>

    <!-- Order Details -->
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">Dettagli Ordine</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
                <strong>Numero Ordine:</strong><br>
                <span style="color: #f59e0b; font-size: 18px; font-weight: 600;">#${orderData.orderNumber}</span>
            </div>
            <div>
                <strong>Data Ordine:</strong><br>
                ${orderData.orderDate}
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Prodotto</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Totale</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
            <tfoot>
                <tr style="background: #f9fafb; font-weight: bold;">
                    <td style="padding: 15px; text-align: right;">Totale Ordine:</td>
                    <td style="padding: 15px; text-align: right; color: #f59e0b; font-size: 20px;">€${orderData.totalAmount.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <!-- Shipping Address -->
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">Indirizzo di Spedizione</h3>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            ${shippingAddressHTML}
        </div>
    </div>

    <!-- Next Steps -->
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">Prossimi Passi</h3>
        
        <div style="display: grid; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 24px;">📦</div>
                <div>
                    <strong>Preparazione (1-2 giorni lavorativi)</strong><br>
                    <small style="color: #6b7280;">Il tuo ordine verrà preparato con cura nel nostro laboratorio.</small>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 24px;">🚚</div>
                <div>
                    <strong>Spedizione (2-5 giorni lavorativi)</strong><br>
                    <small style="color: #6b7280;">Riceverai il codice di tracking via email quando il pacco sarà in viaggio.</small>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 24px;">🎯</div>
                <div>
                    <strong>Consegna</strong><br>
                    <small style="color: #6b7280;">Il tuo miele arriverà fresco e pronto da gustare!</small>
                </div>
            </div>
        </div>
    </div>

    <!-- Support -->
    <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center;">
        <h4 style="color: #1f2937; margin-top: 0;">Hai domande?</h4>
        <p style="margin: 10px 0;">Siamo qui per aiutarti! Contattaci per qualsiasi necessità.</p>
        <div style="margin: 15px 0;">
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #f59e0b; text-decoration: none; font-weight: 600;">📧 ${SUPPORT_EMAIL}</a>
        </div>
        <div>
            <a href="tel:+39123456789" style="color: #f59e0b; text-decoration: none; font-weight: 600;">📞 +39 123 456 789</a>
        </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>&copy; 2024 ${COMPANY_NAME}. Tutti i diritti riservati.</p>
        <p>Il miele più pregiato, direttamente dal produttore alla tua tavola.</p>
    </div>

</body>
</html>
  `
}

// Genera HTML per email di aggiornamento stato
function generateOrderStatusHTML(orderNumber: string, status: string, trackingNumber?: string): string {
  const statusMessages = {
    'in_corso': {
      title: '📦 Ordine in Preparazione',
      message: 'Il tuo ordine è in preparazione nel nostro laboratorio.',
      color: '#f59e0b'
    },
    'spedito': {
      title: '🚚 Ordine Spedito',
      message: 'Il tuo ordine è stato spedito e arriverà presto!',
      color: '#10b981'
    },
    'completato': {
      title: '🎉 Ordine Consegnato',
      message: 'Il tuo ordine è stato consegnato. Speriamo ti piaccia!',
      color: '#22c55e'
    }
  }

  const statusInfo = statusMessages[status] || {
    title: '📋 Aggiornamento Ordine',
    message: 'C\'è un aggiornamento per il tuo ordine.',
    color: '#6b7280'
  }

  const trackingHTML = trackingNumber ? `
    <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <h3 style="color: #0369a1; margin: 0 0 10px 0;">📦 Codice di Tracking</h3>
        <p style="font-size: 18px; font-weight: 600; color: #0369a1; margin: 0; letter-spacing: 1px;">${trackingNumber}</p>
        <p style="color: #075985; margin: 10px 0 0 0; font-size: 14px;">Usa questo codice per tracciare la spedizione.</p>
    </div>
  ` : ''

  return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aggiornamento Ordine</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; color: white;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🍯 ${COMPANY_NAME}</h1>
    </div>

    <!-- Status Update -->
    <div style="background: white; border: 2px solid ${statusInfo.color}; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
        <h2 style="color: ${statusInfo.color}; margin: 0 0 15px 0; font-size: 24px;">${statusInfo.title}</h2>
        <p style="margin: 0 0 15px 0; font-size: 16px;">${statusInfo.message}</p>
        <p style="margin: 0; color: #6b7280;">Ordine #<strong style="color: ${statusInfo.color};">${orderNumber}</strong></p>
    </div>

    ${trackingHTML}

    <!-- Support -->
    <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center;">
        <h4 style="color: #1f2937; margin-top: 0;">Hai domande?</h4>
        <p style="margin: 10px 0;">Contattaci per qualsiasi necessità riguardo al tuo ordine.</p>
        <div style="margin: 15px 0;">
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #f59e0b; text-decoration: none; font-weight: 600;">📧 ${SUPPORT_EMAIL}</a>
        </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>&copy; 2024 ${COMPANY_NAME}. Tutti i diritti riservati.</p>
    </div>

</body>
</html>
  `
}

// Formatta indirizzo per email
function formatAddressForEmail(address: any): string {
  if (!address) return '<p>Indirizzo non disponibile</p>'
  
  if (typeof address === 'string') {
    return `<p>${address}</p>`
  }
  
  if (typeof address === 'object') {
    const parts = []
    if (address.name) parts.push(`<strong>${address.name}</strong>`)
    if (address.address_line_1) parts.push(address.address_line_1)
    if (address.address_line_2) parts.push(address.address_line_2)
    if (address.city || address.postal_code) {
      parts.push(`${address.postal_code || ''} ${address.city || ''}`.trim())
    }
    if (address.country) parts.push(address.country)
    if (address.phone) parts.push(`Tel: ${address.phone}`)
    
    return parts.map(part => `<p style="margin: 5px 0;">${part}</p>`).join('')
  }
  
  return '<p>Indirizzo non disponibile</p>'
}

// Esporta tipi per TypeScript
export type { EmailData, OrderEmailData }
