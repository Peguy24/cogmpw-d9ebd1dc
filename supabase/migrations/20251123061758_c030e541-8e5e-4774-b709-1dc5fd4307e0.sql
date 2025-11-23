-- Create prayer_requests table
CREATE TABLE public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_urgent boolean NOT NULL DEFAULT false,
  is_answered boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Members can insert their own prayer requests
CREATE POLICY "Members can create prayer requests"
ON public.prayer_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Members can view their own prayer requests
CREATE POLICY "Users can view their own prayer requests"
ON public.prayer_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all prayer requests
CREATE POLICY "Admins can view all prayer requests"
ON public.prayer_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update prayer requests (to mark as answered)
CREATE POLICY "Admins can update prayer requests"
ON public.prayer_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete prayer requests
CREATE POLICY "Admins can delete prayer requests"
ON public.prayer_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX idx_prayer_requests_user_id ON public.prayer_requests(user_id);
CREATE INDEX idx_prayer_requests_created_at ON public.prayer_requests(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_prayer_requests_updated_at
BEFORE UPDATE ON public.prayer_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();