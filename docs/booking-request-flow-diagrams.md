# Booking Request Flow - Visual Diagrams

This document contains visual diagrams of the booking request flow using Mermaid syntax. These diagrams can be rendered in GitHub, Markdown viewers, or at [mermaid.live](https://mermaid.live).

## 1. Complete Booking Flow Sequence Diagram

```mermaid
sequenceDiagram
    actor Renter
    actor Owner
    participant UI as Frontend
    participant API as Supabase
    participant Stripe
    participant Webhook
    
    Note over Renter,Owner: 1. Discovery & Booking Request
    Renter->>UI: Browse equipment
    Renter->>UI: Select dates & submit request
    UI->>UI: Validate dates
    UI->>API: checkBookingConflicts()
    API-->>UI: No conflicts
    UI->>API: Create booking_request (status: pending)
    API-->>UI: Booking created
    
    Note over Renter,Owner: 2. Payment Processing
    UI->>Webhook: Create Payment Intent
    Webhook->>Stripe: Create Payment Intent
    Stripe-->>Webhook: Payment Intent created
    Webhook-->>UI: Payment Intent ID
    Renter->>UI: Enter payment details
    UI->>Stripe: Confirm payment
    Stripe-->>Webhook: payment_intent.succeeded
    Webhook->>API: Create payment record (escrow: held)
    Webhook->>API: Update booking_request (status: approved)
    API-->>Owner: Notification: New booking
    
    Note over Renter,Owner: 3. Rental Period
    Owner->>Renter: Hand over equipment
    Renter->>Renter: Use equipment
    Renter->>Owner: Return equipment
    
    Note over Renter,Owner: 4. Completion & Payout
    Webhook->>API: Update booking (status: completed)
    Webhook->>API: Update escrow (status: released)
    API->>Owner: Transfer payout
    API-->>Owner: Notification: Payment released
    API-->>Renter: Notification: Booking completed
    
    Note over Renter,Owner: 5. Reviews
    Renter->>API: Submit review
    Owner->>API: Submit review
    API-->>Renter: Thank you
    API-->>Owner: Thank you
```

## 2. State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> Pending: Create Booking Request
    
    Pending --> Approved: Payment Succeeded
    Pending --> Cancelled: Cancel Before Payment
    
    Approved --> InProgress: Rental Period Starts
    Approved --> Cancelled: Cancel After Payment<br/>(Refund Issued)
    
    InProgress --> Completed: Return Equipment
    InProgress --> Cancelled: Cancel During Rental<br/>(Partial Refund)
    
    Completed --> [*]: Review Submitted
    Cancelled --> [*]: Refund Processed
    
    note right of Pending
        Awaiting payment
        Escrow: N/A
    end note
    
    note right of Approved
        Payment succeeded
        Escrow: Held
    end note
    
    note right of Completed
        Rental finished
        Escrow: Released
    end note
    
    note right of Cancelled
        Booking cancelled
        Escrow: Refunded
    end note
```

## 3. Component Architecture

```mermaid
graph TD
    A[ExplorePage] -->|Select Equipment| B[BookingRequestForm]
    B -->|Validate| C{Conflicts?}
    C -->|Yes| D[Show Error]
    C -->|No| E[Create Request]
    E --> F[PaymentForm]
    F -->|Stripe| G[Payment Processing]
    G -->|Success| H[BookingRequestCard]
    G -->|Failure| I[Retry Payment]
    I --> F
    
    H -->|Real-time Updates| J[Supabase Subscriptions]
    J -->|Status Change| H
    
    H -->|Complete| K[Reviews]
    H -->|Cancel| L[Refund Process]
    
    style B fill:#e1f5ff
    style F fill:#ffe1e1
    style H fill:#e1ffe1
    style K fill:#fff4e1
```

## 4. Database Entity Relationship

```mermaid
erDiagram
    PROFILES ||--o{ BOOKING_REQUESTS : creates
    PROFILES ||--o{ EQUIPMENT : owns
    EQUIPMENT ||--o{ BOOKING_REQUESTS : "booked for"
    BOOKING_REQUESTS ||--o| PAYMENTS : "has payment"
    BOOKING_REQUESTS ||--o| BOOKINGS : "confirmed as"
    BOOKINGS ||--o{ REVIEWS : "receives"
    PROFILES ||--o{ REVIEWS : writes
    
    BOOKING_REQUESTS {
        uuid id PK
        uuid equipment_id FK
        uuid renter_id FK
        date start_date
        date end_date
        decimal total_amount
        enum status
        text message
    }
    
    PAYMENTS {
        uuid id PK
        uuid booking_request_id FK
        uuid renter_id FK
        uuid owner_id FK
        decimal total_amount
        decimal escrow_amount
        enum payment_status
        enum escrow_status
        text stripe_payment_intent_id
    }
    
    EQUIPMENT {
        uuid id PK
        uuid owner_id FK
        text title
        decimal daily_rate
        text location
    }
    
    PROFILES {
        uuid id PK
        text email
        text full_name
    }
```

## 5. Payment Flow Detail

```mermaid
flowchart TD
    Start([Renter Clicks<br/>'Continue to Payment']) --> A[Create Payment Intent]
    A --> B{Webhook<br/>Successful?}
    B -->|No| Error1[Show Error]
    B -->|Yes| C[Show Stripe Payment Form]
    
    C --> D[Renter Enters Card Details]
    D --> E[Submit to Stripe]
    E --> F{Payment<br/>Successful?}
    
    F -->|No| Error2[Show Card Error]
    Error2 --> C
    
    F -->|Yes| G[Stripe Webhook Triggered]
    G --> H[Create Payment Record]
    H --> I[Set Escrow Status: Held]
    I --> J[Update Booking: Approved]
    J --> K[Notify Owner]
    K --> L[Notify Renter]
    L --> End([Booking Confirmed])
    
    style A fill:#e1f5ff
    style G fill:#ffe1e1
    style J fill:#e1ffe1
    style Error1 fill:#ffcccc
    style Error2 fill:#ffcccc
```

## 6. Conflict Detection Flow

```mermaid
flowchart TD
    A[User Selects Dates] --> B[Calculate Duration]
    B --> C{Duration<br/>1-30 days?}
    C -->|No| Error1[Show Validation Error]
    C -->|Yes| D[Call checkBookingConflicts]
    
    D --> E[Query Database Function]
    E --> F{check_booking_conflicts<br/>Returns True?}
    
    F -->|False<br/>Conflicts Exist| G[Show Conflict Message]
    G --> H[Suggest Alternative Dates]
    
    F -->|True<br/>Available| I[Calculate Pricing]
    I --> J[Display Total Cost]
    J --> K[Enable Submit Button]
    
    style Error1 fill:#ffcccc
    style G fill:#ffe1cc
    style K fill:#e1ffe1
```

## 7. Escrow Management Flow

```mermaid
flowchart LR
    A[Payment Received] --> B[Create Payment Record]
    B --> C[Set escrow_status: held]
    C --> D[Funds Held by Stripe]
    D --> E{Booking<br/>Status?}
    
    E -->|Completed| F[Release Escrow]
    F --> G[Transfer to Owner]
    G --> H[Set escrow_status: released]
    
    E -->|Cancelled| I[Refund Escrow]
    I --> J[Refund to Renter]
    J --> K[Set escrow_status: refunded]
    
    style C fill:#fff4cc
    style H fill:#e1ffe1
    style K fill:#ffe1e1
```

## 8. User Journey Map

```mermaid
journey
    title Renter Booking Journey
    section Discovery
      Browse equipment: 5: Renter
      Filter & search: 4: Renter
      View details: 5: Renter
    section Booking
      Select dates: 4: Renter
      View pricing: 5: Renter
      Submit request: 4: Renter
    section Payment
      Enter card details: 3: Renter
      Confirm payment: 4: Renter
      Receive confirmation: 5: Renter
    section Rental
      Pickup equipment: 4: Renter, Owner
      Use equipment: 5: Renter
      Return equipment: 4: Renter, Owner
    section Completion
      Receive notification: 5: Renter
      Leave review: 4: Renter
```

## 9. System Context Diagram

```mermaid
C4Context
    title System Context - Booking Request Flow
    
    Person(renter, "Renter", "User looking to rent equipment")
    Person(owner, "Owner", "User lending equipment")
    
    System(rentaloo, "RentAloo Platform", "Peer-to-peer equipment rental marketplace")
    
    System_Ext(stripe, "Stripe", "Payment processing and escrow")
    System_Ext(supabase, "Supabase", "Database, auth, and real-time")
    System_Ext(email, "Email Service", "Notifications")
    
    Rel(renter, rentaloo, "Browse, book, pay")
    Rel(owner, rentaloo, "List, approve, receive")
    Rel(rentaloo, stripe, "Process payments")
    Rel(rentaloo, supabase, "Store data")
    Rel(rentaloo, email, "Send notifications")
```

## 10. Real-time Updates Flow

```mermaid
sequenceDiagram
    participant RC as RenterClient
    participant OC as OwnerClient
    participant SB as Supabase
    participant WH as Webhook
    
    Note over RC,OC: Both clients subscribe to channels
    RC->>SB: Subscribe to booking-{id}
    OC->>SB: Subscribe to booking-{id}
    RC->>SB: Subscribe to payment-{id}
    
    Note over RC,WH: Payment Event
    WH->>SB: Update payment record
    SB-->>RC: Broadcast: payment updated
    SB-->>OC: Broadcast: payment updated
    RC->>RC: Update UI: Payment succeeded
    OC->>OC: Update UI: New booking
    
    Note over RC,OC: Status Change Event
    WH->>SB: Update booking status
    SB-->>RC: Broadcast: booking updated
    SB-->>OC: Broadcast: booking updated
    RC->>RC: Refresh booking list
    OC->>OC: Refresh booking list
```

## 11. Cancellation Flow

```mermaid
flowchart TD
    A[User Clicks Cancel] --> B{Confirm<br/>Cancellation?}
    B -->|No| Cancel[Keep Booking]
    B -->|Yes| C{Has<br/>Payment?}
    
    C -->|No| D[Simply Cancel]
    D --> E[Update status: cancelled]
    
    C -->|Yes| F[Process Refund]
    F --> G{Refund<br/>Successful?}
    
    G -->|No| Error[Show Error,<br/>Contact Support]
    G -->|Yes| H[Update Payment: refunded]
    H --> I[Update Escrow: refunded]
    I --> J[Update Booking: cancelled]
    J --> K[Notify Both Parties]
    K --> End([Cancellation Complete])
    
    style Error fill:#ffcccc
    style End fill:#e1ffe1
```

## Rendering These Diagrams

### GitHub/GitLab
These diagrams will automatically render in GitHub or GitLab markdown files.

### VS Code
Install the "Markdown Preview Mermaid Support" extension to view diagrams.

### Online
Copy any diagram code block and paste it at [mermaid.live](https://mermaid.live) for interactive viewing and editing.

### Export
From mermaid.live, you can export diagrams as:
- PNG image
- SVG vector
- PDF document

## Diagram Legend

### Colors
- 🔵 Blue: User actions and inputs
- 🔴 Red: Payment/financial operations  
- 🟢 Green: Successful states/completions
- 🟡 Yellow: Intermediate/processing states
- ⚪ Gray: System/automated operations
- ❌ Red Fill: Errors and failures

### Shapes
- Rectangle: Process or action
- Diamond: Decision point
- Rounded: Start/end points
- Parallelogram: Data input/output
- Cylinder: Database operations
