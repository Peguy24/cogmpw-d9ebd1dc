-- Add visibility field to events table
ALTER TABLE public.events 
ADD COLUMN visibility text NOT NULL DEFAULT 'member' 
CHECK (visibility IN ('guest', 'member', 'both'));

-- Update RLS policies for events to allow guest access
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.events;

CREATE POLICY "Events viewable based on visibility"
ON public.events
FOR SELECT
USING (
  CASE 
    WHEN visibility = 'guest' THEN true
    WHEN visibility = 'member' THEN auth.uid() IS NOT NULL
    WHEN visibility = 'both' THEN true
  END
);

-- Update RLS policy for livestream_links to allow public access
DROP POLICY IF EXISTS "Livestream links viewable by authenticated users" ON public.livestream_links;

CREATE POLICY "Livestream links viewable by everyone"
ON public.livestream_links
FOR SELECT
USING (true);

-- Update donations table to allow guest donations
ALTER TABLE public.donations 
ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can create their own donations" ON public.donations;

CREATE POLICY "Anyone can create donations"
ON public.donations
FOR INSERT
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
    ELSE user_id IS NULL
  END
);