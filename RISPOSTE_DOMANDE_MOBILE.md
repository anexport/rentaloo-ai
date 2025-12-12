# Risposte Domande Mobile App - RentAloo

Documento completo con risposte tecniche alle domande per lo sviluppo dell'app mobile.

---

## 1) Domande "core" sul nuovo concept MAPPA (home principale)

### Entità mappa

**Risposta**: **Singole attrezzature** hanno coordinate (lat/lng) nello schema DB.

**Dettagli Schema**:
- **Tabella `equipment`** contiene:
  - `latitude` (DECIMAL(10, 8)) - nullable
  - `longitude` (DECIMAL(11, 8)) - nullable
  - `location` (TEXT) - indirizzo testuale (es. "Boulder, CO")
  - `id` (UUID) - Primary Key
  - `owner_id` (UUID) - Foreign Key → `profiles.id`
  - `category_id` (UUID) - Foreign Key → `categories.id`

**Non esistono**:
- ❌ Tabelle separate per "location/attività" con più attrezzature
- ❌ Entità aggregate "noleggio/spot"

**Raccomandazione**: Mostrare **singole attrezzature** sulla mappa. Se serve aggregazione per sport/location, va implementata lato client o con una view SQL.

---

### Sport vs attrezzature

**Risposta**: Il pallino rappresenta un **item specifico** (singola attrezzatura).

**Schema DB**:
- `equipment.category_id` → `categories.id`
- `categories.sport_type` (TEXT) - es. "cycling", "skiing", "photography"
- `categories.name` (TEXT) - es. "Road Bike", "Mountain Bike"

**Per aggregazione** (se necessaria):
- Calcolare disponibilità: controllare `availability_calendar` per tutte le attrezzature dello stesso `sport_type` nella zona
- Calcolare prezzo: mostrare range (min-max `daily_rate`) o media
- **Nota**: Non esiste aggregazione pre-calcolata nel DB, va implementata lato query

**Raccomandazione**: Inizialmente mostrare **singole attrezzature**. Se serve aggregazione, creare una Edge Function o RPC che aggrega per `sport_type` + bounding box.

---

### Disponibilità "in X minuti"

**Risposta**: **NON implementato** nel codice esistente. Va definito.

**Opzioni possibili**:

**(a) start_time libero più vicino**
- Query `availability_calendar` per trovare prima data disponibile
- Calcolare differenza con ora corrente
- **Pro**: Preciso
- **Contro**: Non considera preparazione owner

**(b) buffer + orari apertura**
- **NON esiste** campo `opening_hours` o `preparation_time` nel DB
- Va aggiunto se necessario

**(c) tempo di preparazione del owner**
- **NON esiste** campo nel DB
- Va aggiunto in `owner_profiles` o `equipment` se necessario

**(d) tempo stimato di cammino/guida**
- Calcolare distanza tra utente e attrezzatura (lat/lng)
- Stimare tempo con Google Maps Directions API
- **Pro**: Realistico
- **Contro**: Richiede API esterna

**Raccomandazione**: Implementare **(a) + (d)**:
1. Trovare prima data disponibile in `availability_calendar`
2. Se disponibile oggi: calcolare distanza e stimare tempo viaggio
3. Mostrare: "Disponibile tra X minuti" (se oggi) o "Disponibile dal [data]" (se futuro)

---

### Filtro distanza

**Risposta**: **NON implementato** query geospaziali nel codice esistente.

**Schema Geospaziale**:
- ✅ PostGIS **abilitato** (`CREATE EXTENSION IF NOT EXISTS "postgis"`)
- ✅ Indice GIST esistente: `idx_equipment_location ON equipment USING GIST(ST_Point(longitude, latitude))`
- ⚠️ **NON esistono** RPC functions per query "nearby"

**Raccomandazione Implementazione**:

**Opzione 1: Raggio fisso** (più semplice)
```sql
CREATE OR REPLACE FUNCTION get_nearby_equipment(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.latitude,
    e.longitude,
    ST_Distance(
      ST_Point(p_lng, p_lat)::geography,
      ST_Point(e.longitude, e.latitude)::geography
    ) / 1000 AS distance_km
  FROM equipment e
  WHERE e.is_available = true
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND ST_DWithin(
      ST_Point(p_lng, p_lat)::geography,
      ST_Point(e.longitude, e.latitude)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$;
```

**Opzione 2: Bounding box** (più performante per mappa)
- Calcolare bounding box dal viewport mappa
- Query con `ST_Within` o `ST_Intersects`
- **Pro**: Più veloce, carica solo quello visibile
- **Contro**: Richiede ricalcolo su zoom/pan

**Clustering**: **NON implementato**. Raccomandazione:
- Usare libreria client-side (es. `@googlemaps/markerclusterer` per web, `react-native-map-clustering` per mobile)
- Clusterizzare marker quando zoom < livello soglia (es. zoom < 12)

**Comportamento zoom/sposta**:
- **Debounce** query (300-500ms) per evitare troppe chiamate
- Cache risultati per viewport corrente
- Aggiornare solo marker nuovi/rimossi

