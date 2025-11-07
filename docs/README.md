# RentAloo Documentation

Welcome to the RentAloo documentation! This directory contains comprehensive guides and technical documentation for the platform.

## 📚 Table of Contents

### Core Documentation

#### Booking System
- **[Booking Request Flow](./booking-request-flow.md)** - Complete guide to the booking request flow including:
  - High-level flow diagram
  - Detailed state transitions
  - Key actors and responsibilities
  - Database schema
  - Component architecture
  - Business rules
  - Security considerations
  - Testing guidelines

- **[Booking Request Flow - Quick Reference](./booking-request-flow-quick-reference.md)** - Quick lookup guide with:
  - State transitions at a glance
  - Key files reference
  - Field definitions
  - Common queries
  - Troubleshooting tips
  - Testing scenarios

- **[Booking Request Flow - Visual Diagrams](./booking-request-flow-diagrams.md)** - Interactive Mermaid diagrams including:
  - Complete sequence diagram
  - State machine diagram
  - Component architecture
  - Database ERD
  - Payment flow
  - Conflict detection flow
  - User journey map

#### Payment System
- **[Stripe Payment Implementation](./payments/stripe-test-payment-implementation.md)** - Stripe integration guide

#### UI Components
- **[Equipment Detail UI Implementation](./equipment-detail-ui-option-a-implementation.md)** - Equipment detail page implementation

## 🚀 Quick Start Guides

### For Developers

**Understanding the Booking Flow:**
1. Start with [Booking Request Flow](./booking-request-flow.md) for comprehensive overview
2. Reference [Quick Reference Guide](./booking-request-flow-quick-reference.md) for code locations
3. View [Visual Diagrams](./booking-request-flow-diagrams.md) for architectural understanding

**Working with Payments:**
1. Review [Stripe Implementation Guide](./payments/stripe-test-payment-implementation.md)
2. Check payment-related sections in [Booking Flow](./booking-request-flow.md)

**Building UI Components:**
1. Check [Equipment Detail UI](./equipment-detail-ui-option-a-implementation.md)
2. Review component structure in [Booking Flow Diagrams](./booking-request-flow-diagrams.md)

### For Product Managers

**Understanding User Journeys:**
1. Review the user journey diagram in [Visual Diagrams](./booking-request-flow-diagrams.md)
2. Read the "Key Actors" section in [Booking Request Flow](./booking-request-flow.md)
3. Check business rules and validation in [Quick Reference](./booking-request-flow-quick-reference.md)

**Feature Planning:**
1. Review "Future Enhancements" in [Booking Request Flow](./booking-request-flow.md)
2. Check current business rules and constraints
3. Review error handling scenarios

## 📖 Documentation by Topic

