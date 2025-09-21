// Edge Function per l'AI Assistant con Gemini
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createCorsResponse, handleCors } from '../_shared/cors.ts'
import { supabase, getUserFromRequest, validateInput, sanitizeText, checkRateLimit } from '../_shared/supabaseClient.ts'

interface AIRequest {
  message: string
  context?: {
    timestamp?: string
    page?: string
    userAgent?: string
    availableProducts?: any[]
    cartItems?: number
  }
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

    // Parsing del body della richiesta
    const body: AIRequest = await req.json()
    
    // Validazione input
    validateInput(body, ['message'])
    
    const message = sanitizeText(body.message)
    
    if (message.length < 3) {
      return createCorsResponse(
        { success: false, error: 'Message too short' },
        400
      )
    }

    // Verifica l'autenticazione (opzionale per l'AI)
    let user = null
    try {
      user = await getUserFromRequest(req)
    } catch (error) {
      // L'AI può funzionare anche senza autenticazione
      console.log('AI request without authentication')
    }

    // Rate limiting
    const rateLimitKey = user ? `ai_${user.id}` : `ai_anon_${req.headers.get('x-forwarded-for') || 'unknown'}`
    const isAllowed = checkRateLimit(rateLimitKey, 20, 60000) // 20 richieste per minuto
    
    if (!isAllowed) {
      return createCorsResponse(
        { success: false, error: 'Too many requests. Please try again later.' },
        429
      )
    }

    // Ottieni il contesto aggiuntivo
    const context = await buildContext(body.context, user)

    // Genera la risposta con Gemini
    const response = await generateAIResponse(message, context)

    // Log dell'interazione (opzionale)
    if (user) {
      await logAIInteraction(user.id, message, response)
    }

    return createCorsResponse({
      success: true,
      data: {
        response,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('AI Assistant error:', error)
    
    // Assicurati che l'errore sia sempre una risposta CORS valida
    return createCorsResponse(
      { 
        success: false, 
        error: 'Il servizio AI è temporaneamente non disponibile. Riprova più tardi.',
        details: error.message 
      },
      500
    )
  }
})

// Funzione per costruire il contesto
async function buildContext(requestContext: any = {}, user: any = null) {
  const context = {
    timestamp: new Date().toISOString(),
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.first_name || 'Utente'
    } : null,
    page: requestContext.page || 'unknown',
    ...requestContext
  }

  // Aggiungi informazioni sui prodotti disponibili
  if (!context.availableProducts) {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, category, price, description')
        .eq('is_active', true)
        .limit(10)

      context.availableProducts = products || []
    } catch (error) {
      console.error('Error fetching products for context:', error)
      context.availableProducts = []
    }
  }

  // Aggiungi informazioni sul carrello se l'utente è autenticato
  if (user && !context.cartItems) {
    try {
      const { data: cart } = await supabase
        .from('carts')
        .select(`
          cart_items (
            quantity,
            products (
              name,
              price
            )
          )
        `)
        .eq('user_id', user.id)
        .single()

      if (cart?.cart_items) {
        context.cartItems = cart.cart_items.length
        context.cartTotal = cart.cart_items.reduce((sum: number, item: any) => 
          sum + (item.products.price * item.quantity), 0
        )
      }
    } catch (error) {
      console.error('Error fetching cart for context:', error)
    }
  }

  return context
}

// Funzione per generare la risposta AI
async function generateAIResponse(message: string, context: any): Promise<string> {
  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Costruisci il prompt per Gemini
    const prompt = buildPrompt(message, context)

    // Chiama l'API di Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error('Failed to get AI response')
    }

    const data = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from AI')
    }

    let aiResponse = data.candidates[0].content.parts[0].text

    // Post-processa la risposta
    aiResponse = postProcessResponse(aiResponse, context)

    return aiResponse

  } catch (error) {
    console.error('Error generating AI response:', error)
    
    // Fallback response
    return generateFallbackResponse(message)
  }
}

// Funzione per costruire il prompt
function buildPrompt(message: string, context: any): string {
  const products = context.availableProducts || []
  const productList = products.map((p: any) => 
    `- ${p.name} (${p.category}): €${p.price} - ${p.description}`
  ).join('\n')

  const cartInfo = context.cartItems > 0 
    ? `\nCarrello attuale: ${context.cartItems} prodotti per un totale di €${context.cartTotal?.toFixed(2) || '0.00'}`
    : ''

  return `Sei un assistente AI specializzato in miele artigianale per l'ecommerce "Miele d'Autore". 

CONTESTO:
- Sei un esperto di miele italiano di alta qualità
- Offri consigli personalizzati sui prodotti
- Sei amichevole, professionale e conoscitore della materia
- Parli sempre in italiano
- Mantieni le risposte concise ma informative (max 200 parole)

PRODOTTI DISPONIBILI:
${productList}
${cartInfo}

UTENTE: ${context.user ? `Ciao ${context.user.name}!` : 'Ciao!'}

RICHIESTA: ${message}

Rispondi in modo utile e coinvolgente. Se l'utente chiede consigli sui prodotti, suggerisci quelli più adatti basandoti sui prodotti disponibili. Se chiede informazioni sui mieli, condividi la tua conoscenza specializzata.`
}

// Funzione per post-processare la risposta
function postProcessResponse(response: string, context: any): string {
  // Rimuovi eventuali riferimenti a prodotti non disponibili
  // Aggiungi emoji appropriate
  // Assicurati che il tono sia sempre amichevole
  
  let processedResponse = response.trim()
  
  // Aggiungi emoji se appropriato
  if (processedResponse.includes('miele')) {
    processedResponse = processedResponse.replace(/miele/gi, 'miele 🍯')
  }
  
  if (processedResponse.includes('consiglio')) {
    processedResponse = processedResponse.replace(/consiglio/gi, 'consiglio 💡')
  }
  
  if (processedResponse.includes('grazie')) {
    processedResponse = processedResponse.replace(/grazie/gi, 'grazie 😊')
  }

  // Assicurati che finisca con un punto
  if (!processedResponse.endsWith('.') && !processedResponse.endsWith('!') && !processedResponse.endsWith('?')) {
    processedResponse += '.'
  }

  return processedResponse
}

// Funzione per generare una risposta di fallback
function generateFallbackResponse(message: string): string {
  const fallbackResponses = [
    "Mi dispiace, al momento non riesco a rispondere. Prova a riformulare la tua domanda! 🤔",
    "Sono temporaneamente non disponibile, ma sono qui per aiutarti con i nostri mieli artigianali! 🍯",
    "C'è stato un piccolo problema tecnico. Dimmi pure cosa ti serve e farò del mio meglio! 😊",
    "Ops! Qualcosa non ha funzionato. Riprova e sarò felice di aiutarti con i nostri prodotti! 💪"
  ]

  // Scegli una risposta basata sul contenuto del messaggio
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('miele')) {
    return "Mi dispiace, al momento non riesco a darti consigli sui nostri mieli. Prova a contattare il nostro team di supporto! 🍯"
  }
  
  if (lowerMessage.includes('prodotto') || lowerMessage.includes('acquisto')) {
    return "Non riesco al momento a suggerirti prodotti specifici. Dai un'occhiata al nostro catalogo online! 🛒"
  }

  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
}

// Funzione per loggare le interazioni AI (opzionale)
async function logAIInteraction(userId: string, message: string, response: string) {
  try {
    await supabase
      .from('ai_interactions')
      .insert({
        user_id: userId,
        user_message: message,
        ai_response: response,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    // Non bloccare la risposta per errori di logging
    console.error('Error logging AI interaction:', error)
  }
}
