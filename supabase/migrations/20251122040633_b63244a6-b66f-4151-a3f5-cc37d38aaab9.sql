-- Create storage buckets for news and event media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('news-media', 'news-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']),
  ('event-media', 'event-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);

-- Add media_url column to news table
ALTER TABLE public.news 
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video'));

-- Add media_url column to events table
ALTER TABLE public.events 
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video'));

-- Storage policies for news-media bucket
CREATE POLICY "Authenticated users can view news media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'news-media');

CREATE POLICY "Admins and leaders can upload news media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'news-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'leader')
    )
  )
);

CREATE POLICY "Admins and leaders can delete news media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'news-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'leader')
    )
  )
);

-- Storage policies for event-media bucket
CREATE POLICY "Authenticated users can view event media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-media');

CREATE POLICY "Admins and leaders can upload event media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'leader')
    )
  )
);

CREATE POLICY "Admins and leaders can delete event media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'leader')
    )
  )
);