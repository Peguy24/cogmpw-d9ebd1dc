-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'news', 'event', 'sermon', 'devotional'
  related_id UUID, -- ID of the news/event/sermon/devotional
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System/admins can insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'leader'));

-- Add index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;