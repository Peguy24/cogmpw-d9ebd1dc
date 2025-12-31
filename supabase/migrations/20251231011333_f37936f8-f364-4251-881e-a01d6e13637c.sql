-- Add DELETE policy for admins to hard delete messages
CREATE POLICY "Admins can hard delete messages" 
ON public.chat_messages 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));