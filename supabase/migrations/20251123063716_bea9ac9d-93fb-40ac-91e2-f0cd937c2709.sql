-- Add super_leader to the app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'super_leader' 
    AND enumtypid = 'public.app_role'::regtype
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_leader';
  END IF;
END $$;