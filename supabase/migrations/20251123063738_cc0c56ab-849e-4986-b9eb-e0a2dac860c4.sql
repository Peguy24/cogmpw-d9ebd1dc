-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can view all prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Admins can update prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Admins can delete prayer requests" ON public.prayer_requests;

-- Create new policies that include super_leader role
CREATE POLICY "Admins and super leaders can view all prayer requests"
ON public.prayer_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_leader'::app_role)
);

CREATE POLICY "Admins and super leaders can update prayer requests"
ON public.prayer_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_leader'::app_role)
);

CREATE POLICY "Admins and super leaders can delete prayer requests"
ON public.prayer_requests
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_leader'::app_role)
);