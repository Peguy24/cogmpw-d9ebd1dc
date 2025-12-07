-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Profiles viewable with privacy controls" ON public.profiles;

-- Create a secure policy that requires authentication
CREATE POLICY "Profiles viewable with privacy controls" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (auth.uid() = id) OR
    (is_approved = true AND (phone_visible = true OR phone IS NULL))
  )
);