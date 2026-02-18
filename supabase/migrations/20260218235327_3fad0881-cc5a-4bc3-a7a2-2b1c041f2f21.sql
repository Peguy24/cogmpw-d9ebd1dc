UPDATE storage.buckets 
SET allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE id IN ('news-media', 'event-media');