### Architecture & Design
- Component architecture → [Diagrams](./booking-request-flow-diagrams.md)
- Database schema → [Booking Flow](./booking-request-flow.md#database-schema)
- State management → [Quick Reference](./booking-request-flow-quick-reference.md)

### Implementation Guides
- Booking components → [Booking Flow](./booking-request-flow.md#key-components)
- Payment integration → [Stripe Guide](./payments/stripe-test-payment-implementation.md)
- UI components → [Equipment Detail](./equipment-detail-ui-option-a-implementation.md)

### API & Database
- Database tables → [Quick Reference](./booking-request-flow-quick-reference.md#booking-request-fields)
- Common queries → [Quick Reference](./booking-request-flow-quick-reference.md#common-queries)
- RPC functions → [Quick Reference](./booking-request-flow-quick-reference.md#api-endpoints-supabase)

### Testing & Debugging
- Test scenarios → [Booking Flow](./booking-request-flow.md#testing-considerations)
- Troubleshooting → [Quick Reference](./booking-request-flow-quick-reference.md#troubleshooting)
- Common errors → [Booking Flow](./booking-request-flow.md#error-handling)

## 🔍 Finding What You Need

### By User Type

**Frontend Developer:**
- Component locations: [Quick Reference](./booking-request-flow-quick-reference.md#key-files-reference)
- Component architecture: [Diagrams](./booking-request-flow-diagrams.md#3-component-architecture)
- UI implementation: [Equipment Detail](./equipment-detail-ui-option-a-implementation.md)

**Backend Developer:**
- Database schema: [Booking Flow](./booking-request-flow.md#database-schema)
- API endpoints: [Quick Reference](./booking-request-flow-quick-reference.md#api-endpoints-supabase)
- Performance indexes: [Quick Reference](./booking-request-flow-quick-reference.md#key-indexes-for-performance)

**Full-Stack Developer:**
- Complete flow: [Booking Flow](./booking-request-flow.md)
- All diagrams: [Diagrams](./booking-request-flow-diagrams.md)
- Quick lookup: [Quick Reference](./booking-request-flow-quick-reference.md)

**DevOps/Infrastructure:**
- Webhooks: [Quick Reference](./booking-request-flow-quick-reference.md#webhook-events)
- Environment variables: [Quick Reference](./booking-request-flow-quick-reference.md#environment-variables)
- Monitoring metrics: [Quick Reference](./booking-request-flow-quick-reference.md#metrics-to-monitor)

**QA/Testing:**
- Test scenarios: [Booking Flow](./booking-request-flow.md#testing-considerations)
- Test cases: [Quick Reference](./booking-request-flow-quick-reference.md#testing-scenarios)
- Edge cases: [Booking Flow](./booking-request-flow.md#testing-considerations)

### By Feature

**Booking Creation:**
- Component: BookingRequestForm → [Quick Reference](./booking-request-flow-quick-reference.md#components)
- Flow: [Diagrams - Sequence](./booking-request-flow-diagrams.md#1-complete-booking-flow-sequence-diagram)
- Validation: [Booking Flow - Business Rules](./booking-request-flow.md#business-rules)

**Payment Processing:**
- Stripe guide: [Stripe Implementation](./payments/stripe-test-payment-implementation.md)
- Payment flow: [Diagrams - Payment Flow](./booking-request-flow-diagrams.md#5-payment-flow-detail)
- Escrow: [Diagrams - Escrow Flow](./booking-request-flow-diagrams.md#7-escrow-management-flow)

**Booking Management:**
- States: [Diagrams - State Machine](./booking-request-flow-diagrams.md#2-state-machine-diagram)
- Status updates: [Quick Reference - Status Values](./booking-request-flow-quick-reference.md#status-values)
- Real-time: [Diagrams - Real-time Updates](./booking-request-flow-diagrams.md#10-real-time-updates-flow)

**Cancellation & Refunds:**
- Flow: [Diagrams - Cancellation](./booking-request-flow-diagrams.md#11-cancellation-flow)
- Process: [Booking Flow - Error Handling](./booking-request-flow.md#error-handling)

## 🛠️ Additional Resources

### Project Root
- Main README: [`../README.md`](../README.md)
- Project structure overview
- Development setup instructions
- Testing guidelines

### Database
- Migration files: `../supabase/migrations/`
- Database guides: `../supabase/guides/`
- RLS policies: `../supabase/guides/RLSPolicies.md`

### Source Code
- Components: `../src/components/`
- Hooks: `../src/hooks/`
- Utilities: `../src/lib/`
- Types: `../src/types/`

## 📝 Contributing to Documentation

When adding new documentation:

1. **Place it in the appropriate directory:**
   - Feature documentation → `/docs/`
   - Payment-related → `/docs/payments/`
   - Database guides → `/supabase/guides/`

2. **Follow naming conventions:**
   - Use kebab-case: `feature-name.md`
   - Be descriptive: `booking-request-flow.md` not `booking.md`

3. **Include in this index:**
   - Add link to appropriate section
   - Add brief description
   - Tag by user type if relevant

4. **Use consistent formatting:**
   - Include table of contents for long docs
   - Use code blocks with language tags
   - Add diagrams where helpful
   - Link to related documentation

5. **Keep it up to date:**
   - Update when features change
   - Mark deprecated sections
   - Add version notes if needed

## 🔗 External Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Mermaid Diagram Syntax](https://mermaid.js.org/intro/)

## 📬 Getting Help

- **Code Issues:** Check the troubleshooting sections in respective guides
- **Questions:** Refer to the Quick Reference guides first
- **Bugs:** Create an issue in the repository
- **Features:** Review "Future Enhancements" sections

---

**Last Updated:** November 2025  
**Maintained By:** RentAloo Development Team