---

### Search bar

**Risposta**: La search bar attuale cerca **titolo e descrizione attrezzatura**.

**Implementazione Attuale** (`src/components/equipment/services/listings.ts`):
```typescript
if (filters.search && filters.search.trim().length > 0) {
  query = query.or(
    `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
  );
}
```

**Cosa NON cerca**:
- ❌ Sport/categoria (solo filtro separato)
- ❌ Città/indirizzo (solo filtro `location` separato)
- ❌ "Cosa vuoi fare" (non implementato)

**Filtri Esistenti**:
- ✅ Date (`dateFrom`, `dateTo`) - controlla `availability_calendar`
- ✅ Prezzo (`priceMin`, `priceMax`)
- ✅ Categoria (`categoryId`)
- ✅ Condizione (`condition`)
- ✅ Localizzazione (`location`) - match testuale su campo `location`

**Filtri NON Esistenti**:
- ❌ Fascia oraria (non c'è campo `time` nel DB)
- ❌ Distanza (non implementato)

**Raccomandazione Mobile**:
1. **Search bar**: Cerca titolo, descrizione, categoria, sport_type
2. **Filtri 1-tap**:
   - Date (date picker)
   - Prezzo (slider)
   - Distanza (raggio: 1km, 5km, 10km, 25km)
   - Sport (chips: Bici, SUP, Sci, etc.)
3. **Filtri avanzati** (bottom sheet):
   - Condizione
   - Verificati solo
   - Disponibilità immediata

---

### Icone per sport

**Risposta**: L'icona dipende da `categories.sport_type`.

**Schema DB**:
- `equipment.category_id` → `categories.id`
- `categories.sport_type` (TEXT) - **fonte di verità**
- `categories.name` (TEXT) - nome categoria

**Valori `sport_type` esistenti** (da seed):
- "cycling", "skiing", "photography", "camping", "construction", etc.

**Implementazione Attuale**:
- `src/lib/categoryIcons.ts` - mappa `sport_type` → icona Lucide React
- Esempio: `cycling` → `Bike`, `skiing` → `Ski`, etc.

**Raccomandazione Mobile**:
- Usare stessa mappa `sport_type` → icona
- Marker colorati per sport (es. bici = blu, sci = rosso)
- Icone custom SVG per marker più riconoscibili

---

## 2) Domande DB / Supabase indispensabili

### Schema map-related

**Tabelle e Colonne Coinvolte**:

#### `equipment` (PK: `id`)
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `owner_id` | UUID | FK → `profiles.id` |
| `category_id` | UUID | FK → `categories.id` |
| `title` | TEXT | Nome attrezzatura |
| `description` | TEXT | Descrizione |
| `daily_rate` | DECIMAL(8,2) | Prezzo giornaliero |
| `condition` | ENUM | new/excellent/good/fair |
| `location` | TEXT | Indirizzo testuale |
| `latitude` | DECIMAL(10,8) | **Latitudine** (nullable) |
| `longitude` | DECIMAL(11,8) | **Longitudine** (nullable) |
| `is_available` | BOOLEAN | Disponibilità generale |
| `created_at` | TIMESTAMPTZ | Data creazione |
| `updated_at` | TIMESTAMPTZ | Ultimo aggiornamento |

#### `categories` (PK: `id`)
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `name` | TEXT | Nome categoria |
| `sport_type` | TEXT | **Tipo sport** (fonte verità) |
| `parent_id` | UUID | FK → `categories.id` (gerarchia) |
| `attributes` | JSONB | Attributi aggiuntivi |

#### `availability_calendar` (PK: `id`, Unique: `equipment_id, date`)
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `equipment_id` | UUID | FK → `equipment.id` |
| `date` | DATE | Data disponibilità |
| `is_available` | BOOLEAN | Disponibile questa data |
| `custom_rate` | DECIMAL(8,2) | Prezzo personalizzato per data |

#### `booking_requests` (PK: `id`)
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `equipment_id` | UUID | FK → `equipment.id` |
| `renter_id` | UUID | FK → `profiles.id` |
| `start_date` | DATE | Data inizio |
| `end_date` | DATE | Data fine |
| `status` | ENUM | pending/approved/declined/cancelled/active/completed |
| `total_amount` | DECIMAL(10,2) | Importo totale |

**Campi Mancanti**:
- ❌ `timezone` - NON esiste nel DB
- ❌ `city` separato - solo campo `location` testuale
- ❌ `address` separato - solo campo `location` testuale

**Raccomandazione**: Se serve parsing indirizzo:
- Usare Google Geocoding API per convertire `location` → lat/lng + componenti (city, address)
- Salvare componenti in campi separati o JSONB per performance

---

### Geospatial

**Risposta**: ✅ **PostGIS abilitato** su Supabase.

**Dettagli**:
- Extension: `CREATE EXTENSION IF NOT EXISTS "postgis"`
- Indice esistente: `idx_equipment_location ON equipment USING GIST(ST_Point(longitude, latitude))`
- Tipo: Usa `ST_Point` (geometry), non `geography`

**Query Esistenti**: ❌ **NON esistono** RPC functions per "nearby"

**Indici Geospaziali**:
- ✅ GIST index su `equipment` per lat/lng
- ⚠️ **NON esistono** indici aggiuntivi per performance query complesse

---

### Query 'nearby' migliore

**Risposta**: ❌ **NON esiste** query/RPC per nearby.

**Proposta Edge Function o RPC**:

#### Opzione 1: RPC Function (Consigliata)
```sql
CREATE OR REPLACE FUNCTION get_nearby_equipment(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km DECIMAL DEFAULT 10,
  p_sport_type TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_price_min DECIMAL DEFAULT NULL,
  p_price_max DECIMAL DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  daily_rate DECIMAL,
  latitude DECIMAL,
  longitude DECIMAL,
  location TEXT,
  distance_km DECIMAL,
  category_name TEXT,
  sport_type TEXT,
  is_available_now BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.daily_rate,
    e.latitude,
    e.longitude,
    e.location,
    ST_Distance(
      ST_Point(p_lng, p_lat)::geography,
      ST_Point(e.longitude, e.latitude)::geography
    ) / 1000 AS distance_km,
    c.name AS category_name,
    c.sport_type,
    CASE 
      WHEN p_date_from IS NOT NULL THEN
        NOT EXISTS (
          SELECT 1 FROM availability_calendar ac
          WHERE ac.equipment_id = e.id
            AND ac.date BETWEEN p_date_from AND COALESCE(p_date_to, p_date_from)
            AND ac.is_available = false
        )
      ELSE true
    END AS is_available_now
  FROM equipment e
  JOIN categories c ON c.id = e.category_id
  WHERE e.is_available = true
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND ST_DWithin(
      ST_Point(p_lng, p_lat)::geography,
      ST_Point(e.longitude, e.latitude)::geography,
      p_radius_km * 1000
    )
    AND (p_sport_type IS NULL OR c.sport_type = p_sport_type)
    AND (p_price_min IS NULL OR e.daily_rate >= p_price_min)
    AND (p_price_max IS NULL OR e.daily_rate <= p_price_max)
  ORDER BY distance_km
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nearby_equipment TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_equipment TO anon;
```

#### Opzione 2: Edge Function (se serve logica complessa)
- Vantaggio: Può chiamare API esterne (es. Google Maps per routing)
- Svantaggio: Più lento, richiede chiamata HTTP

**Raccomandazione**: Implementare **RPC Function** per performance migliori.

---

### RLS

**Risposta**: ✅ **RLS abilitato** su tutte le tabelle principali.

#### Policies `equipment`:
```sql
-- Chiunque può vedere attrezzature disponibili
CREATE POLICY "Anyone can view available equipment" 
ON equipment FOR SELECT 
USING (is_available = true);

-- Owners vedono anche le proprie (anche se non disponibili)
CREATE POLICY "Owners can view their own equipment" 
ON equipment FOR SELECT 
USING (auth.uid() = owner_id);
```

**Implicazioni Mappa**:
- ✅ **Guest mode funziona**: `anon` può vedere `is_available = true`
- ✅ **Nessun blocco**: Le policy permettono SELECT pubblica per disponibili
- ⚠️ **Attenzione**: Se `is_available = false`, solo owner vede (OK per mappa)

#### Policies `booking_requests`:
```sql
-- Users vedono solo proprie richieste O richieste per loro attrezzature
CREATE POLICY "Users can view their own booking requests" 
ON booking_requests FOR SELECT 
USING (auth.uid() = renter_id);

CREATE POLICY "Equipment owners can view requests for their equipment" 
ON booking_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM equipment 
    WHERE equipment.id = booking_requests.equipment_id 
    AND equipment.owner_id = auth.uid()
  )
);
```

**Implicazioni**: ✅ OK, non blocca mappa (mappa non mostra booking requests)

#### Policies `messages`:
```sql
-- Users vedono solo messaggi nelle proprie conversazioni
CREATE POLICY "Users can view messages in their conversations" 
ON messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = messages.conversation_id 
    AND conversation_participants.profile_id = auth.uid()
  )
);
```

**Implicazioni**: ✅ OK, non blocca mappa

**Raccomandazione**: 
- Mappa mostra solo `is_available = true` (pubblico)
- Dettaglio attrezzatura: guest può vedere, ma booking richiede login
- ✅ **Nessun problema RLS per mappa**

---

### Storage

**Risposta**: ✅ **Supabase Storage** utilizzato per immagini.

**Buckets Esistenti** (da documentazione):
- `equipment-photos` (public) - Foto listing attrezzature
- `verification-documents` (private) - Documenti verifica identità

**Policy Storage**:
- ⚠️ **NON trovate** policy esplicite nel codice
- Assumere: `equipment-photos` pubblico (URL diretti), `verification-documents` privato (signed URLs)

**URL Formato**:
- Public: `https://[project].supabase.co/storage/v1/object/public/equipment-photos/[path]`
- Private: Richiede signed URL con `supabase.storage.from('bucket').createSignedUrl(path, expiresIn)`

