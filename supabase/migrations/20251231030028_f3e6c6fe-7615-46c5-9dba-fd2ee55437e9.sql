-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can view profiles with privacy" ON public.profiles;

-- Create new policy that allows super_leaders to also view unapproved profiles
CREATE POLICY "Authenticated users can view profiles with privacy" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_leader'::app_role)
  OR ((is_approved = true) AND is_user_approved(auth.uid()))
);