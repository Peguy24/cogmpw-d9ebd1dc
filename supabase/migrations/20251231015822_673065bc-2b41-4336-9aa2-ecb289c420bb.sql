-- Update news policies to include super_leader
DROP POLICY IF EXISTS "Admins and leaders can create news" ON public.news;
CREATE POLICY "Admins leaders and super leaders can create news" 
ON public.news 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

DROP POLICY IF EXISTS "Admins and leaders can update news" ON public.news;
CREATE POLICY "Admins leaders and super leaders can update news" 
ON public.news 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

-- Update events policies to include super_leader
DROP POLICY IF EXISTS "Admins and leaders can create events" ON public.events;
CREATE POLICY "Admins leaders and super leaders can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

DROP POLICY IF EXISTS "Admins and leaders can update events" ON public.events;
CREATE POLICY "Admins leaders and super leaders can update events" 
ON public.events 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

-- Update sermons policies to include super_leader
DROP POLICY IF EXISTS "Admins and leaders can create sermons" ON public.sermons;
CREATE POLICY "Admins leaders and super leaders can create sermons" 
ON public.sermons 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

DROP POLICY IF EXISTS "Admins and leaders can update sermons" ON public.sermons;
CREATE POLICY "Admins leaders and super leaders can update sermons" 
ON public.sermons 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

-- Update devotionals policies to include super_leader
DROP POLICY IF EXISTS "Admins and leaders can create devotionals" ON public.devotionals;
CREATE POLICY "Admins leaders and super leaders can create devotionals" 
ON public.devotionals 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));

DROP POLICY IF EXISTS "Admins and leaders can update devotionals" ON public.devotionals;
CREATE POLICY "Admins leaders and super leaders can update devotionals" 
ON public.devotionals 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role) OR has_role(auth.uid(), 'super_leader'::app_role));