**Thumbnail Ottimizzate**:
- ❌ **NON esiste** sistema di resize automatico
- ❌ **NON esistono** varianti (thumbnail, medium, large)

**Raccomandazione Mobile**:
1. **Implementare resize lato upload**:
   - Usare libreria mobile (es. `react-native-image-resizer`)
   - Creare thumbnail 200x200px + full size
   - Upload entrambi su Storage

2. **Usare CDN con trasformazioni**:
   - Supabase Storage supporta query params per resize: `?width=200&height=200&resize=cover`
   - Esempio: `https://[project].supabase.co/storage/v1/object/public/equipment-photos/image.jpg?width=200`

3. **Cache lato mobile**:
   - Cache thumbnail in memoria/disco
   - Usare libreria caching (es. `react-native-fast-image`)

---

## 3) Domande Booking/Pagamenti

### Flusso booking

**Risposta**: Flusso completo documentato.

#### Stati Booking (Enum `booking_status`):
1. `pending` - Richiesta creata, in attesa approvazione
2. `approved` - Approvata dal proprietario
3. `declined` - Rifiutata dal proprietario
4. `cancelled` - Cancellata (da renter o owner)
5. `active` - Noleggio attivo (dopo pickup inspection)
6. `completed` - Completata (dopo return inspection)

