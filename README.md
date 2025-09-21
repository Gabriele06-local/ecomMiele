# 🐝 Ecommerce Miele d'Autore

Un ecommerce moderno e sicuro per la vendita di miele artigianale premium, con integrazione AI per consigli personalizzati.

## 🚀 Caratteristiche Principali

- **Frontend Moderno**: SPA responsive con HTML5, CSS3 e JavaScript vanilla
- **Backend Supabase**: Database PostgreSQL con Row Level Security (RLS)
- **Autenticazione Sicura**: Sistema di login/registrazione con Supabase Auth
- **Carrello Ibrido**: Gestione carrello per utenti anonimi e registrati
- **Checkout Sicuro**: Integrazione Stripe con webhook per conferma pagamenti
- **AI Assistant**: Chatbot intelligente con Google Gemini per consigli personalizzati
- **Sistema Recensioni**: Recensioni utenti con moderazione AI automatica
- **Edge Functions**: Logica business sicura con Deno Edge Runtime
- **Sicurezza Avanzata**: RLS, rate limiting, sanitizzazione input, CSP headers

## 🏗️ Architettura

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

## 📁 Struttura Progetto

```
ecomMiele/
├── frontend/                 # Frontend SPA
│   ├── index.html           # Homepage
│   ├── product.html         # Pagina prodotto
│   ├── cart.html           # Carrello
│   ├── login.html          # Login
│   ├── signup.html         # Registrazione
│   ├── profile.html        # Profilo utente
│   ├── admin.html          # Pannello admin
│   └── assets/             # CSS, JS, immagini
├── supabase/               # Configurazione Supabase
│   ├── migrations/         # Migrazioni database
│   └── functions/          # Edge Functions
├── database/               # Schema e policies
├── docs/                   # Documentazione
├── netlify.toml           # Configurazione Netlify
├── DEPLOYMENT.md          # Guida deployment
└── SECURITY.md            # Guida sicurezza
```

## 🛠️ Tecnologie Utilizzate

### Frontend
- **HTML5**: Struttura semantica e accessibile
- **CSS3**: Design responsive e moderno
- **JavaScript**: Logica client-side vanilla
- **Netlify**: Hosting e CDN globale

### Backend
- **Supabase**: Backend-as-a-Service
- **PostgreSQL**: Database relazionale
- **Row Level Security**: Sicurezza a livello di riga
- **Edge Functions**: Serverless functions con Deno

### Integrazioni
- **Stripe**: Pagamenti sicuri
- **Google Gemini**: AI per chatbot e moderazione
- **Font Awesome**: Icone
- **Google Fonts**: Tipografia

## 🚀 Quick Start

### 1. Clone del Repository
```bash
git clone https://github.com/your-username/ecomMiele.git
cd ecomMiele
```

### 2. Setup Supabase
```bash
# Installare Supabase CLI
npm install -g supabase

# Login e inizializzazione
supabase login
supabase init
supabase link --project-ref your-project-ref

# Deploy database schema
supabase db push
```

### 3. Deploy Edge Functions
```bash
# Deploy tutte le functions
supabase functions deploy

# Deploy singola function
supabase functions deploy checkout
```

### 4. Deploy Frontend
```bash
# Connettere repository a Netlify
# Configurare variabili ambiente:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - STRIPE_PUBLIC_KEY
# - GEMINI_API_KEY
```

## 📖 Documentazione

- **[Guida Deployment](DEPLOYMENT.md)**: Setup completo e deployment
- **[Guida Sicurezza](SECURITY.md)**: Misure di sicurezza implementate
- **[Database Schema](database/schema.sql)**: Struttura database
- **[RLS Policies](database/rls_policies.sql)**: Politiche di sicurezza

## 🔐 Sicurezza

Il progetto implementa multiple layer di sicurezza:

- **Row Level Security (RLS)**: Controllo accessi a livello database
- **Rate Limiting**: Prevenzione attacchi DDoS
- **Input Sanitization**: Protezione da XSS e injection
- **Content Security Policy**: Headers di sicurezza
- **Webhook Verification**: Validazione firme Stripe
- **AI Moderation**: Moderazione automatica contenuti

## 🧪 Testing

### Test Locale
```bash
# Frontend
cd frontend
python -m http.server 8080

# Supabase locale
supabase start
supabase functions serve
```

### Test Production
```bash
# Verificare endpoint
curl https://your-site.netlify.app/

# Test checkout flow
# Test AI assistant
# Test review system
```

## 📊 Monitoring

- **Supabase Dashboard**: Monitoraggio database e functions
- **Netlify Analytics**: Performance frontend
- **Stripe Dashboard**: Transazioni e webhook
- **Error Tracking**: Log centralizzati

## 🤝 Contribuire

1. Fork del repository
2. Creare feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Aprire Pull Request

## 📄 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 📞 Supporto

- **Email**: support@mieledautore.com
- **GitHub Issues**: [Repository Issues](https://github.com/your-repo/issues)
- **Documentazione**: Vedi cartella `docs/`

---

**🎉 Sviluppato con ❤️ per portare i migliori mieli artigianali d'Italia direttamente a casa tua!**
