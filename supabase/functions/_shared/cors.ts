// Configurazione CORS per Edge Functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Funzione per gestire le richieste CORS preflight
export function handleCors(request: Request): Response | null {
  // Gestisci le richieste preflight
  if (request.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders 
    })
  }
  
  return null
}

// Funzione per aggiungere gli header CORS a una risposta
export function addCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...response.headers,
      ...corsHeaders
    }
  })
  
  return newResponse
}

// Funzione per creare una risposta CORS
export function createCorsResponse(
  body: string | object, 
  status = 200, 
  additionalHeaders: Record<string, string> = {}
): Response {
  const responseBody = typeof body === 'string' ? body : JSON.stringify(body)
  
  return new Response(responseBody, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  })
}

// Funzione per creare una risposta di errore CORS
export function createCorsErrorResponse(
  message: string, 
  status = 400, 
  additionalHeaders: Record<string, string> = {}
): Response {
  return createCorsResponse(
    { success: false, error: message },
    status,
    additionalHeaders
  )
}

// Funzione per creare una risposta di successo CORS
export function createCorsSuccessResponse(
  data: any, 
  status = 200, 
  additionalHeaders: Record<string, string> = {}
): Response {
  return createCorsResponse(
    { success: true, data },
    status,
    additionalHeaders
  )
}
