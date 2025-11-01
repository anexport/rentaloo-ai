# Fix TypeScript Errors in useMessaging.ts

## Issues Identified

1. **Missing table type definition**: `conversation_participants` table exists in database but not in TypeScript types (causes 6 errors)
2. **Type mismatch**: `last_message` can be `null` but type only allows `undefined` (causes 1 error)
3. **Cascading errors**: Missing table causes property access errors (2 errors)

## Changes Required

### 1. Add `conversation_participants` table to `src/lib/database.types.ts`

- Insert after `conversations` table definition (around line 213)
- Define Row, Insert, Update types based on migration schema:
- `id`: UUID (primary key, default uuid_generate_v4)
- `conversation_id`: UUID (references conversations.id)
- `profile_id`: UUID (references profiles.id)
- `created_at`: TIMESTAMP WITH TIME ZONE (default NOW())
- Add Relationships array with foreign keys to `conversations` and `profiles`

### 2. Fix `last_message` type handling in `src/hooks/useMessaging.ts`

- Option A: Update `ConversationWithDetails` type to allow `null` (in `src/types/messaging.ts`)
- Option B: Convert `null` to `undefined` when setting `last_message` (line 112)
- Recommended: Option A (update type definition) to match actual database behavior

### 3. Verify type compatibility

- Ensure all queries work with updated types
- Confirm no remaining TypeScript errors

## Files to Modify

- `src/lib/database.types.ts` - Add conversation_participants table definition
- `src/types/messaging.ts` - Update ConversationWithDetails.last_message to allow null (optional)

## Testing

- Run TypeScript compiler to verify all errors are resolved
- Check that linting passes for useMessaging.ts