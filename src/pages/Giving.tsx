import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DonationForm } from "@/components/DonationForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Giving = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const donationStatus = searchParams.get("donation");
    
    if (donationStatus === "success") {
      // Record the donation
      const sessionId = sessionStorage.getItem('pendingDonationSession');
      if (sessionId) {
        supabase.functions.invoke("record-donation", {
          body: { sessionId },
        }).then(({ error }) => {
          if (error) {
            console.error("Error recording donation:", error);
            toast.error("Payment received but failed to record. Please contact support.");
          } else {
            toast.success("Thank you for your generous donation!");
            sessionStorage.removeItem('pendingDonationSession');
          }
        });
      } else {
        toast.success("Thank you for your generous donation!");
      }
      
      // Clear the URL params
      navigate("/giving", { replace: true });
    } else if (donationStatus === "canceled") {
      toast.info("Donation canceled");
      navigate("/giving", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/giving-history")}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>

        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold">Online Giving</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." - 2 Corinthians 9:7
          </p>
        </div>

        <DonationForm />
      </div>
    </div>
  );
};

export default Giving;
