-- Migration: Add 'releasing' intermediate status to deposit_status enum
-- Required for atomic locking in release-deposit edge function to prevent concurrent refunds
-- 
-- The release-deposit function uses this transient state:
--   held → releasing (lock) → released (success) OR back to held (rollback on error)

ALTER TYPE deposit_status ADD VALUE 'releasing' AFTER 'held';

COMMENT ON TYPE deposit_status IS 
'Deposit status lifecycle: held → releasing (transient lock) → released/claimed/refunded';

