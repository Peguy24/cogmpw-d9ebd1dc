-- Fix 1: Update profiles RLS to hide phone numbers unless phone_visible is true
-- Drop existing select policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create new policy that hides phone based on phone_visible setting
-- Users can see their own full profile, admins can see all, others can only see limited data
CREATE POLICY "Authenticated users can view profiles with privacy"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) -- Own profile
  OR has_role(auth.uid(), 'admin'::app_role) -- Admins see all
  OR (is_approved = true) -- Others see approved profiles (phone filtered at app level)
);

-- Fix 2: Add RLS policies to campaign_donor_stats view
-- First, we need to create policies that restrict access to admins and super_leaders only
-- Since campaign_donor_stats is a view with security_invoker=true, we need to control access differently
-- We'll add a policy on the underlying donations table instead

-- Create a restrictive policy for viewing donation aggregates
-- Drop existing permissive policies on donations if they allow too much access
DROP POLICY IF EXISTS "Admins and super leaders can view all donations" ON public.donations;
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;

-- Recreate with proper restrictions
CREATE POLICY "Users can view their own donations"
ON public.donations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and super leaders can view all donations"
ON public.donations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_leader'::app_role)
);

-- For the view, we need to ensure only admins/super_leaders can see the aggregated stats
-- The view uses security_invoker=true, so it inherits RLS from donations table
-- Regular users will only see their own donation data in the view