-- Create table to track guest reminders
CREATE TABLE public.guest_event_reminders_sent (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_email text NOT NULL,
    sent_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_event_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Only system/edge functions can manage this table (using service role)
CREATE POLICY "Only system can manage guest reminders" 
ON public.guest_event_reminders_sent 
FOR ALL 
USING (false);

-- Create unique constraint to prevent duplicate reminders
CREATE UNIQUE INDEX idx_guest_event_reminders_unique 
ON public.guest_event_reminders_sent(event_id, guest_email);