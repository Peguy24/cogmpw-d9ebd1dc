-- Allow admins to delete unapproved profiles (for rejection)
CREATE POLICY "Admins can delete unapproved profiles" 
ON public.profiles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin') AND is_approved = false
);