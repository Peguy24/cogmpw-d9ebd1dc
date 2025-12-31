-- Allow super leaders to update profiles (for approval purposes)
CREATE POLICY "Super leaders can update profiles for approval"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'super_leader'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_leader'::app_role));