**Definizione**: `supabase/migrations/001_initial_schema.sql` + `034_add_active_booking_status.sql`

#### Flusso Completo:

```
1. Renter crea booking request
   └─> Status: pending
   └─> Tabella: booking_requests

2. Owner approva/declina
   └─> Se approvata: Status → approved
   └─> Trigger: handle_booking_approval() (migration 013)

3. Pagamento (se approved)
   └─> Edge Function: create-payment-intent
   └─> Stripe Payment Intent creato
   └─> Utente paga con Stripe Elements

4. Webhook Stripe (payment_intent.succeeded)
   └─> Edge Function: stripe-webhook
   └─> Crea record in `bookings` (1:1 con booking_request)
   └─> Crea record in `payments`
   └─> Status rimane: approved

5. Pickup Inspection
   └─> Tabella: equipment_inspections (type: 'pickup')
   └─> RPC: activate_rental(booking_id)
   └─> Status → active
   └─> Campo: activated_at settato

6. Noleggio Attivo
   └─> Countdown giorni rimanenti
   └─> Messaggistica disponibile

7. Return Inspection
   └─> Tabella: equipment_inspections (type: 'return')
   └─> RPC: complete_rental(booking_id)
   └─> Status → completed
   └─> Campo: completed_at settato

8. Recensioni
   └─> Invito a lasciare recensione
   └─> Tabella: reviews

9. Rilascio Deposito
   └─> Edge Function: release-deposit
   └─> Dopo buffer giorni (default 1)
```

**File Chiave**:
- `supabase/migrations/034_add_active_booking_status.sql` - Funzioni activate_rental, complete_rental
- `supabase/functions/stripe-webhook/index.ts` - Webhook pagamento
- `src/components/booking/inspection-flow/BookingLifecycleStepper.tsx` - UI flusso

---

### Escrow

**Risposta**: ✅ **Sistema escrow implementato** con Stripe.

#### Architettura:
- **Stripe Payment Intents** - Gestione pagamenti
- **Tabella `payments`** - Traccia transazioni e escrow
- **Edge Functions**:
  - `create-payment-intent` - Crea payment intent
  - `stripe-webhook` - Gestisce conferme pagamento
  - `release-deposit` - Rilascia deposito
  - `process-refund` - Gestisce rimborsi

#### Eventi Escrow:

**1. Capture (Pagamento Confermato)**:
- Trigger: Webhook `payment_intent.succeeded`
- Edge Function: `stripe-webhook`
- Azione: Crea record `payments` con `escrow_status = 'held'`
- Codice: `supabase/functions/stripe-webhook/index.ts`

**2. Release (Rilascio a Owner)**:
- Trigger: Edge Function `release-deposit` (chiamata manuale o cron)
- Condizione: `completed_at` + buffer giorni (default 1)
- Azione: Aggiorna `payments.escrow_status = 'released'`
- Stripe: Trasferisce fondi a owner (se Stripe Connect) o marca come disponibile per payout

**3. Refund (Rimborso)**:
- Trigger: Edge Function `process-refund`
- Azione: Aggiorna `payments.escrow_status = 'refunded'`
- Stripe: Rimborsa a renter

**Stripe Connect**:
- ⚠️ **NON implementato** Stripe Connect nel codice esistente
- Attualmente: Fondi vanno a account platform, poi payout manuale a owner
- **Raccomandazione**: Implementare Stripe Connect per payout automatici

#### Edge Functions Input/Output:

**`create-payment-intent`**:
```typescript
Input: {
  equipment_id: string
  start_date: string
  end_date: string
  total_amount: number
  insurance_type: 'none' | 'basic' | 'premium'
  insurance_cost: number
  damage_deposit_amount: number
}
Output: {
  clientSecret: string
  paymentIntentId: string
}
```

