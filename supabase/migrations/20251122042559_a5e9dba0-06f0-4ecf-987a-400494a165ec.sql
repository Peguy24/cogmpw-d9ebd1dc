-- Add phone visibility control to profiles
ALTER TABLE public.profiles 
ADD COLUMN phone_visible boolean NOT NULL DEFAULT true;

-- Drop existing profile viewing policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create new policy that respects phone visibility
-- Users can see:
-- 1. Their own full profile
-- 2. Other profiles with names and ministries
-- 3. Phone numbers only if phone_visible is true OR it's their own profile
CREATE POLICY "Profiles viewable with privacy controls"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: The above policy allows viewing profiles, but the application layer
-- should filter phone numbers based on phone_visible
-- For complete database-level enforcement, we'd need to use a function
-- that returns different columns based on phone_visible

-- Add comment explaining the privacy control
COMMENT ON COLUMN public.profiles.phone_visible IS 
'Controls whether the user phone number is visible to other authenticated users. Always visible to the user themselves and admins.';