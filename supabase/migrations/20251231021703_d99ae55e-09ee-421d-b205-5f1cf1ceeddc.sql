-- Remove leader from sermons INSERT policy
DROP POLICY IF EXISTS "Admins leaders and super leaders can create sermons" ON public.sermons;
CREATE POLICY "Admins and super leaders can create sermons" 
ON public.sermons 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

-- Remove leader from sermons UPDATE policy
DROP POLICY IF EXISTS "Admins leaders and super leaders can update sermons" ON public.sermons;
CREATE POLICY "Admins and super leaders can update sermons" 
ON public.sermons 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

-- Remove leader from devotionals INSERT policy
DROP POLICY IF EXISTS "Admins leaders and super leaders can create devotionals" ON public.devotionals;
CREATE POLICY "Admins and super leaders can create devotionals" 
ON public.devotionals 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

-- Remove leader from devotionals UPDATE policy
DROP POLICY IF EXISTS "Admins leaders and super leaders can update devotionals" ON public.devotionals;
CREATE POLICY "Admins and super leaders can update devotionals" 
ON public.devotionals 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));