-- Create church_info table to store service times and contact information
CREATE TABLE public.church_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  label text,
  category text NOT NULL,
  sort_order integer DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.church_info ENABLE ROW LEVEL SECURITY;

-- Anyone can view church info
CREATE POLICY "Church info viewable by everyone" 
ON public.church_info 
FOR SELECT 
USING (true);

-- Only admins can manage church info
CREATE POLICY "Admins can manage church info" 
ON public.church_info 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_church_info_updated_at
BEFORE UPDATE ON public.church_info
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default service times
INSERT INTO public.church_info (key, value, label, category, sort_order) VALUES
('sunday_worship', '10:00 AM', 'Sunday Worship', 'service_times', 1),
('wednesday_bible_study', '7:00 PM', 'Wednesday Bible Study', 'service_times', 2),
('friday_prayer', '7:00 PM', 'Friday Prayer Meeting', 'service_times', 3);

-- Insert default contact info
INSERT INTO public.church_info (key, value, label, category, sort_order) VALUES
('location', 'Paris West, France', 'Location', 'contact', 1),
('phone', 'Contact church office', 'Phone', 'contact', 2),
('email', 'info@cogmpw.org', 'Email', 'contact', 3);