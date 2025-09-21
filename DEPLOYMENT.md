# 🚀 Guida al Deployment - Ecommerce Miele d'Autore

## Panoramica dell'Architettura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Supabase    │    │   Edge Funcs    │
│    (Netlify)    │◄──►│   (Database)    │◄──►│   (Deno)        │
│                 │    │                 │    │                 │
│ • HTML/CSS/JS   │    │ • PostgreSQL    │    │ • Checkout      │
│ • SPA           │    │ • RLS Policies  │    │ • AI Assistant  │
│ • CDN           │    │ • Auth          │    │ • Webhook       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. 🎯 Setup Supabase

### 1.1 Creare Progetto Supabase
```bash
# Installare Supabase CLI
npm install -g supabase

# Login
supabase login

# Inizializzare progetto
supabase init

# Linkare al progetto remoto
supabase link --project-ref your-project-ref
```

### 1.2 Database Schema
```sql
-- Eseguire lo schema da database/schema.sql
supabase db push
```

### 1.3 RLS Policies
```sql
-- Eseguire le policies da database/rls_policies.sql
supabase db push
```

### 1.4 Storage Bucket
```bash
# Creare bucket per le immagini
supabase storage create honey-images --public

# Configurare policies per il bucket
supabase db push
```

## 2. 🌐 Setup Netlify

### 2.1 Deploy Automatico
```bash
# Connettere repository GitHub a Netlify
# Impostare build command: echo "Frontend ready"
# Impostare publish directory: frontend
```

### 2.2 Variabili d'Ambiente
```bash
# Aggiungere in Netlify Dashboard > Site Settings > Environment Variables:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
GEMINI_API_KEY=your-gemini-key
```

### 2.3 Headers di Sicurezza
```toml
# Il file netlify.toml include già:
- Content Security Policy
- X-Frame-Options
- Cache-Control
- Redirects per SPA
```

## 3. ⚡ Edge Functions

### 3.1 Deploy Functions
```bash
# Deploy singola function
supabase functions deploy checkout

# Deploy tutte le functions
supabase functions deploy

# Test locale
supabase functions serve
```

### 3.2 Configurazione Webhook Stripe
```bash
# In Stripe Dashboard, aggiungere webhook endpoint:
https://your-project.supabase.co/functions/v1/stripe-webhook

# Eventi da ascoltare:
- payment_intent.succeeded
- payment_intent.payment_failed
- checkout.session.completed
```

## 4. 🔐 Configurazione Sicurezza

### 4.1 Supabase RLS
```sql
-- Verificare che tutte le policies siano attive
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 4.2 Rate Limiting
```typescript
// Configurare rate limiting nelle Edge Functions
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // max 100 richieste per IP
});
```

### 4.3 Input Sanitization
```typescript
// Tutti gli input vengono sanitizzati
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const cleanInput = (input: string) => {
  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  return purify.sanitize(input);
};
```

## 5. 📊 Monitoring e Analytics

### 5.1 Supabase Dashboard
- Monitorare performance database
- Verificare errori nelle functions
- Controllare log di autenticazione

### 5.2 Netlify Analytics
- Performance frontend
- Errori JavaScript
- Core Web Vitals

### 5.3 Stripe Dashboard
- Transazioni completate
- Webhook delivery
- Revenue tracking

## 6. 🧪 Testing

### 6.1 Test Locale
```bash
# Test frontend
cd frontend
python -m http.server 8080

# Test Supabase locale
supabase start
supabase functions serve

# Test Edge Functions
curl -X POST http://localhost:54321/functions/v1/checkout \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 6.2 Test Production
```bash
# Verificare endpoint
curl https://your-site.netlify.app/api/health

# Test checkout flow
# Test AI assistant
# Test review system
```

## 7. 📈 Ottimizzazioni Performance

### 7.1 Frontend
```javascript
// Lazy loading immagini
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

// Service Worker per caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### 7.2 Database
```sql
-- Indici per performance
CREATE INDEX CONCURRENTLY idx_products_category ON products(category);
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
CREATE INDEX CONCURRENTLY idx_reviews_product_id ON reviews(product_id);
```

### 7.3 CDN
- Netlify CDN per assets statici
- Supabase CDN per immagini
- Cache headers ottimizzati

## 8. 🔄 CI/CD Pipeline

### 8.1 GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v1.2
        with:
          publish-dir: './frontend'
          production-branch: main
```

### 8.2 Supabase Migrations
```bash
# Auto-deploy migrations
supabase db push --include-all

# Backup prima di deployment
supabase db dump --data-only > backup.sql
```

## 9. 🚨 Troubleshooting

### 9.1 Errori Comuni
```bash
# RLS Policy Error
# Verificare che l'utente abbia i permessi corretti

# CORS Error
# Controllare headers nelle Edge Functions

# Stripe Webhook Error
# Verificare endpoint e secret key
```

### 9.2 Log Debug
```typescript
// Nelle Edge Functions
console.log('Debug info:', {
  headers: req.headers,
  body: await req.json(),
  user: user
});
```

## 10. 📋 Checklist Deployment

### Pre-Deployment
- [ ] Database schema applicato
- [ ] RLS policies configurate
- [ ] Edge Functions deployate
- [ ] Variabili ambiente configurate
- [ ] Test locale completati

### Post-Deployment
- [ ] Test checkout flow
- [ ] Test autenticazione
- [ ] Test AI assistant
- [ ] Test review system
- [ ] Monitoraggio errori attivo

### Sicurezza
- [ ] HTTPS abilitato
- [ ] CSP headers configurati
- [ ] Rate limiting attivo
- [ ] Input sanitization verificata
- [ ] Webhook signatures validate

## 11. 📞 Supporto

### Risorse Utili
- [Supabase Docs](https://supabase.com/docs)
- [Netlify Docs](https://docs.netlify.com/)
- [Stripe Docs](https://stripe.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)

### Contatti
- Email: support@mieledautore.com
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)

---

**🎉 Congratulazioni! Il tuo ecommerce Miele d'Autore è ora live e pronto per vendere miele premium!**
