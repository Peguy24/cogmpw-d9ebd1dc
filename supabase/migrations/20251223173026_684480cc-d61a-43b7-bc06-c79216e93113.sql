-- Create chat messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Approved members can view non-deleted messages
CREATE POLICY "Approved members can view messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_approved = true
  )
  AND (is_deleted = false OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- Approved members can send messages
CREATE POLICY "Approved members can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_approved = true
  )
);

-- Users can delete their own messages, admins can delete any
CREATE POLICY "Users and admins can delete messages"
ON public.chat_messages
FOR UPDATE
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create index for faster queries
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);