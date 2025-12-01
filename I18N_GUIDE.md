# Internationalization (i18n) Guide for RentAloo

This guide explains how the i18n system works in RentAloo and how to translate remaining components.

## Overview

RentAloo now supports **4 languages**:
- 🇺🇸 **English** (en) - Default
- 🇪🇸 **Spanish** (es)
- 🇫🇷 **French** (fr)
- 🇩🇪 **German** (de)

## What's Already Implemented

### ✅ Core Setup
- **i18n Configuration**: `/src/i18n/config.ts`
- **Translation Files**: `/src/i18n/locales/{en,es,fr,de}/*.json`
- **Language Selector Component**: `/src/components/LanguageSelector.tsx`
- **User Menu Integration**: Language selector added to UserMenu dropdown
- **Language Persistence**:
  - Anonymous users: `localStorage`
  - Logged-in users: Synced to `auth.users.user_metadata.language_preference`
- **Auto-detection**: Browser language detected on first visit

### ✅ Translated Components
1. **LoginModal** - `/src/components/auth/LoginModal.tsx`
2. **SignupModal** - `/src/components/auth/SignupModal.tsx`
3. **UserMenu** - `/src/components/UserMenu.tsx`

### ✅ Translation Files Created
All translation files exist for all 4 languages:
- `common.json` - Buttons, labels, status, errors, success messages
- `auth.json` - Login, signup, verification
- `navigation.json` - Menu items, page titles
- `equipment.json` - Listings, filters, search, forms
- `booking.json` - Booking flow, calendar, pricing
- `messaging.json` - Chat, conversations, notifications
- `payment.json` - Checkout, payments, escrow, refunds
- `reviews.json` - Ratings, reviews, filters
- `verification.json` - Identity verification, badges

### ✅ Google Translate API Integration
- **Translation Service**: `/src/lib/translation.ts`
- **Caching**: Database table `content_translations` (migration created)
- **Usage**: Automatically translates user-generated content (equipment titles/descriptions)

---

## How to Translate Remaining Components

### Step 1: Import useTranslation Hook

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation("namespace"); // e.g., "equipment", "booking", etc.

  // Use t() function to translate strings
  return <div>{t("key.path.to.string")}</div>;
}
```

### Step 2: Replace Hardcoded Strings

**Before:**
```typescript
<Button>Save Changes</Button>
<Label>Email Address</Label>
```

**After:**
```typescript
<Button>{t("common:buttons.save")}</Button>
<Label>{t("auth:login.email_label")}</Label>
```

### Step 3: Handle Dynamic Values

Use interpolation for dynamic values:

```typescript
// Translation file
{
  "welcome_message": "Welcome, {{name}}!",
  "items_count": "You have {{count}} item",
  "items_count_plural": "You have {{count}} items"
}

// Component
t("welcome_message", { name: user.name })
t("items_count", { count: 5 }) // Automatically handles plural
```

### Step 4: Handle Form Validation

**Zod schemas should use translation keys in error messages:**

```typescript
// Before
const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// After - Option 1: Use translation in component
const { t } = useTranslation("auth");
const schema = z.object({
  email: z.string().email(t("login.errors.invalid_email")),
});

// After - Option 2: Keep English in schema, translate in error display
// (LoginModal example - error messages are displayed as-is from Zod)
```

---

## Translation Namespaces

| Namespace | Use For | Example Keys |
|-----------|---------|--------------|
| `common` | General UI, buttons, labels | `common:buttons.save`, `common:errors.required_field` |
| `auth` | Login, signup, verification | `auth:login.title`, `auth:signup.submit_button` |
| `navigation` | Menus, page titles | `navigation:menu.dashboard`, `navigation:pages.home` |
| `equipment` | Listings, details, filters | `equipment:listing_card.per_day`, `equipment:filters.category` |
| `booking` | Booking flow | `booking:sidebar.select_dates`, `booking:status.pending` |
| `messaging` | Chat, conversations | `messaging:chat.type_message`, `messaging:conversation_list.title` |
| `payment` | Checkout, payments | `payment:checkout.title`, `payment:confirmation.message` |
| `reviews` | Reviews & ratings | `reviews:form.leave_review`, `reviews:rating.average_rating` |
| `verification` | Identity verification | `verification:title`, `verification:badges.email_verified` |

---

## Priority Components to Translate

### High Priority (User-Facing)
1. **HomePage** (`/src/pages/HomePage.tsx`)
2. **ExplorePage** (`/src/pages/ExplorePage.tsx`)
3. **ListingCard** (`/src/components/equipment/ListingCard.tsx`)
4. **EquipmentDetailDialog** (`/src/components/equipment/detail/EquipmentDetailDialog.tsx`)
5. **BookingSidebar** (`/src/components/booking/sidebar/BookingSidebar.tsx`)
6. **MessagingInterface** (`/src/components/messaging/MessagingInterface.tsx`)

### Medium Priority
7. Renter/Owner Dashboards
8. Payment components
9. Review components
10. Verification components

### Low Priority
11. Admin/internal pages
12. Error pages
13. Settings pages

---

## Example: Translating ListingCard

**Before:**
```typescript
<div className="text-sm text-gray-600">
  <span className="font-semibold">${listing.daily_rate}</span> per day
</div>
<Badge variant="secondary">{listing.condition}</Badge>
<span>{listing.reviews?.length || 0} reviews</span>
```

**After:**
```typescript
import { useTranslation } from "react-i18next";

