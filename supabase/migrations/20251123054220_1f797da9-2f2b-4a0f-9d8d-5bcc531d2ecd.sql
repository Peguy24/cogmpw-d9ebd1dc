-- Create audit log table for role changes
CREATE TABLE public.role_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  action text NOT NULL CHECK (action IN ('granted', 'revoked')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_change_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all role change logs"
ON public.role_change_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert logs (no user policy needed, done server-side)
CREATE POLICY "System can insert role change logs"
ON public.role_change_logs
FOR INSERT
WITH CHECK (auth.uid() = changed_by_user_id);

-- Create index for better query performance
CREATE INDEX idx_role_change_logs_target_user ON public.role_change_logs(target_user_id);
CREATE INDEX idx_role_change_logs_changed_by ON public.role_change_logs(changed_by_user_id);
CREATE INDEX idx_role_change_logs_created_at ON public.role_change_logs(created_at DESC);