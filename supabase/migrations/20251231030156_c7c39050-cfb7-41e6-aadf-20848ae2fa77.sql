-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can delete unapproved profiles" ON public.profiles;

-- Create new policy that allows both admins and super_leaders to delete unapproved profiles
CREATE POLICY "Admins and super leaders can delete unapproved profiles" 
ON public.profiles 
FOR DELETE 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role))
  AND (is_approved = false)
);