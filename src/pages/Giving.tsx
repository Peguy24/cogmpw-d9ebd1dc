import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DonationForm } from "@/components/DonationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, History, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CampaignCard } from "@/components/CampaignCard";

const Giving = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: activeCampaigns } = useQuery({
    queryKey: ["active-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("giving_campaigns")
        .select("*")
        .eq("is_active", true)
        .gt("end_date", new Date().toISOString())
        .order("end_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const donationStatus = searchParams.get("donation");
    const subscriptionStatus = searchParams.get("subscription");
    
    if (donationStatus === "success") {
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
      navigate("/giving", { replace: true });
    } else if (donationStatus === "canceled") {
      toast.info("Donation canceled");
      navigate("/giving", { replace: true });
    } else if (subscriptionStatus === "success") {
      toast.success("Recurring donation set up successfully!");
      navigate("/giving", { replace: true });
    } else if (subscriptionStatus === "canceled") {
      toast.info("Subscription setup canceled");
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/manage-subscriptions")}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recurring
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/giving-history")}
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
          </div>
        </div>

        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold">Online Giving</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." - 2 Corinthians 9:7
          </p>
        </div>

        {activeCampaigns && activeCampaigns.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Active Campaigns
                  </CardTitle>
                  <CardDescription>Support our special giving initiatives</CardDescription>
                </div>
                <Button variant="outline" onClick={() => navigate("/campaigns")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {activeCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onDonate={(id) => {
                      sessionStorage.setItem('selectedCampaignId', id);
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                    onViewDetails={(id) => navigate(`/campaign/${id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <DonationForm />
      </div>
    </div>
  );
};

export default Giving;