**`stripe-webhook`**:
- Input: Stripe webhook event
- Output: Crea `bookings` + `payments` records

**`release-deposit`**:
```typescript
Input: {
  booking_id: string
}
Output: {
  success: boolean
  escrow_status: 'released' | 'claimed' | 'refunded'
}
```

**Per Mobile**: ✅ Tutte le Edge Functions sono HTTP, compatibili con mobile SDK.

---

### Deposito/danni

**Risposta**: ✅ **Sistema deposito e danni implementato**.

#### Deposito Cauzionale:

**Campi `equipment`**:
- `damage_deposit_amount` (DECIMAL) - Importo fisso
- `damage_deposit_percentage` (DECIMAL) - Percentuale su totale
- **Calcolo**: Usa `amount` se presente, altrimenti `percentage * total_amount`

**Tabella `payments`**:
- `damage_deposit_amount` - Importo deposito trattenuto
- `escrow_status` - Stato escrow (held/released/claimed/refunded)

**Rilascio Deposito**:
- Dopo completamento noleggio + buffer giorni
- Edge Function: `release-deposit`
- Se nessun claim: `escrow_status → 'released'`

#### Claim Danni:

**Tabella `damage_claims`**:
- `booking_id` - FK → `booking_requests.id`
- `filed_by` - Chi apre claim (owner)
- `damage_description` - Descrizione danno
- `evidence_photos` - Array URL foto
- `estimated_cost` - Costo stimato
- `status` - pending/accepted/disputed/resolved/escalated

**Flusso Claim**:
1. Owner apre claim dopo return inspection
2. Renter risponde: accept/dispute/negotiate
3. Se accepted: `escrow_status → 'claimed'`, deposito usato per pagare
4. Se disputed: `status → 'disputed'`, escalation manuale
5. Risoluzione finale: `resolution` JSONB con importi finali

**Impatto Booking**:
- ⚠️ Claim **NON cambia** `booking_requests.status` direttamente
- Claim è entità separata collegata a booking
- Booking rimane `completed` anche con claim aperto

**Raccomandazione**: Aggiungere campo `has_active_claim` in `booking_requests` per query più semplici.

---

## 4) Domande Messaging realtime

### Chat data model

**Risposta**: ✅ **Modello completo** implementato.

#### Schema:

**Tabella `conversations`**:
- `id` (UUID) - Primary Key
- `booking_request_id` (UUID, nullable) - FK → `booking_requests.id`
- `participants` (UUID[]) - Array partecipanti (legacy, mantenuto per compatibilità)
- `created_at`, `updated_at`

**Tabella `conversation_participants`** (Junction table):
- `id` (UUID) - Primary Key
- `conversation_id` (UUID) - FK → `conversations.id`
- `profile_id` (UUID) - FK → `profiles.id`
- `last_read_at` (TIMESTAMPTZ, nullable) - Ultima lettura

**Tabella `messages`**:
- `id` (UUID) - Primary Key
- `conversation_id` (UUID) - FK → `conversations.id`
- `sender_id` (UUID) - FK → `profiles.id`
- `content` (TEXT) - Contenuto messaggio
- `message_type` (TEXT) - 'text' | 'system' | 'booking_update'
- `created_at` (TIMESTAMPTZ)

**View `messaging_conversation_summaries`**:
- Aggrega conversazioni con ultimo messaggio, unread count, etc.
- Usata da `useMessaging` hook

#### Unread Count:

**RPC Function**: `get_unread_messages_count()`
- Location: `supabase/migrations/021_add_unread_messages_count_rpc.sql`
- Calcola: Messaggi dopo `last_read_at` per utente
- Usata da: `useMessaging` hook

**Trigger Unread**: ❌ **NON esistono** trigger automatici per aggiornare unread count
- Calcolato on-demand tramite RPC function

**RPC Function**: `mark_conversation_read(p_conversation UUID)`
- Location: `supabase/migrations/009_messaging_guide_implementations.sql`
- Aggiorna: `conversation_participants.last_read_at`
- Chiamata: Quando utente apre conversazione

---

### Realtime

**Risposta**: ✅ **Realtime implementato** con Supabase Realtime.

#### Architettura:

**Canali Broadcast** (non postgres_changes):
- `room:{conversation_id}:messages` - Broadcast nuovi messaggi
- `user:{user_id}:conversations` - Broadcast aggiornamenti conversazioni utente

**Trigger Database**:
- `notify_message_created()` - Trigger su INSERT `messages`
- Location: `supabase/migrations/007_realtime_messaging.sql`
- Broadcast: Evento `message_created` su canale conversazione

**Subscription Pattern** (`src/hooks/useMessaging.ts`):
```typescript
// Canale conversazione attiva
const channel = supabase.channel(`room:${conversationId}:messages`, {
  config: { broadcast: { self: true, ack: true }, private: true }
});

channel.on("broadcast", { event: "message_created" }, (payload) => {
  // Aggiorna UI con nuovo messaggio
});

// Canale utente (per nuove conversazioni)
const userChannel = supabase.channel(`user:${userId}:conversations`);
userChannel.on("broadcast", { event: "participant_added" }, () => {
  // Refresh lista conversazioni
});
```

