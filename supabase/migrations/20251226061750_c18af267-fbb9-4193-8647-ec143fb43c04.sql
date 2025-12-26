-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a new SELECT policy that allows admins to view all profiles (including unapproved ones)
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  (is_approved = true) OR 
  has_role(auth.uid(), 'admin')
);