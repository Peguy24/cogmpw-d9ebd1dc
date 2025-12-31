-- Create a security definer function to check if a user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND is_approved = true
  )
$$;

-- Fix the profiles SELECT policy to avoid infinite recursion
DROP POLICY IF EXISTS "Authenticated users can view profiles with privacy" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles with privacy" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (is_approved = true AND public.is_user_approved(auth.uid()))
);