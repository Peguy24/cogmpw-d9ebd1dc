-- Add is_approved column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_profiles_is_approved ON public.profiles(is_approved);

-- Update RLS policy to check approval status
CREATE POLICY "Only approved users can access the app"
ON public.profiles
FOR SELECT
USING (is_approved = true OR auth.uid() = id);

-- Approve all existing users (they were created before this feature)
UPDATE public.profiles 
SET is_approved = true 
WHERE is_approved = false;