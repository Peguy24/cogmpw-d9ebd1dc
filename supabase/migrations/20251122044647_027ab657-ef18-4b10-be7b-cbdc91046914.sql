-- Create sermons table for video/audio/PDF content
CREATE TABLE public.sermons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sermon_date TIMESTAMP WITH TIME ZONE NOT NULL,
  speaker TEXT,
  media_type TEXT NOT NULL, -- 'video', 'audio', or 'pdf'
  media_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create devotionals table
CREATE TABLE public.devotionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  devotional_date DATE NOT NULL,
  scripture_reference TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create livestream_links table
CREATE TABLE public.livestream_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- 'youtube', 'facebook', 'custom'
  url TEXT NOT NULL,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestream_links ENABLE ROW LEVEL SECURITY;

-- Sermons policies
CREATE POLICY "Sermons viewable by authenticated users"
ON public.sermons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and leaders can create sermons"
ON public.sermons FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Admins and leaders can update sermons"
ON public.sermons FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Admins can delete sermons"
ON public.sermons FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Devotionals policies
CREATE POLICY "Devotionals viewable by authenticated users"
ON public.devotionals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and leaders can create devotionals"
ON public.devotionals FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Admins and leaders can update devotionals"
ON public.devotionals FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Admins can delete devotionals"
ON public.devotionals FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Livestream policies
CREATE POLICY "Livestream links viewable by authenticated users"
ON public.livestream_links FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and leaders can manage livestream"
ON public.livestream_links FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

-- Create storage bucket for sermon media
INSERT INTO storage.buckets (id, name, public)
VALUES ('sermon-media', 'sermon-media', true);

-- Storage policies for sermon media
CREATE POLICY "Sermon media viewable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'sermon-media');

CREATE POLICY "Admins and leaders can upload sermon media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sermon-media' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role))
);

CREATE POLICY "Admins and leaders can update sermon media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sermon-media' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role))
);

CREATE POLICY "Admins can delete sermon media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sermon-media' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Triggers for updated_at
CREATE TRIGGER update_sermons_updated_at
BEFORE UPDATE ON public.sermons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_devotionals_updated_at
BEFORE UPDATE ON public.devotionals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_livestream_links_updated_at
BEFORE UPDATE ON public.livestream_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();