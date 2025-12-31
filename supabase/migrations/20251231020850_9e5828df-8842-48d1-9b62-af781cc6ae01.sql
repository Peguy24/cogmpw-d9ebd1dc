-- Fix 1: profiles table - require viewing user to also be approved
DROP POLICY IF EXISTS "Authenticated users can view profiles with privacy" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles with privacy" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (is_approved = true AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_approved = true))
);

-- Fix 2: Create separate table for sensitive payment data and restrict access
CREATE TABLE IF NOT EXISTS public.donation_payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid REFERENCES public.donations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_payment_details ENABLE ROW LEVEL SECURITY;

-- Only service role can access payment details (for automated systems)
CREATE POLICY "No direct access to payment details"
ON public.donation_payment_details
FOR ALL
USING (false);

-- Migrate existing stripe_payment_intent_id data to new table
INSERT INTO public.donation_payment_details (donation_id, stripe_payment_intent_id)
SELECT id, stripe_payment_intent_id 
FROM public.donations 
WHERE stripe_payment_intent_id IS NOT NULL
ON CONFLICT (donation_id) DO NOTHING;

-- Remove stripe_payment_intent_id from donations table
ALTER TABLE public.donations DROP COLUMN IF EXISTS stripe_payment_intent_id;

-- Fix 3: Add RLS policies to campaign_donor_stats view
-- Note: This is a VIEW, not a table, so we need to check if RLS can be applied
-- Views inherit RLS from underlying tables, so the donations table RLS already protects it
-- However, we should ensure admins/super_leaders can access it properly

-- Drop and recreate the view with security_invoker to respect RLS
DROP VIEW IF EXISTS public.campaign_donor_stats;

CREATE VIEW public.campaign_donor_stats 
WITH (security_invoker = true)
AS
SELECT 
  d.campaign_id,
  d.user_id,
  SUM(d.amount) as total_donated,
  COUNT(*) as donation_count,
  MAX(d.created_at) as last_donation_date,
  p.full_name
FROM public.donations d
LEFT JOIN public.profiles p ON d.user_id = p.id
WHERE d.status = 'completed'
GROUP BY d.campaign_id, d.user_id, p.full_name;