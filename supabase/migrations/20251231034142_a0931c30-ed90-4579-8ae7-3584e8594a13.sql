-- Create table for member check-ins
CREATE TABLE public.event_checkins (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    checked_in_by uuid NOT NULL,
    checked_in_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- Admins, leaders, and super leaders can manage check-ins
CREATE POLICY "Leaders can manage member check-ins" 
ON public.event_checkins 
FOR ALL 
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'leader'::app_role) OR 
    has_role(auth.uid(), 'super_leader'::app_role)
);

-- Create table for guest check-ins
CREATE TABLE public.guest_event_checkins (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_rsvp_id uuid NOT NULL REFERENCES public.guest_event_rsvps(id) ON DELETE CASCADE,
    checked_in_by uuid NOT NULL,
    checked_in_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(event_id, guest_rsvp_id)
);

-- Enable RLS
ALTER TABLE public.guest_event_checkins ENABLE ROW LEVEL SECURITY;

-- Admins, leaders, and super leaders can manage guest check-ins
CREATE POLICY "Leaders can manage guest check-ins" 
ON public.guest_event_checkins 
FOR ALL 
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'leader'::app_role) OR 
    has_role(auth.uid(), 'super_leader'::app_role)
);