-- Create giving campaigns table
CREATE TABLE public.giving_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add campaign_id to donations table
ALTER TABLE public.donations 
ADD COLUMN campaign_id UUID REFERENCES public.giving_campaigns(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.giving_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for giving_campaigns
CREATE POLICY "Campaigns viewable by authenticated users"
  ON public.giving_campaigns
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and leaders can create campaigns"
  ON public.giving_campaigns
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Admins and leaders can update campaigns"
  ON public.giving_campaigns
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Admins can delete campaigns"
  ON public.giving_campaigns
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update campaign amount when donation is made
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE public.giving_campaigns
    SET current_amount = current_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating campaign amount
CREATE TRIGGER update_campaign_amount_trigger
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_amount();

-- Create view for campaign leaderboards
CREATE OR REPLACE VIEW campaign_donor_stats AS
SELECT 
  d.campaign_id,
  d.user_id,
  p.full_name,
  SUM(d.amount) as total_donated,
  COUNT(d.id) as donation_count,
  MAX(d.created_at) as last_donation_date
FROM public.donations d
JOIN public.profiles p ON d.user_id = p.id
WHERE d.campaign_id IS NOT NULL AND d.status = 'completed'
GROUP BY d.campaign_id, d.user_id, p.full_name;

-- Enable realtime for campaigns
ALTER PUBLICATION supabase_realtime ADD TABLE public.giving_campaigns;