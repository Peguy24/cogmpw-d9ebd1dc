import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CampaignCard } from "@/components/CampaignCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function GivingCampaigns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ["giving-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("giving_campaigns")
        .select("*")
        .eq("is_active", true)
        .order("end_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Real-time updates for campaigns
  useEffect(() => {
    const channel = supabase
      .channel('campaign-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giving_campaigns'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleDonate = (campaignId: string) => {
    sessionStorage.setItem('selectedCampaignId', campaignId);
    navigate("/giving");
  };

  const handleViewDetails = (campaignId: string) => {
    navigate(`/campaign/${campaignId}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Active Campaigns</h1>
            <p className="text-muted-foreground">Support our special giving initiatives</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full" />
              </div>
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDonate={handleDonate}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No active campaigns at the moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
