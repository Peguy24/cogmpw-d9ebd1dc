-- Allow users to delete their own prayer requests
CREATE POLICY "Users can delete their own prayer requests"
ON public.prayer_requests
FOR DELETE
USING (auth.uid() = user_id);