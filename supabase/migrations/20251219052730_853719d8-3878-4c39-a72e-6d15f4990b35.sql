-- Create trigger to update campaign amount when donation is completed
CREATE TRIGGER update_campaign_on_donation
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_amount();