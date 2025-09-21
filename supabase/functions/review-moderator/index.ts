// Edge Function per la moderazione automatica delle recensioni con AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createCorsResponse, handleCors } from '../_shared/cors.ts'
import { supabase, getUserFromRequest, validateInput, sanitizeText } from '../_shared/supabaseClient.ts'

interface ReviewRequest {
  review_id: string
  action?: 'moderate' | 'approve' | 'reject'
  admin_notes?: string
}

interface ReviewModerationResult {
  isAppropriate: boolean
  confidence: number
  reason?: string
  suggestedAction: 'approve' | 'reject' | 'manual_review'
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
    
    // Verifica se l'utente è admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return createCorsResponse(
        { success: false, error: 'Admin access required' },
        403
      )
    }

    // Parsing del body della richiesta
    const body: ReviewRequest = await req.json()
    
    // Validazione input
    validateInput(body, ['review_id'])
    
    const reviewId = body.review_id
    const action = body.action || 'moderate'

    // Recupera la recensione dal database
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        products (
          name
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return createCorsResponse(
        { success: false, error: 'Review not found' },
        404
      )
    }

    let result

    switch (action) {
      case 'moderate':
        // Moderazione automatica con AI
        result = await moderateReviewWithAI(review)
        break
      
      case 'approve':
        result = await approveReview(reviewId, body.admin_notes)
        break
      
      case 'reject':
        result = await rejectReview(reviewId, body.admin_notes)
        break
      
      default:
        return createCorsResponse(
          { success: false, error: 'Invalid action' },
          400
        )
    }

    return createCorsResponse({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Review moderator error:', error)
    return createCorsResponse(
      { success: false, error: 'Internal server error' },
      500
    )
  }
})

// Funzione per moderare una recensione con AI
async function moderateReviewWithAI(review: any): Promise<any> {
  try {
    // Analizza il contenuto della recensione
    const moderationResult = await analyzeReviewContent(review.comment)
    
    // Aggiorna la recensione con il risultato della moderazione
    const updateData: any = {
      moderation_notes: moderationResult.reason || '',
      updated_at: new Date().toISOString()
    }

    // Applica la decisione automatica se la confidenza è alta
    if (moderationResult.confidence > 0.8) {
      updateData.is_approved = moderationResult.isAppropriate
      
      if (moderationResult.isAppropriate) {
        updateData.moderation_notes = 'Approvato automaticamente da AI'
      } else {
        updateData.moderation_notes = `Rifiutato automaticamente da AI: ${moderationResult.reason}`
      }
    } else {
      // Richiede revisione manuale
      updateData.moderation_notes = `Richiede revisione manuale - Confidenza: ${Math.round(moderationResult.confidence * 100)}%`
    }

    const { error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', review.id)

    if (updateError) {
      throw new Error(`Failed to update review: ${updateError.message}`)
    }

    return {
      review_id: review.id,
      action_taken: moderationResult.confidence > 0.8 ? moderationResult.suggestedAction : 'manual_review',
      confidence: moderationResult.confidence,
      reason: moderationResult.reason,
      is_approved: moderationResult.confidence > 0.8 ? moderationResult.isAppropriate : null
    }

  } catch (error) {
    console.error('Error moderating review with AI:', error)
    throw error
  }
}

// Funzione per analizzare il contenuto della recensione
async function analyzeReviewContent(comment: string): Promise<ReviewModerationResult> {
  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!geminiApiKey) {
      // Fallback senza AI
      return {
        isAppropriate: true,
        confidence: 0.5,
        reason: 'AI not configured',
        suggestedAction: 'manual_review'
      }
    }

    // Costruisci il prompt per la moderazione
    const prompt = buildModerationPrompt(comment)

    // Chiama l'API di Gemini per la moderazione
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
          temperature: 0.1, // Bassa temperatura per maggiore consistenza
          topK: 10,
          topP: 0.8,
          maxOutputTokens: 512,
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
      throw new Error('Failed to get AI moderation response')
    }

    const data = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from AI')
    }

    const aiResponse = data.candidates[0].content.parts[0].text
    
    // Parsing della risposta AI
    return parseModerationResponse(aiResponse)

  } catch (error) {
    console.error('Error analyzing review content:', error)
    
    // Fallback: approva se non ci sono parole chiave problematiche
    const isAppropriate = !containsInappropriateContent(comment)
    
    return {
      isAppropriate,
      confidence: 0.6,
      reason: isAppropriate ? 'No obvious inappropriate content detected' : 'Potentially inappropriate content detected',
      suggestedAction: isAppropriate ? 'approve' : 'manual_review'
    }
  }
}

