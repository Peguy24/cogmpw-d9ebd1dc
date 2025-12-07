-- Fix 1: Update profiles RLS policy to respect phone_visible privacy setting
DROP POLICY IF EXISTS "Profiles viewable with privacy controls" ON public.profiles;

CREATE POLICY "Profiles viewable with privacy controls" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id OR is_approved = true
);

-- Fix 2: Add RLS to campaign_donor_stats view by recreating it with security invoker
DROP VIEW IF EXISTS public.campaign_donor_stats;

CREATE VIEW public.campaign_donor_stats 
WITH (security_invoker = true)
AS
SELECT 
  d.campaign_id,
  d.user_id,
  p.full_name,
  SUM(d.amount) as total_donated,
  COUNT(*) as donation_count,
  MAX(d.created_at) as last_donation_date
FROM public.donations d
LEFT JOIN public.profiles p ON d.user_id = p.id
WHERE d.status = 'completed' AND d.campaign_id IS NOT NULL
GROUP BY d.campaign_id, d.user_id, p.full_name;