-- Migration: Create view for server-side aggregation of available equipment counts per category
-- This replaces client-side counting which was hitting PostgREST's row cap and wasting bandwidth

-- Create a view that returns pre-aggregated counts of available equipment per category
-- This is more efficient than fetching all rows and counting client-side
CREATE OR REPLACE VIEW public.available_equipment_counts_by_category AS
SELECT
  category_id,
  COUNT(*)::integer AS available_count
FROM public.equipment
WHERE is_available = true
GROUP BY category_id;

-- Add comment for documentation
COMMENT ON VIEW public.available_equipment_counts_by_category IS
'Pre-aggregated counts of available equipment per category. Used by autocomplete to show item counts without fetching all equipment rows.';

-- Grant select permission to all users (including anonymous) since equipment is publicly viewable
GRANT SELECT ON public.available_equipment_counts_by_category TO anon;
GRANT SELECT ON public.available_equipment_counts_by_category TO authenticated;

-- Note: Views don't need RLS policies - they inherit the RLS from underlying tables
-- Since equipment table allows SELECT for everyone, this view is accessible to all users

