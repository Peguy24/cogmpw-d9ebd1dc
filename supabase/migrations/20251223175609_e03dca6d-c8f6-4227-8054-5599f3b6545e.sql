-- Add is_pinned column to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Add pinned_at timestamp to track when message was pinned
ALTER TABLE public.chat_messages ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;

-- Add pinned_by to track who pinned the message
ALTER TABLE public.chat_messages ADD COLUMN pinned_by UUID;