**Tabelle Sottoscritte**: ❌ **NON usa** `postgres_changes`, solo broadcast

**Push Notifications**:
- ❌ **NON implementato** push notifications
- ❌ **NON esiste** integrazione Firebase/OneSignal
- ⚠️ Realtime funziona solo quando app è aperta

**Raccomandazione Mobile**:
1. **Mantenere Realtime** per aggiornamenti quando app aperta
2. **Aggiungere Push Notifications**:
   - Firebase Cloud Messaging (FCM) per Android
   - Apple Push Notification Service (APNs) per iOS
   - Supabase supporta webhooks per trigger push
3. **Implementare Background Sync**:
   - Quando app in background, usare solo push
   - Quando app apre, sincronizzare con Realtime

---

## 5) Domande UX "velocità di reperimento"

### Home mappa

**Risposta**: ✅ **Concetto definito**: Search bar + mappa fullscreen + bottom sheet.

**3 Info Top nel Banner** (raccomandazione):
1. **Prezzo** - `daily_rate` (es. "€25/giorno")
2. **Distanza** - Calcolata da lat/lng utente (es. "1.2 km")
3. **Disponibilità** - Prima data disponibile o "Disponibile ora"

**Info Aggiuntive** (opzionali):
- Rating medio (se esistono recensioni)
- Foto thumbnail attrezzatura
- Nome attrezzatura (titolo)

**Banner Design**:
- Bottom sheet che si espande su tap marker
- Mostra foto carousel, dettagli, CTA "Prenota"

---

### Percorso 3 tap

**Risposta**: ✅ **Flusso minimo definito**.

**Tap 1: Mappa → Tap Marker**
- Bottom sheet si apre con dettagli attrezzatura
- Mostra: foto, prezzo, disponibilità, rating

**Tap 2: Bottom Sheet → "Prenota"**
- Apre schermata selezione date
- Calendario disponibilità
- Calcolo prezzo dinamico

**Tap 3: Date Selection → "Conferma Prenotazione"**
- Se guest: richiede login
- Se logged in: Crea booking request
- Redirect a checkout pagamento

**Schermate Minime**:
1. **MapScreen** - Mappa + search bar
2. **EquipmentDetailSheet** - Bottom sheet dettagli
3. **DateSelectionScreen** - Selezione date/calendario
4. **CheckoutScreen** - Riepilogo + pagamento

**Ottimizzazioni**:
- Pre-load dettagli attrezzatura quando marker visibile
- Cache risultati query nearby
- Lazy load immagini

---

### Fallback list

**Risposta**: ✅ **Raccomandazione**: Lista sincronizzata con markers.

**Design**:
- Lista scrollabile sotto mappa (stile cards monopattini)
- Cards mostrano: foto, titolo, prezzo, distanza
- Tap card → centra mappa su marker + apre bottom sheet
- Sincronizzazione bidirezionale:
  - Tap marker → scrolla lista a card corrispondente
  - Tap card → centra mappa su marker

**Implementazione**:
- Stessa query `get_nearby_equipment` per mappa e lista
- Virtual list per performance (es. `react-native-virtualized-view`)
- Lazy load quando scrolla lista

---

### Guest mode

**Risposta**: ✅ **Guest mode supportato** da RLS.

**Cosa può vedere Guest**:
- ✅ Mappa con attrezzature disponibili
- ✅ Dettagli attrezzatura (foto, descrizione, prezzo)
- ✅ Ricerca e filtri
- ✅ Lista attrezzature

**Cosa richiede Login**:
- ❌ Creare booking request
- ❌ Inviare messaggi
- ❌ Pagare
- ❌ Lasciare recensioni
- ❌ Salvare preferiti

**UX Guest Mode**:
- Mostrare CTA "Accedi per prenotare" su bottom sheet
- Quando tap "Prenota": Modal login/signup
- Dopo login: Redirect a booking flow

---

## 6) Domande operative monorepo

### Code sharing

**Risposta**: ✅ **Molti moduli condivisibili**.

#### Candidati per `packages/shared`:

**1. Types** (`src/types/`):
- ✅ `booking.ts` - Tipi prenotazioni
- ✅ `rental.ts` - Tipi noleggi
- ✅ `payment.ts` - Tipi pagamenti
- ✅ `messaging.ts` - Tipi messaggistica
- ✅ `claim.ts` - Tipi reclami
- ✅ `inspection.ts` - Tipi ispezioni
- ✅ `review.ts` - Tipi recensioni
- ✅ `search.ts` - Tipi ricerca
- ✅ `verification.ts` - Tipi verifica
- ⚠️ **Nessuna dipendenza DOM**

**2. Zod Validators**:
- ✅ `src/components/EquipmentListingForm.tsx` - Schema validazione equipment
- ✅ `src/lib/stripe.ts` - Schema validazione pagamenti
- ⚠️ **Nessuna dipendenza DOM**

