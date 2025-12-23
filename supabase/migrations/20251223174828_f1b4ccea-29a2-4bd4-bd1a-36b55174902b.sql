-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true);

-- Add media columns to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN media_url text,
ADD COLUMN media_type text;

-- Storage policies for chat media
CREATE POLICY "Approved members can upload chat media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_approved = true
  )
);

CREATE POLICY "Anyone can view chat media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Users can delete own chat media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);