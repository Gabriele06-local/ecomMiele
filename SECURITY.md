# 🔒 Guida alla Sicurezza - Ecommerce Miele d'Autore

## Panoramica Sicurezza

Questo documento descrive le misure di sicurezza implementate per proteggere l'ecommerce Miele d'Autore da minacce comuni e garantire la privacy degli utenti.

## 1. 🛡️ Sicurezza Frontend

### 1.1 Content Security Policy (CSP)
```html
<!-- Implementato in netlify.toml -->
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.skypack.dev https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;
  frame-src https://js.stripe.com;
```

### 1.2 Headers di Sicurezza
```http
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 1.3 Sanitizzazione Input
```javascript
// Sanitizzazione lato client
function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '') // Rimuove tag HTML
    .replace(/javascript:/gi, '') // Rimuove javascript:
    .trim();
}

// Validazione email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

## 2. 🔐 Autenticazione e Autorizzazione

### 2.1 Supabase Auth
```typescript
// Configurazione sicura
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Previene attacchi via URL
      flowType: 'pkce' // OAuth2 PKCE flow
    }
  }
);
```

### 2.2 Row Level Security (RLS)
```sql
-- Policy per prodotti (solo lettura pubblica)
CREATE POLICY "Products are publicly readable" ON products
  FOR SELECT USING (true);

-- Policy per ordini (solo utente proprietario)
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Policy per carrello (solo utente proprietario)
CREATE POLICY "Users can manage own cart" ON carts
  FOR ALL USING (auth.uid() = user_id);
```

### 2.3 Rate Limiting
```typescript
// Rate limiting nelle Edge Functions
import { rateLimiter } from '../_shared/rate-limiter.ts';

export default async function handler(req: Request) {
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  
  if (!await rateLimiter.check(clientIP)) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // ... resto della logica
}
```

## 3. 💳 Sicurezza Pagamenti

### 3.1 Stripe Integration
```typescript
// Validazione server-side
async function validatePayment(paymentIntentId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed');
    }
    
    return paymentIntent;
  } catch (error) {
    throw new Error('Invalid payment');
  }
}
```

### 3.2 Webhook Security
```typescript
// Verifica signature webhook
export default async function handler(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    // Processa evento solo se verificato
    await processWebhookEvent(event);
  } catch (error) {
    return new Response('Invalid signature', { status: 400 });
  }
}
```

## 4. 🤖 Sicurezza AI

### 4.1 Gemini API Security
```typescript
// Proxy sicuro per Gemini
export default async function handler(req: Request) {
  // Verifica autenticazione utente
  const token = req.headers.get('authorization');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Rate limiting per AI
  const clientIP = req.headers.get('x-forwarded-for');
  if (!await aiRateLimiter.check(clientIP)) {
    return new Response('AI rate limit exceeded', { status: 429 });
  }
  
  // Sanitizzazione input
  const { message } = await req.json();
  const sanitizedMessage = sanitizeAIInput(message);
  
  // Chiamata sicura a Gemini
  const response = await gemini.generateContent({
    contents: [{ role: 'user', parts: [{ text: sanitizedMessage }] }],
  });
  
  return new Response(JSON.stringify({ response: response.text() }));
}
```

### 4.2 Input Sanitization AI
```typescript
function sanitizeAIInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .substring(0, 1000) // Limite caratteri
    .trim();
}
```

## 5. 📊 Sicurezza Database

### 5.1 Prepared Statements
```sql
-- Uso di prepared statements per prevenire SQL injection
PREPARE get_product AS 
  SELECT * FROM products WHERE id = $1 AND active = true;

EXECUTE get_product(123);
```

### 5.2 Data Encryption
```sql
-- Encrypting sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash password (gestito da Supabase Auth)
-- Encrypt payment data
UPDATE orders SET 
  payment_data = pgp_sym_encrypt($1, $2)
WHERE id = $3;
```

### 5.3 Backup Security
```bash
# Backup criptato
pg_dump -h localhost -U postgres -d miele_db | gpg --symmetric --cipher-algo AES256 --output backup.sql.gpg

# Restore sicuro
gpg --decrypt backup.sql.gpg | psql -h localhost -U postgres -d miele_db
```

## 6. 🔍 Monitoring e Logging

### 6.1 Security Logging
```typescript
// Log eventi di sicurezza
function logSecurityEvent(event: string, details: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    details,
    severity: 'SECURITY'
  }));
}

// Uso nei punti critici
logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
  email: sanitizedEmail,
  ip: clientIP,
  userAgent: req.headers.get('user-agent')
});
```

