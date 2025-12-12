# Panoramica Completa - RentAloo Web App

## 📋 Indice
1. [Panoramica Generale](#panoramica-generale)
2. [Stack Tecnologico](#stack-tecnologico)
3. [Architettura dell'Applicazione](#architettura-dellapplicazione)
4. [Funzionalità Principali](#funzionalità-principali)
5. [Database e Backend](#database-e-backend)
6. [Integrazioni Esterne](#integrazioni-esterne)
7. [UI/UX e Design System](#uiux-e-design-system)
8. [Considerazioni per App Mobile](#considerazioni-per-app-mobile)

---

## Panoramica Generale

**RentAloo** è una piattaforma peer-to-peer per il noleggio di attrezzature sportive e professionali. La piattaforma permette agli utenti di noleggiare e affittare attrezzature in diverse categorie: sci, fotografia, campeggio, costruzione, e molte altre.

### Caratteristiche Principali
- **Doppio Ruolo Utente**: Supporto per proprietari di attrezzature e noleggiatori con dashboard specifiche per ruolo
- **Gestione Attrezzature**: Lista, navigazione e gestione di attrezzature con descrizioni dettagliate, foto e calendari disponibilità
- **Sistema di Prenotazione Intelligente**: Flusso di prenotazione basato su richieste con controllo disponibilità e calcolo prezzi
- **Pagamenti Sicuri**: Elaborazione pagamenti integrata con sistema di escrow per transazioni sicure
- **Messaggistica in Tempo Reale**: Sistema di messaggistica integrato per comunicazione tra noleggiatori e proprietari
- **Recensioni e Valutazioni**: Sistema di recensioni completo con valutazioni a stelle e feedback dettagliati
- **Ricerca Basata su Localizzazione**: Ricerca e filtri per attrezzature per localizzazione, categoria, prezzo e disponibilità
- **Verifica Identità**: Processo di verifica multi-step per fiducia e sicurezza degli utenti
- **Design Responsive**: Design mobile-first con layout adattivi per tutte le dimensioni dello schermo
- **Internazionalizzazione**: Supporto per 5 lingue (EN, ES, FR, DE, IT)

---

## Stack Tecnologico

### Frontend
- **React 19.1.1** - Framework UI principale
- **TypeScript 5.9.3** (strict mode) - Type safety
- **Vite 7.1.7** - Build tool e dev server
- **Node.js 22.x** - Runtime environment

### UI & Styling
- **Tailwind CSS 4.1.16** (v4 con sintassi `@theme`)
- **Shadcn UI** (variante New York) - Componenti UI
- **Radix UI** - Primitivi accessibili
- **Lucide React** - Icone
- **CVA (Class Variance Authority)** - Gestione varianti componenti
- **OKLCH color space** - Sistema colori moderno

### Backend & Database
- **Supabase 2.76.1** - BaaS completo
  - PostgreSQL (database relazionale)
  - Row Level Security (RLS) per sicurezza
  - Authentication (email/password + OAuth)
  - Realtime subscriptions (messaggistica live)
  - Storage (immagini e documenti)
  - Edge Functions (Deno runtime)

### State Management & Forms
- **TanStack React Query 5.90.5** - Gestione stato server e cache
- **React Context API** - Stato globale (Auth, Theme, Role)
- **React Hook Form 7.65.0** - Gestione form
- **Zod 4.1.12** - Validazione schema

### Routing & Navigation
- **React Router DOM 7.9.4** - Routing client-side
- **nuqs 2.8.1** - Gestione query params URL (filtri ricerca)

### Pagamenti
- **Stripe** (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
  - Payment Intents API
  - Stripe Elements per input carte
  - Webhook per conferme pagamento

### Mappe & Localizzazione
- **Google Maps API** - Visualizzazione mappe e geocoding
- **date-fns 4.1.0** - Manipolazione date

### Internazionalizzazione
- **i18next 25.7.0** - Framework i18n
- **react-i18next 16.3.5** - Integrazione React
- **i18next-browser-languagedetector** - Rilevamento lingua browser

### Testing
- **Vitest 4.0.4** - Test runner
- **React Testing Library 16.3.0** - Testing componenti React
- **@testing-library/user-event** - Simulazione interazioni utente

### Altri Tool
- **Axios 1.13.0** - HTTP client
- **sonner 2.0.7** - Toast notifications
- **@vercel/analytics** - Analytics
- **react-day-picker 9.11.1** - Selezione date
- **embla-carousel-react** - Carousel immagini

---

## Architettura dell'Applicazione

### Struttura Directory

```
rentaloo-ai/
├── src/
│   ├── components/          # Componenti riutilizzabili
│   │   ├── auth/           # Autenticazione (LoginModal, SignupModal, form)
│   │   ├── booking/        # Sistema prenotazioni
│   │   │   ├── inspection-flow/  # Flusso ispezioni pickup/return
│   │   │   └── sidebar/    # Sidebar prenotazioni
│   │   ├── equipment/      # Gestione attrezzature
│   │   │   ├── detail/     # Dettagli attrezzatura
│   │   │   └── services/   # Logica business
│   │   ├── explore/        # Ricerca e filtri
│   │   ├── inspection/     # Ispezioni attrezzature
│   │   ├── layout/         # Layout (Header, Sidebar, Footer)
│   │   ├── messaging/      # Chat e messaggistica
│   │   ├── payment/        # Pagamenti e escrow
│   │   ├── reviews/        # Recensioni e valutazioni
│   │   ├── claims/         # Gestione danni e reclami
│   │   ├── rental/         # Gestione noleggi attivi
│   │   ├── renter/         # Componenti specifici noleggiatore
│   │   ├── verification/   # Verifica identità
│   │   └── ui/             # Componenti Shadcn UI base
│   ├── pages/              # Pagine route-level
│   │   ├── auth/           # Pagine autenticazione
│   │   ├── equipment/      # Dettaglio attrezzatura
│   │   ├── renter/         # Dashboard noleggiatore
│   │   ├── owner/          # Dashboard proprietario
│   │   ├── claims/         # Pagine reclami
│   │   ├── inspection/     # Pagine ispezioni
│   │   └── payment/        # Pagine pagamento
│   ├── hooks/              # Custom React hooks
│   │   ├── booking/        # Hooks prenotazioni
│   │   ├── useAuth.ts      # Hook autenticazione
│   │   ├── useMessaging.ts # Hook messaggistica
│   │   ├── usePayment.ts   # Hook pagamenti
│   │   └── ...
│   ├── lib/                # Utility e client API
│   │   ├── supabase.ts     # Client Supabase
│   │   ├── stripe.ts       # Client Stripe
│   │   ├── payment.ts      # Logica pagamenti
│   │   ├── database.types.ts  # Tipi TypeScript generati
│   │   └── utils.ts        # Utility generiche
│   ├── types/              # Definizioni TypeScript
│   │   ├── booking.ts      # Tipi prenotazioni
│   │   ├── rental.ts       # Tipi noleggi
│   │   ├── payment.ts      # Tipi pagamenti
│   │   ├── messaging.ts    # Tipi messaggistica
│   │   ├── claim.ts        # Tipi reclami
│   │   └── ...
│   ├── contexts/           # React Context providers
│   │   ├── AuthContext.tsx # Contesto autenticazione
│   │   ├── ThemeContext.tsx # Contesto tema
│   │   └── RoleModeContext.tsx # Contesto ruolo utente
│   ├── i18n/               # Internazionalizzazione
│   │   ├── config.ts       # Configurazione i18next
│   │   └── locales/        # File traduzioni (5 lingue)
│   │       ├── en/         # Inglese
│   │       ├── es/         # Spagnolo
│   │       ├── fr/         # Francese
│   │       ├── de/         # Tedesco
│   │       └── it/         # Italiano
│   ├── features/           # Feature modules
│   │   └── location/       # Servizi localizzazione
│   ├── config/             # Configurazioni
│   │   ├── breakpoints.ts  # Breakpoint responsive
│   │   └── pagination.ts   # Config paginazione
│   ├── App.tsx             # Root component con routing
│   └── main.tsx            # Entry point
├── supabase/
│   ├── migrations/         # Migrazioni database (37 file)
│   ├── functions/          # Edge Functions (Deno)
│   │   ├── create-payment-intent/  # Creazione payment intent
│   │   ├── stripe-webhook/        # Webhook Stripe
│   │   ├── process-refund/        # Gestione rimborsi
│   │   ├── release-deposit/       # Rilascio deposito
│   │   └── translate-content/     # Traduzione contenuti
│   └── guides/             # Documentazione Supabase
└── public/                 # Asset statici
```

### Pattern Architetturali

#### 1. **Component-Based Architecture**
- Componenti React modulari e riutilizzabili
- Separazione tra componenti UI e logica business
- Service layer per operazioni database complesse

#### 2. **State Management**
- **Server State**: React Query per cache e sincronizzazione dati server
- **Global State**: Context API per Auth, Theme, Role
- **Local State**: useState/useReducer per stato componente

#### 3. **Data Fetching**
- React Query per tutte le query database
- Prefetching e cache intelligente
- Ottimizzazione N+1 queries con batch loading

#### 4. **Form Management**
- React Hook Form per gestione form complessi
- Zod per validazione schema
- Validazione client-side e server-side

#### 5. **Routing**
- React Router per navigazione
- Route protette basate su autenticazione
- Query params per filtri ricerca (nuqs)

---

## Funzionalità Principali

### 1. Autenticazione e Registrazione

**File Chiave**: `src/components/auth/`, `src/contexts/AuthContext.tsx`

**Funzionalità**:
- Registrazione email/password
- Login con email/password
- OAuth (Google, GitHub, Facebook, Twitter)
- Doppio ruolo: Renter o Owner (selezionabile alla registrazione)
- Registrazione multi-step:
  - **Renter**: 3 step (Account Setup → Dettagli → Interessi)
  - **Owner**: 4 step (Account Setup → Dettagli → Business Info → Verifica)
- Verifica email
- Reset password
- Modal-based flows (LoginModal, SignupModal)

**Flusso**:
1. Utente sceglie ruolo (Renter/Owner)
2. Compila form multi-step
3. Verifica email
4. Accesso a dashboard specifica per ruolo

---

### 2. Gestione Attrezzature

**File Chiave**: `src/components/equipment/`, `src/pages/ExplorePage.tsx`

**Funzionalità**:
- **Creazione Listing**: Proprietari possono creare listing con:
  - Titolo, descrizione, categoria
  - Prezzo giornaliero
  - Condizione (new, excellent, good, fair)
  - Localizzazione (indirizzo + coordinate GPS)
  - Foto multiple (carousel)
  - Calendario disponibilità personalizzato
- **Ricerca e Filtri**:
  - Ricerca testuale
  - Filtro per categoria
  - Filtro per localizzazione
  - Filtro per range prezzo
  - Filtro per date disponibilità
  - Filtro per condizione
  - Ordinamento (raccomandato, prezzo, rating, data)
- **Visualizzazione**:
  - Grid virtuale per performance (virtual scrolling)
  - Card listing con foto, prezzo, rating
  - Dialog dettaglio con tab (Info, Disponibilità, Recensioni, Mappa)
  - Mappa Google Maps con marker posizione

**Service Layer**: `src/components/equipment/services/listings.ts`
- Batch queries per prevenire N+1
- Ottimizzazione performance

---

### 3. Sistema di Prenotazione

**File Chiave**: `src/components/booking/`, `src/types/booking.ts`

**Flusso Completo**:
1. **Richiesta Prenotazione**:
   - Noleggiatore seleziona date
   - Sistema verifica disponibilità (controllo `availability_calendar`)
   - Calcolo prezzo dinamico:
     - Prezzo base × giorni
     - Assicurazione opzionale (none, basic, premium)
     - Deposito danni
     - Fee servizio (5%)
     - Tasse (0% per MVP)
   - Creazione booking request (status: `pending`)

2. **Approvazione Proprietario**:
   - Proprietario riceve notifica
   - Può approvare o declinare
   - Se approvata: status → `approved`

3. **Pagamento**:
   - Creazione Payment Intent Stripe
   - Checkout Stripe Elements
   - Pagamento confermato → Webhook → Creazione booking

4. **Ispezione Pickup**:
   - Foto attrezzatura
   - Checklist condizioni
   - Firma digitale (owner + renter)
   - Timestamp e geolocalizzazione
   - Status → `active`

5. **Noleggio Attivo**:
   - Countdown giorni rimanenti
   - Tracking progress
   - Messaggistica integrata

6. **Ispezione Return**:
   - Foto attrezzatura restituita
   - Checklist condizioni
   - Confronto con pickup inspection
   - Firma digitale

7. **Completamento**:
   - Status → `completed`
   - Rilascio deposito (dopo buffer giorni)
   - Invito recensioni

**Stati Prenotazione**:
- `pending` - In attesa approvazione
- `approved` - Approvata, in attesa pagamento
- `active` - Noleggio in corso
- `completed` - Completata
- `cancelled` - Cancellata
- `declined` - Rifiutata

**Componenti Chiave**:
- `BookingSidebar.tsx` - Sidebar prenotazione con calendario
- `BookingRequestCard.tsx` - Card richiesta prenotazione
- `AvailabilityIndicatorCalendar.tsx` - Calendario disponibilità
- `FloatingBookingCTA.tsx` - CTA mobile per prenotazione

---

### 4. Sistema di Pagamenti

**File Chiave**: `src/lib/stripe.ts`, `src/lib/payment.ts`, `src/components/payment/`

**Architettura**:
- **Stripe Payment Intents** - Gestione pagamenti
- **Escrow System** - Fondi trattenuti fino completamento
- **Edge Functions**:
  - `create-payment-intent` - Crea payment intent con metadata booking
  - `stripe-webhook` - Gestisce conferme pagamento e crea booking
  - `process-refund` - Gestisce rimborsi
  - `release-deposit` - Rilascia deposito dopo completamento

**Flusso Pagamento**:
1. Booking approvata → Crea Payment Intent
2. Utente inserisce carta (Stripe Elements)
3. Conferma pagamento → Stripe processa
4. Webhook riceve conferma → Crea booking in DB
5. Fondi trattenuti in escrow
6. Dopo completamento noleggio → Rilascio fondi a proprietario

**Calcolo Prezzi**:
```typescript
subtotal = daily_rate × days
service_fee = subtotal × 5%
insurance = (opzionale, basato su tipo)
deposit = (configurabile per attrezzatura)
total = subtotal + service_fee + insurance + deposit
```

**Politica Cancellazione**:
- 7+ giorni prima: 100% rimborso
- 3-6 giorni prima: 50% rimborso
- 0-2 giorni prima: 0% rimborso

---

### 5. Messaggistica in Tempo Reale

**File Chiave**: `src/components/messaging/`, `src/types/messaging.ts`

**Funzionalità**:
- Chat 1-to-1 tra renter e owner
- Messaggistica in tempo reale (Supabase Realtime)
- Typing indicators
- Online status (presence tracking)
- Unread message count
- System messages per aggiornamenti booking
- Notifiche nuove conversazioni

**Architettura**:
- **Tabella `conversations`**: Thread conversazioni
- **Tabella `conversation_participants`**: Partecipanti con `last_read_at`
- **Tabella `messages`**: Messaggi con `message_type` (text, system, booking_update)
- **Realtime Subscriptions**: Aggiornamenti live su nuovi messaggi

**Componenti**:
- `MessagingPage.tsx` - Pagina principale messaggistica
- `ConversationList.tsx` - Lista conversazioni
- `MessageThread.tsx` - Thread messaggi
- `MessageInput.tsx` - Input invio messaggi

---

### 6. Sistema Recensioni

**File Chiave**: `src/components/reviews/`, `src/lib/reviews.ts`

**Funzionalità**:
- Valutazione 1-5 stelle
- Commento testuale
- Recensioni doppie:
  - Renter recensisce attrezzatura + proprietario
  - Proprietario recensisce noleggiatore
- Calcolo statistiche aggregate:
  - Rating medio
  - Distribuzione stelle
  - Numero totale recensioni
- Visualizzazione su card attrezzatura e profilo utente

**Tabella `reviews`**:
- `booking_id` - Riferimento prenotazione
- `reviewer_id` - Chi scrive
- `reviewee_id` - Chi viene recensito (utente o attrezzatura)
- `rating` - 1-5 stelle
- `comment` - Testo recensione

---

### 7. Sistema Ispezioni

**File Chiave**: `src/components/inspection/`, `src/pages/inspection/`

**Funzionalità**:
- **Ispezione Pickup**: Prima del noleggio
- **Ispezione Return**: Dopo il noleggio
- **Componenti**:
  - Foto multiple attrezzatura
  - Checklist condizioni (good, fair, damaged)
  - Note condizioni
  - Firma digitale (owner + renter)
  - Timestamp e geolocalizzazione
  - Verifica firme (verified_by_owner, verified_by_renter)

**Tabella `equipment_inspections`**:
- `booking_id` - Riferimento prenotazione
- `inspection_type` - 'pickup' o 'return'
- `photos` - Array URL foto
- `checklist_items` - JSONB con checklist
- `owner_signature` / `renter_signature` - Firma base64
- `location` - JSONB con lat/lng
- `timestamp` - Quando effettuata

**Flusso**:
1. Utente accede a `/inspection/:bookingId/:type`
2. Compila form ispezione
3. Scatta foto
4. Compila checklist
5. Firma digitale
6. Salvataggio in DB
7. Confronto pickup vs return per rilevare danni

---

### 8. Sistema Reclami Danni

**File Chiave**: `src/components/claims/`, `src/pages/claims/`, `src/types/claim.ts`

**Funzionalità**:
- Proprietario può aprire reclamo dopo return inspection
- Upload foto evidenze danni
- Descrizione danno
- Stima costo riparazione
- Upload preventivi riparazione
- Risposta noleggiatore:
  - Accetta
  - Contesta
  - Negozia (counter-offer)
- Risoluzione:
  - Pagamento da deposito
  - Pagamento da assicurazione
  - Carica aggiuntiva

**Stati Reclamo**:
- `pending` - In attesa risposta
- `accepted` - Accettato
- `disputed` - Contestato
- `resolved` - Risolto
- `escalated` - Escalato a supporto

**Tabella `damage_claims`**:
- `booking_id` - Riferimento prenotazione
- `filed_by` - Chi apre reclamo
- `damage_description` - Descrizione
- `evidence_photos` - Array URL foto
- `estimated_cost` - Costo stimato
- `repair_quotes` - Array URL preventivi
- `status` - Stato reclamo
- `renter_response` - JSONB risposta noleggiatore
- `resolution` - JSONB risoluzione finale

---

### 9. Verifica Identità

**File Chiave**: `src/components/verification/`, `src/pages/verification/`

**Funzionalità**:
- Upload documento identità (Supabase Storage)
- Verifica telefono
- Verifica email (automatica)
- Verifica indirizzo
- Badge verifica su profilo
- Trust score calcolato

**Campi `profiles`**:
- `identity_verified` - Boolean
- `phone_verified` - Boolean
- `email_verified` - Boolean
- `address_verified` - Boolean

**Storage Bucket**: `verification-documents` (private)

---

### 10. Dashboard Utente

**Dashboard Renter** (`/renter/dashboard`):
- Prenotazioni attive
- Storico prenotazioni
- Attrezzature salvate (favorites)
- Pagamenti e transazioni
- Recensioni da lasciare

**Dashboard Owner** (`/owner/dashboard`):
- Attrezzature pubblicate
- Richieste prenotazione in attesa
- Prenotazioni attive
- Storico prenotazioni
- Entrate totali
- Recensioni ricevute

---

## Database e Backend

### Schema Database

**37 Migrazioni** organizzate cronologicamente

#### Tabelle Principali

| Tabella | Scopo | Campi Chiave |
|---------|-------|--------------|
| `profiles` | Info base utente | email, role, verification flags, timestamps |
| `renter_profiles` | Dati noleggiatore | profile_id, preferences (JSONB), experience_level |
| `owner_profiles` | Dati proprietario | profile_id, business_info (JSONB), earnings_total |
| `categories` | Categorie attrezzature | name, parent_id, sport_type, attributes (JSONB) |
| `equipment` | Listing attrezzature | owner_id, category_id, title, daily_rate, condition, location, lat/lng |
| `equipment_photos` | Foto attrezzature | equipment_id, photo_url, is_primary, order_index |
| `availability_calendar` | Disponibilità date | equipment_id, date, is_available, custom_rate |
| `booking_requests` | Richieste prenotazione | equipment_id, renter_id, dates, total_amount, status |
| `bookings` | Prenotazioni confermate | booking_request_id (1:1), payment_status, pickup_method |
| `equipment_inspections` | Ispezioni | booking_id, inspection_type, photos, checklist_items, signatures |
| `damage_claims` | Reclami danni | booking_id, filed_by, damage_description, evidence_photos, status |
| `payments` | Transazioni pagamento | booking_request_id, stripe_payment_intent_id, amounts, escrow_status |
| `reviews` | Recensioni | booking_id, reviewer_id, reviewee_id, rating, comment |
| `conversations` | Thread conversazioni | booking_request_id, participants (UUID[]) |
| `conversation_participants` | Partecipanti chat | conversation_id, profile_id, last_read_at |
| `messages` | Messaggi chat | conversation_id, sender_id, content, message_type |
| `booking_history` | Audit trail prenotazioni | booking_request_id, status changes, changed_by, metadata |
| `user_favorites` | Attrezzature salvate | user_id, equipment_id |

#### Enums Personalizzati

```sql
user_role: 'renter' | 'owner'
equipment_condition: 'new' | 'excellent' | 'good' | 'fair'
booking_status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed' | 'active'
inspection_type: 'pickup' | 'return'
claim_status: 'pending' | 'accepted' | 'disputed' | 'resolved' | 'escalated'
deposit_status: 'held' | 'released' | 'claimed' | 'refunded' | 'releasing'
```

#### Relazioni Chiave

1. `auth.users` → `profiles` → `renter_profiles` OR `owner_profiles`
2. `profiles` (owner) → `equipment` → `equipment_photos` + `availability_calendar`
3. `booking_requests` → `bookings` (1:1) → `reviews`
4. `booking_requests` → `equipment_inspections` (pickup + return)
5. `booking_requests` → `damage_claims`
6. `conversations` ↔ `conversation_participants` (M:N) → `messages`
7. `booking_requests` → `payments` (Stripe escrow)

### Row Level Security (RLS)

**58 Policy RLS** su 13 tabelle principali

**Principi**:
- Utenti autenticati vedono solo i propri dati
- Proprietari vedono solo le proprie attrezzature e prenotazioni
- Noleggiatori vedono solo le proprie prenotazioni
- Messaggi visibili solo ai partecipanti conversazione
- Pagamenti visibili solo a renter e owner coinvolti

**Esempi Policy**:
- `profiles`: Auth users vedono tutti, aggiornano solo il proprio
- `equipment`: Anonymous vedono disponibili, owners CRUD solo proprie
- `booking_requests`: Users vedono proprie richieste O richieste per loro attrezzature
- `messages`: Users vedono/inviano solo nelle proprie conversazioni

### Funzioni Database

**RPC Functions**:
- `get_unread_messages_count(user_uuid)` - Conta messaggi non letti

**Triggers**:
- Creazione profilo automatica su signup
- Automazione approvazione booking
- Gestione cancellazione booking (rilascio disponibilità)
- Sync stato pagamento
- Aggiornamento `last_seen` per presence tracking

### Storage Buckets

- `equipment-photos` (public) - Foto listing attrezzature
- `verification-documents` (private) - Documenti verifica identità

### Edge Functions (Deno)

**5 Edge Functions**:

1. **`create-payment-intent`**
   - Crea Stripe Payment Intent
   - Salva metadata booking in Stripe
   - Restituisce client_secret

2. **`stripe-webhook`**
   - Riceve webhook Stripe
   - Crea booking in DB dopo pagamento confermato
   - Aggiorna stato pagamento

3. **`process-refund`**
   - Processa rimborsi
   - Aggiorna stato booking
   - Rilascia disponibilità

4. **`release-deposit`**
   - Rilascia deposito dopo completamento noleggio
   - Gestisce claim window

5. **`translate-content`**
   - Traduce contenuti dinamici
   - Integrazione servizi traduzione

---

## Integrazioni Esterne

### 1. Supabase

**Servizi Utilizzati**:
- **PostgreSQL Database** - Database relazionale
- **Authentication** - Email/password + OAuth
- **Realtime** - Subscriptions per messaggistica live
- **Storage** - Upload immagini e documenti
- **Edge Functions** - Serverless functions (Deno)

**Configurazione**:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Stripe

**Servizi Utilizzati**:
- **Payment Intents API** - Gestione pagamenti
- **Stripe Elements** - Input carte sicuro
- **Webhooks** - Notifiche eventi pagamento
- **Escrow** - Trattenimento fondi

**Configurazione**:
```env
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

**Flusso**:
1. Frontend → Edge Function → Crea Payment Intent
2. Utente inserisce carta → Stripe Elements
3. Conferma pagamento → Stripe processa
4. Webhook → Edge Function → Crea booking in DB

### 3. Google Maps

**Servizi Utilizzati**:
- **Maps JavaScript API** - Visualizzazione mappe
- **Geocoding API** - Conversione indirizzo ↔ coordinate
- **Places API** - Autocomplete indirizzi

**Implementazione**: `src/lib/googleMapsLoader.ts`

### 4. Vercel Analytics

**Servizio**: Analytics utenti e performance
**Integrazione**: `@vercel/analytics/react`

---

## UI/UX e Design System

### Design System

**Shadcn UI Components** (variante New York):
- 40+ componenti UI base
- Accessibilità integrata (ARIA)
- Dark mode support
- Responsive design

**Componenti Principali**:
- Button, Input, Select, Dialog, Sheet, Card
- Calendar, DatePicker, Slider, Tabs
- Toast, Alert, Badge, Avatar
- Dropdown Menu, Popover, Tooltip
- Scroll Area, Separator, Progress

### Styling

**Tailwind CSS 4.1.16**:
- Utility-first CSS
- Design tokens configurabili
- Responsive breakpoints
- Dark mode con `dark:` prefix

**Sistema Colori**:
- OKLCH color space
- Tema chiaro/scuro
- Palette consistente

### Responsive Design

**Breakpoints** (`src/config/breakpoints.ts`):
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile-First Approach**:
- Design ottimizzato per mobile
- Progressive enhancement per desktop
- Componenti adattivi (es. MobileSidebarDrawer)

### Internazionalizzazione

**5 Lingue Supportate**:
- Inglese (en) - Default
- Spagnolo (es)
- Francese (fr)
- Tedesco (de)
- Italiano (it)

**Namespace**:
- `common` - Testi comuni
- `auth` - Autenticazione
- `navigation` - Navigazione
- `equipment` - Attrezzature
- `booking` - Prenotazioni
- `messaging` - Messaggistica
- `payment` - Pagamenti
- `reviews` - Recensioni
- `verification` - Verifica
- `marketing` - Marketing
- `dashboard` - Dashboard

**Rilevamento Lingua**:
1. Preferenza utente salvata (localStorage)
2. Metadata utente Supabase
3. Browser language
4. Fallback: Inglese

---

## Considerazioni per App Mobile

### Architettura Attuale (Web)

**Punti di Forza**:
- ✅ React già utilizzato (condivisibile con React Native)
- ✅ TypeScript per type safety
- ✅ Separazione logica business da UI
- ✅ Service layer ben strutturato
- ✅ API Supabase già mobile-ready
- ✅ Autenticazione Supabase funziona su mobile

**Sfide per Mobile**:
- ⚠️ Componenti UI specifici web (Shadcn/Radix)
- ⚠️ Routing web-based (React Router)
- ⚠️ Alcune funzionalità web-specific (file upload, geolocation)

### Opzioni per App Mobile

#### Opzione 1: React Native (Consigliata)

**Vantaggi**:
- ✅ Condivisione logica business (hooks, services, types)
- ✅ Stesso team React
- ✅ Supabase SDK disponibile per React Native
- ✅ Stripe SDK disponibile per React Native
- ✅ Code sharing ~60-70%

**Stack Consigliato**:
- **React Native** (Expo consigliato per sviluppo più veloce)
- **React Navigation** - Routing mobile
- **React Native Paper** o **NativeBase** - UI components
- **React Query** - Stesso per data fetching
- **React Hook Form** - Stesso per forms
- **Supabase JS** - Stesso SDK
- **Stripe React Native** - SDK mobile

**Componenti da Riscrivere**:
- UI Components (Shadcn → React Native components)
- Routing (React Router → React Navigation)
- File Upload (web API → React Native file picker)
- Geolocation (web API → React Native geolocation)
- Maps (Google Maps Web → React Native Maps)

**Componenti Condivisibili**:
- Hooks (`useAuth`, `useMessaging`, `usePayment`, etc.)
- Services (`lib/supabase.ts`, `lib/stripe.ts`, `lib/payment.ts`)
- Types (`types/*.ts`)
- Utils (`lib/utils.ts`)
- i18n config (con adattamenti)

#### Opzione 2: Flutter

**Vantaggi**:
- ✅ Performance native
- ✅ UI consistente cross-platform
- ✅ Hot reload veloce

**Svantaggi**:
- ❌ Riscrittura completa codice
- ❌ Team deve imparare Dart/Flutter
- ❌ Nessuna condivisione codice con web

#### Opzione 3: PWA (Progressive Web App)

**Vantaggi**:
- ✅ Nessuna riscrittura necessaria
- ✅ Installabile su mobile
- ✅ Offline support possibile

**Svantaggi**:
- ❌ Performance limitate rispetto a native
- ❌ Accesso limitato a funzionalità native
- ❌ Non disponibile su App Store/Play Store

### Funzionalità Mobile-Specifiche da Implementare

1. **Push Notifications**
   - Notifiche prenotazioni
   - Notifiche messaggi
   - Notifiche pagamenti
   - **Soluzione**: Firebase Cloud Messaging o OneSignal

2. **Camera Integration**
   - Foto ispezioni
   - Foto evidenze danni
   - **Soluzione**: React Native Camera o Expo Camera

3. **Geolocation**
   - Posizione pickup/return
   - Navigazione verso attrezzatura
   - **Soluzione**: React Native Geolocation

4. **Maps Native**
   - Visualizzazione mappe native
   - Marker attrezzature
   - **Soluzione**: React Native Maps

5. **Biometric Auth**
   - Login con Face ID / Touch ID
   - **Soluzione**: React Native Biometrics

6. **Deep Linking**
   - Link a prenotazioni specifiche
   - Link a conversazioni
   - **Soluzione**: React Navigation deep linking

### Architettura Consigliata per Mobile

```
rentaloo-mobile/
├── src/
│   ├── components/        # Componenti React Native
│   ├── screens/          # Screen (equivalente pages/)
│   ├── navigation/       # React Navigation config
│   ├── hooks/            # Condivisi con web (se possibile)
│   ├── services/         # Condivisi con web
│   ├── types/            # Condivisi con web
│   ├── lib/              # Condivisi con web
│   └── i18n/             # Condivisi con web
├── shared/               # Codice condiviso con web
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── lib/
└── app.json              # Expo config
```

### Migrazione Graduale

**Fase 1: Setup Base**
- Setup React Native (Expo)
- Configurazione Supabase SDK
- Setup routing base
- Autenticazione funzionante

**Fase 2: Core Features**
- Dashboard utente
- Lista attrezzature
- Dettaglio attrezzatura
- Ricerca e filtri

**Fase 3: Booking Flow**
- Creazione prenotazione
- Gestione prenotazioni
- Calendario disponibilità

**Fase 4: Advanced Features**
- Messaggistica
- Pagamenti
- Ispezioni (con camera)
- Reclami

**Fase 5: Polish**
- Push notifications
- Ottimizzazioni performance
- Testing completo

### Metriche di Successo

- **Code Sharing**: Target 60-70% codice condiviso
- **Performance**: App launch < 2s
- **Bundle Size**: < 50MB (Android), < 30MB (iOS)
- **Crash Rate**: < 0.1%

---

## Conclusioni

RentAloo è una web app moderna e ben strutturata con:

✅ **Architettura Solida**: Separazione concerns, service layer, type safety
✅ **Stack Moderno**: React 19, TypeScript, Supabase, Stripe
✅ **Funzionalità Complete**: Booking, pagamenti, messaggistica, recensioni, ispezioni
✅ **Scalabilità**: Database ottimizzato, RLS, Edge Functions
✅ **Mobile-Ready Backend**: Supabase e Stripe già compatibili mobile

**Prossimi Passi per App Mobile**:
1. Valutare React Native vs Flutter
2. Setup monorepo o repository separato
3. Identificare codice condivisibile
4. Pianificare migrazione graduale
5. Setup CI/CD per mobile

---

*Documento generato il: $(date)*
*Versione App: 0.0.0*

