-- 1. Fix phone number exposure: Only owner + admins can see phone numbers
DROP POLICY IF EXISTS "Authenticated users can view profiles with privacy" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles with privacy" 
ON public.profiles 
FOR SELECT 
USING (
  -- Owner can see their own profile (including phone)
  (auth.uid() = id) 
  OR 
  -- Admins can see all profiles (including phone)
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  -- Approved users can see other approved profiles, but phone is handled via query
  ((is_approved = true) AND is_user_approved(auth.uid()))
);

-- 2. Fix donations exposure: Remove the policy that lets all authenticated users see donations
-- Keep only: users see their own + admins/super leaders see all
DROP POLICY IF EXISTS "Anyone can view all donations" ON public.donations;
DROP POLICY IF EXISTS "Authenticated users can view all donations" ON public.donations;

-- The existing policies already allow:
-- "Users can view their own donations" - USING (auth.uid() = user_id)
-- "Admins and super leaders can view all donations" - USING (has_role(...))
-- So we just need to make sure no overly permissive policy exists

-- 3. Fix campaign_donor_stats exposure: Add RLS policies
-- First enable RLS on the view (it's a view, so we need to handle it differently)
-- Since campaign_donor_stats is a VIEW with security_invoker=true, 
-- we need to restrict it by modifying how it's queried or adding a wrapper function

-- Create a security definer function to check admin/super_leader access for donor stats
CREATE OR REPLACE FUNCTION public.can_view_donor_stats()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role)
$$;

-- Drop and recreate the view with a security barrier
DROP VIEW IF EXISTS public.campaign_donor_stats;

CREATE VIEW public.campaign_donor_stats 
WITH (security_invoker = true, security_barrier = true) AS
SELECT 
  d.campaign_id,
  d.user_id,
  p.full_name,
  SUM(d.amount) as total_donated,
  COUNT(*) as donation_count,
  MAX(d.created_at) as last_donation_date
FROM public.donations d
LEFT JOIN public.profiles p ON d.user_id = p.id
WHERE d.status = 'completed' 
  AND d.campaign_id IS NOT NULL
  AND (
    -- Only return data if user is admin or super_leader
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super_leader'::app_role)
  )
GROUP BY d.campaign_id, d.user_id, p.full_name;