-- Drop the problematic policy that allows unauthenticated access
DROP POLICY IF EXISTS "Only approved users can access the app" ON public.profiles;

-- Drop the existing privacy controls policy to recreate it with proper auth requirement
DROP POLICY IF EXISTS "Profiles viewable with privacy controls" ON public.profiles;

-- Create a single, secure SELECT policy that:
-- 1. ALWAYS requires authentication (auth.uid() IS NOT NULL)
-- 2. Users can always see their own profile
-- 3. Other approved profiles are visible with privacy controls respected
CREATE POLICY "Authenticated users can view profiles with privacy controls"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) -- Users can always see their own profile
  OR 
  (
    is_approved = true -- Only show approved profiles to others
    AND (phone_visible = true OR phone IS NULL) -- Respect phone visibility setting
  )
);