### 6.2 Error Handling
```typescript
// Gestione sicura degli errori
export default async function handler(req: Request) {
  try {
    // Logica business
  } catch (error) {
    // Non esporre dettagli interni
    console.error('Internal error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

## 7. 🚨 Incident Response

### 7.1 Security Incident Checklist
```markdown
## In caso di incidente di sicurezza:

1. **Identificazione**
   - [ ] Confermare la natura dell'incidente
   - [ ] Documentare timestamp e dettagli
   - [ ] Valutare impatto e severità

2. **Contenimento**
   - [ ] Isolare sistemi compromessi
   - [ ] Revocare accessi sospetti
   - [ ] Implementare misure temporanee

3. **Eradicazione**
   - [ ] Rimuovere minacce identificate
   - [ ] Patchare vulnerabilità
   - [ ] Aggiornare configurazioni

4. **Recovery**
   - [ ] Ripristinare servizi
   - [ ] Verificare integrità dati
   - [ ] Monitorare attività sospette

5. **Post-Incident**
   - [ ] Documentare lezioni apprese
   - [ ] Aggiornare procedure
   - [ ] Notificare stakeholder
```

### 7.2 Emergency Contacts
```yaml
Security Team:
  - Lead: security@mieledautore.com
  - Backup: admin@mieledautore.com

External:
  - Supabase Support: support@supabase.com
  - Stripe Support: support@stripe.com
  - Netlify Support: support@netlify.com
```

## 8. 📋 Security Audit

### 8.1 Checklist Mensile
```markdown
## Audit Sicurezza Mensile:

### Autenticazione
- [ ] Verificare politiche RLS
- [ ] Controllare utenti inattivi
- [ ] Aggiornare password admin

### Sistema
- [ ] Aggiornare dipendenze
- [ ] Verificare log di sicurezza
- [ ] Testare backup e recovery

### Pagamenti
- [ ] Verificare configurazione Stripe
- [ ] Controllare webhook
- [ ] Audit transazioni sospette

### AI e Recensioni
- [ ] Verificare moderazione AI
- [ ] Controllare contenuti segnalati
- [ ] Aggiornare filtri anti-spam
```

### 8.2 Penetration Testing
```bash
# Test automatici di sicurezza
npm audit

# Test manuali consigliati:
# - SQL Injection
# - XSS
# - CSRF
# - Authentication bypass
# - Authorization flaws
```

## 9. 🔐 Privacy e GDPR

### 9.1 Data Minimization
```typescript
// Raccogliere solo dati necessari
interface UserProfile {
  id: string;
  email: string; // Necessario per auth
  full_name?: string; // Opzionale
  // Non raccogliere: telefono, indirizzo completo
}
```

### 9.2 Data Retention
```sql
-- Cancellazione automatica dati vecchi
DELETE FROM cart_items 
WHERE created_at < NOW() - INTERVAL '30 days'
AND cart_id NOT IN (SELECT id FROM orders);

DELETE FROM sessions 
WHERE expires_at < NOW();
```

### 9.3 Right to be Forgotten
```typescript
// Implementazione GDPR Article 17
async function deleteUserData(userId: string) {
  await supabase
    .from('orders')
    .delete()
    .eq('user_id', userId);
    
  await supabase
    .from('reviews')
    .delete()
    .eq('user_id', userId);
    
  // Anonimizzare invece di cancellare per ordini completati
  await supabase
    .from('orders')
    .update({ user_id: null, customer_email: 'deleted@example.com' })
    .eq('user_id', userId)
    .eq('status', 'completed');
}
```

## 10. 📚 Risorse e Training

### 10.1 Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [Stripe Security Guide](https://stripe.com/docs/security)
- [Netlify Security Headers](https://docs.netlify.com/security/headers/)

### 10.2 Team Training
```markdown
## Argomenti di training per il team:

1. **Secure Coding Practices**
   - Input validation
   - Output encoding
   - Error handling

2. **Authentication & Authorization**
   - OAuth2 flows
   - JWT security
   - Session management

3. **Data Protection**
   - Encryption at rest
   - Encryption in transit
   - PII handling

4. **Incident Response**
   - Detection procedures
   - Response protocols
   - Communication plans
```

---

**🛡️ La sicurezza è un processo continuo. Questo documento deve essere aggiornato regolarmente per riflettere le nuove minacce e le migliori pratiche.**
