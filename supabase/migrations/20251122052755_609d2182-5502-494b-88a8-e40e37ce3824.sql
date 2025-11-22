-- Drop the security definer view and recreate as security invoker
DROP VIEW IF EXISTS campaign_donor_stats;

-- Create view with explicit security invoker (follows RLS of querying user)
CREATE OR REPLACE VIEW campaign_donor_stats 
WITH (security_invoker=true) AS
SELECT 
  d.campaign_id,
  d.user_id,
  p.full_name,
  SUM(d.amount) as total_donated,
  COUNT(d.id) as donation_count,
  MAX(d.created_at) as last_donation_date
FROM public.donations d
JOIN public.profiles p ON d.user_id = p.id
WHERE d.campaign_id IS NOT NULL AND d.status = 'completed'
GROUP BY d.campaign_id, d.user_id, p.full_name;