// Funzione per costruire il prompt di moderazione
function buildModerationPrompt(comment: string): string {
  return `Analizza questa recensione di un prodotto miele per determinare se è appropriata per essere pubblicata su un ecommerce.

RECENSIONE DA ANALIZZARE:
"${comment}"

CRITERI DI VALUTAZIONE:
1. CONTENUTO INAPPROPRIATO: linguaggio offensivo, spam, contenuti sessuali, odio, discriminazione
2. RELEVANZA: la recensione deve essere relativa al prodotto miele
3. UTILITÀ: deve fornire informazioni utili ad altri clienti
4. AUTENTICITÀ: non deve sembrare falsa o scritta da bot

RISPONDI SOLO CON UN JSON IN QUESTO FORMATO:
{
  "isAppropriate": true/false,
  "confidence": 0.0-1.0,
  "reason": "motivo breve della decisione",
  "suggestedAction": "approve/reject/manual_review"
}

Sii conservativo: se hai dubbi, scegli "manual_review".`
}

// Funzione per parsare la risposta di moderazione
function parseModerationResponse(response: string): ReviewModerationResult {
  try {
    // Cerca il JSON nella risposta
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const result = JSON.parse(jsonMatch[0])
    
    return {
      isAppropriate: Boolean(result.isAppropriate),
      confidence: Math.max(0, Math.min(1, parseFloat(result.confidence) || 0.5)),
      reason: result.reason || 'AI analysis completed',
      suggestedAction: result.suggestedAction || 'manual_review'
    }

  } catch (error) {
    console.error('Error parsing AI response:', error)
    
    // Fallback
    return {
      isAppropriate: true,
      confidence: 0.5,
      reason: 'Failed to parse AI response',
      suggestedAction: 'manual_review'
    }
  }
}

// Funzione per approvare una recensione
async function approveReview(reviewId: string, adminNotes?: string): Promise<any> {
  const { error } = await supabase
    .from('reviews')
    .update({
      is_approved: true,
      moderation_notes: adminNotes || 'Approvato manualmente da admin',
      updated_at: new Date().toISOString()
    })
    .eq('id', reviewId)

  if (error) {
    throw new Error(`Failed to approve review: ${error.message}`)
  }

  return {
    review_id: reviewId,
    action_taken: 'approve',
    is_approved: true
  }
}

// Funzione per rifiutare una recensione
async function rejectReview(reviewId: string, adminNotes?: string): Promise<any> {
  const { error } = await supabase
    .from('reviews')
    .update({
      is_approved: false,
      moderation_notes: adminNotes || 'Rifiutato manualmente da admin',
      updated_at: new Date().toISOString()
    })
    .eq('id', reviewId)

  if (error) {
    throw new Error(`Failed to reject review: ${error.message}`)
  }

  return {
    review_id: reviewId,
    action_taken: 'reject',
    is_approved: false
  }
}

// Funzione di fallback per rilevare contenuti inappropriati
function containsInappropriateContent(text: string): boolean {
  const inappropriateWords = [
    'spam', 'fake', 'scam', 'fraud',
    'hate', 'odio', 'stupid', 'idiot',
    'fuck', 'shit', 'merda', 'cazzo',
    'sex', 'sesso', 'porn', 'porno'
  ]

  const lowerText = text.toLowerCase()
  
  return inappropriateWords.some(word => lowerText.includes(word))
}

// Endpoint per moderazione batch (opzionale)
async function moderatePendingReviews(): Promise<any> {
  try {
    // Recupera tutte le recensioni in attesa di moderazione
    const { data: pendingReviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_approved', false)
      .is('moderation_notes', null)
      .limit(10) // Limita per evitare sovraccarico

    if (error || !pendingReviews) {
      throw new Error('Failed to fetch pending reviews')
    }

    const results = []

    for (const review of pendingReviews) {
      try {
        const result = await moderateReviewWithAI(review)
        results.push(result)
      } catch (error) {
        console.error(`Error moderating review ${review.id}:`, error)
        results.push({
          review_id: review.id,
          error: error.message
        })
      }
    }

    return results

  } catch (error) {
    console.error('Error in batch moderation:', error)
    throw error
  }
}
