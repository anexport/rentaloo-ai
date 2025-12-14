-- Add admin role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Helper function to check if a user is an admin
-- Uses SECURITY DEFINER to bypass RLS when checking admin status
-- search_path is restricted to prevent schema hijacking attacks
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog;

-- Admin policies to manage core tables
CREATE POLICY "Admins can manage profiles" ON profiles
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage renter profiles" ON renter_profiles
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage owner profiles" ON owner_profiles
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage equipment" ON equipment
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage equipment photos" ON equipment_photos
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage availability" ON availability_calendar
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage booking requests" ON booking_requests
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage bookings" ON bookings
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage payments" ON payments
    FOR ALL USING (is_admin(auth.uid()));

-- Trigger function to set payout_processed_at when payout_status changes to 'completed'
-- This ensures consistent, server-side timestamps for audit/reconciliation purposes
CREATE OR REPLACE FUNCTION set_payout_processed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set payout_processed_at when status becomes 'completed'
    IF NEW.payout_status = 'completed' AND (OLD.payout_status IS NULL OR OLD.payout_status != 'completed') THEN
        NEW.payout_processed_at := NOW();
    -- Clear payout_processed_at if status is changed away from 'completed'
    ELSIF NEW.payout_status != 'completed' AND OLD.payout_status = 'completed' THEN
        NEW.payout_processed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS trigger_set_payout_processed_at ON payments;
CREATE TRIGGER trigger_set_payout_processed_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION set_payout_processed_at();