**3. Supabase Wrapper** (`src/lib/supabase.ts`):
- ✅ Client Supabase
- ✅ Helper functions DB
- ⚠️ **Nessuna dipendenza DOM**

**4. Utils** (`src/lib/`):
- ✅ `utils.ts` - `cn()` helper, formatters
- ✅ `format.ts` - Formattazione date/currency
- ✅ `payment.ts` - Calcoli pagamenti
- ✅ `reviews.ts` - Calcoli recensioni
- ✅ `deposit.ts` - Logica depositi
- ⚠️ **Nessuna dipendenza DOM**

**5. Hooks** (`src/hooks/`):
- ⚠️ **Alcuni condivisibili**:
  - ✅ `useDebounce.ts` - Debounce generico
  - ✅ `useAuth.ts` - **DIPENDE da React Context**, ma logica condivisibile
  - ⚠️ `useMessaging.ts` - **DIPENDE da React**, ma logica condivisibile
  - ❌ `useMediaQuery.ts` - **DIPENDE da window** (web-only)

**6. Services** (`src/components/equipment/services/`):
- ✅ `listings.ts` - Fetch listings (logica pura)
- ⚠️ **DIPENDE da Supabase client**, ma condivisibile

**7. Constants**:
- ✅ `src/config/pagination.ts` - Costanti paginazione
- ✅ `src/config/breakpoints.ts` - ⚠️ Solo web, non condivisibile

**Struttura Monorepo Consigliata**:
```
rentaloo-monorepo/
├── packages/
│   ├── shared/
│   │   ├── types/          # Tutti i tipi TypeScript
│   │   ├── validators/     # Zod schemas
│   │   ├── utils/          # Utility functions
│   │   ├── constants/       # Costanti
│   │   └── supabase/       # Supabase client + helpers
│   ├── web/
│   │   └── src/            # Web app esistente
│   └── mobile/
│       └── src/            # React Native app
└── package.json            # Root workspace
```

**Tool Consigliato**: **Turborepo** o **Nx** per monorepo management.

---

### i18n

**Risposta**: ✅ **i18n riutilizzabile** con adattamenti.

#### Configurazione Attuale:
- **Libreria**: `i18next` + `react-i18next`
- **File**: `src/i18n/locales/{lang}/{namespace}.json`
- **5 Lingue**: en, es, fr, de, it
- **11 Namespace**: common, auth, navigation, equipment, booking, messaging, payment, reviews, verification, marketing, dashboard

#### Per Mobile:

**Opzione 1: Condividere file JSON** (Consigliata):
- Spostare `locales/` in `packages/shared/i18n/locales/`
- Web e Mobile importano stessi file
- **Libreria Mobile**: `react-i18next` (stesso di web) o `i18next` + adapter React Native

**Opzione 2: Libreria Mobile-Specifica**:
- `react-native-localize` per rilevamento lingua
- `i18next` compatibile React Native

**Raccomandazione**:
- ✅ Condividere file traduzioni
- ✅ Usare `i18next` anche su mobile (compatibile)
- ⚠️ Adattare `LanguageDetector` per mobile (usare `react-native-localize` invece di browser API)

---

### Design system

**Risposta**: ⚠️ **Decisione da prendere**: replicare web o mobile-native.

#### Opzioni:

**Opzione 1: Replicare Look&Feel Web** (Shadcn UI):
- **Pro**: Consistenza brand, codice condivisibile (logica)
- **Contro**: Non native, performance peggiori
- **Libreria**: `react-native-paper` con tema custom o `react-native-ui-lib`

**Opzione 2: Mobile-Native** (Consigliata):
- **Pro**: Performance native, UX mobile migliore, accessibilità
- **Contro**: Design diverso da web
- **Libreria**: 
  - `react-native-paper` (Material Design)
  - `react-native-elements` (Customizable)
  - `native-base` (Utility-first)

#### Componenti Base Necessari:

1. **Button** - CTA principali, secondari, outline
2. **Card** - Cards attrezzature, booking, etc.
3. **Sheet/BottomSheet** - Dettagli attrezzatura, filtri
4. **Input** - Search bar, form fields
5. **Tabs** - Navigazione tra sezioni
6. **Toast/Alert** - Notifiche, errori
7. **Avatar** - Profili utente
8. **Badge** - Status, tags
9. **Calendar** - Selezione date
10. **Image** - Carousel foto, thumbnails
11. **Map** - Mappa principale
12. **Skeleton** - Loading states

**Raccomandazione**: 
- Usare **react-native-paper** per componenti base
- Creare **tema custom** che matcha colori web (OKLCH → RGB)
- Mantenere **stessa gerarchia informazioni** ma layout mobile-optimized

---

## 7) Domande "mentor-ready"

### Scope MVP mobile

**Risposta**: **Raccomandazione: Opzione (B) - Booking flow base**.

#### Opzione (A): Solo home mappa + dettaglio + login
- ✅ Più veloce da implementare
- ❌ Non dimostra valore completo prodotto
- ❌ Non testabile end-to-end

