-- Create a table to track sent event reminders
CREATE TABLE IF NOT EXISTS public.event_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Only admins can manage reminder tracking
CREATE POLICY "Only system can manage reminders"
ON public.event_reminders_sent
FOR ALL
USING (false);

-- Add index for performance
CREATE INDEX idx_event_reminders_event_id ON public.event_reminders_sent(event_id);
CREATE INDEX idx_event_reminders_user_id ON public.event_reminders_sent(user_id);