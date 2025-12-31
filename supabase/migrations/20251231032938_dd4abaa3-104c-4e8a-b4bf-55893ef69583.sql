-- Create guest_event_rsvps table for non-member registrations
CREATE TABLE public.guest_event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone can register as guest (public insert)
CREATE POLICY "Anyone can register as guest for events"
ON public.guest_event_rsvps
FOR INSERT
WITH CHECK (true);

-- Only admins, leaders, super_leaders can view guest RSVPs
CREATE POLICY "Admins and leaders can view guest RSVPs"
ON public.guest_event_rsvps
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'leader'::app_role) OR 
  has_role(auth.uid(), 'super_leader'::app_role)
);

-- Admins can delete guest RSVPs
CREATE POLICY "Admins can delete guest RSVPs"
ON public.guest_event_rsvps
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_guest_event_rsvps_event_id ON public.guest_event_rsvps(event_id);