#### Opzione (B): Home mappa + booking flow base ⭐ **CONSIGLIATA**
- ✅ Dimostra core value proposition
- ✅ Testabile end-to-end
- ✅ Feedback utile su UX critica
- **Scope**:
  - Home mappa con markers
  - Dettaglio attrezzatura (bottom sheet)
  - Selezione date
  - Creazione booking request
  - Login/signup
  - Dashboard base (lista prenotazioni)

#### Opzione (C): Anche pagamenti e chat
- ✅ Completo
- ❌ Troppo complesso per MVP
- ❌ Rischio di ritardi

**Timeline Consigliata MVP**:
- **Settimana 1-2**: Setup progetto, mappa base, markers
- **Settimana 3-4**: Dettaglio attrezzatura, selezione date
- **Settimana 5-6**: Booking flow, login, dashboard base
- **Settimana 7**: Polish, testing, bug fixes

**Deliverable MVP**:
- ✅ App installabile (Expo/TestFlight)
- ✅ Mappa funzionante con markers reali
- ✅ Flusso booking completo (senza pagamento)
- ✅ Login/signup funzionante
- ✅ Dashboard base con prenotazioni

---

### Rischi tecnici

**Risposta**: **5 Rischi principali identificati**.

#### 1. RLS (Row Level Security)

**Rischio**: Policy RLS potrebbero bloccare query mobile se non configurate correttamente per `anon` users.

**Mitigazione**:
- ✅ Verificare tutte le policy permettono SELECT per `anon` su `equipment` disponibili
- ✅ Testare query con utente non autenticato
- ✅ Usare `SECURITY DEFINER` functions per query complesse se necessario

**Checklist**:
- [ ] Test mappa con utente guest
- [ ] Verificare `get_nearby_equipment` RPC funziona per `anon`
- [ ] Testare filtri con guest mode

---

#### 2. Pagamenti

**Rischio**: Stripe SDK mobile diverso da web, integrazione complessa.

**Mitigazione**:
- ✅ Stripe ha SDK React Native ufficiale: `@stripe/stripe-react-native`
- ✅ Edge Functions già HTTP-compatibili
- ⚠️ Testare flow completo: Payment Intent → Checkout → Webhook

**Checklist**:
- [ ] Setup Stripe React Native SDK
- [ ] Testare Payment Sheet su iOS e Android
- [ ] Verificare webhook riceve eventi correttamente
- [ ] Testare edge cases (pagamento fallito, timeout)

---

#### 3. Realtime

**Rischio**: Supabase Realtime su mobile può avere problemi di connessione/background.

**Mitigazione**:
- ✅ Supabase JS SDK compatibile React Native
- ⚠️ Implementare reconnection logic
- ⚠️ Fallback a polling se Realtime non disponibile
- ✅ Aggiungere push notifications per background

**Checklist**:
- [ ] Testare Realtime con app in background
- [ ] Implementare exponential backoff per reconnessioni
- [ ] Testare su rete instabile (3G, WiFi debole)
- [ ] Setup push notifications come fallback

---

#### 4. Geosearch

**Rischio**: Query geospaziali lente senza indici corretti, troppi marker sulla mappa.

**Mitigazione**:
- ✅ PostGIS già abilitato, indice GIST esistente
- ⚠️ Creare RPC function `get_nearby_equipment` con limit ragionevole (50-100)
- ⚠️ Implementare clustering marker
- ⚠️ Cache risultati query per viewport

**Checklist**:
- [ ] Creare e testare RPC function `get_nearby_equipment`
- [ ] Benchmark performance con 1000+ attrezzature
- [ ] Implementare clustering (zoom < 12)
- [ ] Testare query con raggio variabile (1km, 10km, 50km)

---

#### 5. Performance Mappa

**Rischio**: Mappa lenta con molti marker, scroll janky, immagini non ottimizzate.

**Mitigazione**:
- ✅ Usare `react-native-maps` (nativo, performante)
- ⚠️ Implementare virtualizzazione lista marker
- ⚠️ Lazy load immagini (thumbnail prima, full dopo)
- ⚠️ Debounce query su pan/zoom (300-500ms)
- ⚠️ Cache risultati per viewport

**Checklist**:
- [ ] Testare performance con 500+ marker
- [ ] Implementare debounce query (300ms)
- [ ] Usare thumbnail immagini (200x200px)
- [ ] Testare su device low-end (Android < 8, iPhone < X)
- [ ] Profiling con React Native Performance Monitor

---

## Conclusioni

**Prossimi Passi Immediati**:
1. ✅ Creare RPC function `get_nearby_equipment` per query geospaziali
2. ✅ Setup monorepo con `packages/shared` per code sharing
3. ✅ Implementare sistema thumbnail immagini
4. ✅ Setup React Native progetto base
5. ✅ Implementare mappa con markers base

**Domande Aperte da Risolvere**:
- ⚠️ Definire logica "Disponibile in X minuti"
- ⚠️ Decidere design system (web-like vs native)
- ⚠️ Implementare push notifications
- ⚠️ Setup Stripe Connect per payout automatici

---

*Documento generato il: $(date)*
*Basato su analisi codice: rentaloo-ai v0.0.0*

