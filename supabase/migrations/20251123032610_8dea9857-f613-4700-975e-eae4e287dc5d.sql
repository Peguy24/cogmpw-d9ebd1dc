-- Add visibility column to devotionals table
ALTER TABLE public.devotionals
ADD COLUMN visibility text NOT NULL DEFAULT 'member' CHECK (visibility IN ('guest', 'member', 'both'));

-- Add visibility column to sermons table
ALTER TABLE public.sermons
ADD COLUMN visibility text NOT NULL DEFAULT 'member' CHECK (visibility IN ('guest', 'member', 'both'));

-- Update RLS policy for devotionals to respect visibility
DROP POLICY IF EXISTS "Devotionals viewable by authenticated users" ON public.devotionals;
CREATE POLICY "Devotionals viewable based on visibility" ON public.devotionals
FOR SELECT USING (
  CASE
    WHEN visibility = 'guest' THEN true
    WHEN visibility = 'member' THEN auth.uid() IS NOT NULL
    WHEN visibility = 'both' THEN true
  END
);

-- Update RLS policy for sermons to respect visibility
DROP POLICY IF EXISTS "Sermons viewable by authenticated users" ON public.sermons;
CREATE POLICY "Sermons viewable based on visibility" ON public.sermons
FOR SELECT USING (
  CASE
    WHEN visibility = 'guest' THEN true
    WHEN visibility = 'member' THEN auth.uid() IS NOT NULL
    WHEN visibility = 'both' THEN true
  END
);