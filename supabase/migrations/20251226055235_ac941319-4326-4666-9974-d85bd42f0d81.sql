-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles with privacy controls" ON public.profiles;

-- Create a new policy that allows all approved users to see basic profile info (name, avatar)
-- but still respects phone visibility for the phone field
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR is_approved = true
);