function ListingCard() {
  const { t } = useTranslation("equipment");

  return (
    <>
      <div className="text-sm text-gray-600">
        <span className="font-semibold">${listing.daily_rate}</span> {t("listing_card.per_day")}
      </div>
      <Badge variant="secondary">{t(`condition.${listing.condition}`)}</Badge>
      <span>
        {t("listing_card.reviews_count", { count: listing.reviews?.length || 0 })}
      </span>
    </>
  );
}
```

---

## Testing Translations

### Manual Testing
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:5173`
3. Log in (or browse anonymously)
4. Click user menu → Select language (🇪🇸 🇫🇷 🇩🇪)
5. Verify all text changes to selected language

### Automated Testing
```bash
# Type check
npx tsc --noEmit

# Build check
npm run build
```

---

## Adding New Languages

### 1. Create Translation Files
```bash
mkdir src/i18n/locales/pt  # Portuguese example
```

Copy all JSON files from `en/` to `pt/` and translate values.

### 2. Update i18n Config
Edit `/src/i18n/config.ts`:
```typescript
import ptCommon from "./locales/pt/common.json";
import ptAuth from "./locales/pt/auth.json";
// ... import all pt files

const resources = {
  // ... existing languages
  pt: {
    common: ptCommon,
    auth: ptAuth,
    // ... all namespaces
  },
};
```

### 3. Update LanguageSelector
Edit `/src/components/LanguageSelector.tsx`:
```typescript
const languages: Language[] = [
  // ... existing languages
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
];
```

---

## Google Translate API Setup

### 1. Get API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Cloud Translation API**
4. Create credentials → API Key
5. Copy the API key

### 2. Add to Supabase Secrets
**IMPORTANT:** Never add the API key to `.env` or client-side code. This would expose it to all users and allow unauthorized usage.

Instead, add it as a Supabase secret:
```bash
# Using Supabase CLI
supabase secrets set GOOGLE_TRANSLATE_API_KEY=your_api_key_here

# Or via Supabase Dashboard:
# Settings → Edge Functions → Secrets → Add Secret
```

### 3. Deploy Edge Function
Deploy the secure translation edge function:
```bash
supabase functions deploy translate-content
```

### 4. Apply Migrations
Apply both migrations to create the translation cache table and secure RLS policies:
```bash
# Via Supabase Dashboard: Database → Migrations → Run migrations
# Or via CLI:
supabase db push
```

### 5. Use in Components

```typescript
import { translateEquipmentContent } from "@/lib/translation";

// In equipment detail component
const [translatedTitle, setTranslatedTitle] = useState("");

useEffect(() => {
  async function loadTranslation() {
    const { title, description } = await translateEquipmentContent(
      equipment.id,
      i18n.language
    );
    setTranslatedTitle(title);
  }
  loadTranslation();
}, [equipment.id, i18n.language]);
```

---

## Best Practices

### ✅ Do
- Use descriptive translation keys: `equipment.listing_card.per_day` not `eq.lc.pd`
- Group related translations in the same namespace
- Use interpolation for dynamic values
- Test with long German words (they break layouts!)
- Keep punctuation inside translation strings
- Use pluralization for count-based strings

### ❌ Don't
- Hardcode strings (always use `t()`)
- Concatenate translated strings
- Use English as default fallback in code (i18n handles this)
- Forget to import `useTranslation` hook
- Mix namespaces in one component (pick one primary namespace)

---

## Troubleshooting

### Issue: Translation not showing
**Solution:** Check:
1. Translation key exists in JSON file
2. Correct namespace used: `t("key")` uses default namespace (common)
3. Use `t("namespace:key.path")` for specific namespace
4. Import hook: `const { t } = useTranslation("namespace")`

### Issue: Language not persisting
**Solution:**
- Check browser console for errors
- Verify localStorage has `userLanguagePreference`
- For logged-in users, check `auth.users.user_metadata.language_preference`

### Issue: Google Translate not working
**Solution:**
- Verify `GOOGLE_TRANSLATE_API_KEY` is set in Supabase secrets
- Check that the `translate-content` edge function is deployed
- Check API key permissions in Google Cloud Console
- Ensure Cloud Translation API is enabled
- Check Supabase edge function logs for errors

---

## File Structure Reference

```
src/
├── i18n/
│   ├── config.ts                 # i18n configuration
│   ├── index.ts                  # Exports
│   └── locales/
│       ├── en/
│       │   ├── common.json
│       │   ├── auth.json
│       │   ├── navigation.json
│       │   ├── equipment.json
│       │   ├── booking.json
│       │   ├── messaging.json
│       │   ├── payment.json
│       │   ├── reviews.json
│       │   └── verification.json
│       ├── es/ (same structure)
│       ├── fr/ (same structure)
│       └── de/ (same structure)
├── components/
│   └── LanguageSelector.tsx      # Language dropdown
├── lib/
│   └── translation.ts             # Client-side translation wrapper
└── contexts/
    └── AuthContext.tsx            # Language sync on login

supabase/
├── functions/
│   └── translate-content/         # Secure translation edge function
│       └── index.ts
└── migrations/
    ├── 999_add_content_translations_table.sql  # Translation cache table
    └── 1000_fix_content_translations_rls.sql   # Secure RLS policies
```

---

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [Google Cloud Translation API](https://cloud.google.com/translate/docs)
- [OKLCH Color Converter](https://oklch.com/) (for accessible colors across languages)

---

## Support

For questions or issues:
1. Check this guide first
2. Check browser console for errors
3. Review existing translated components (LoginModal, SignupModal, UserMenu)
4. Test in different languages to identify the issue

Happy translating! 🌍
