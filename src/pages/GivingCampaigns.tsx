import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CampaignCard } from "@/components/CampaignCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function GivingCampaigns() {
  const navigate = useNavigate();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

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
    setIsLive(true);
    
    const channel = supabase
      .channel('campaign-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'giving_campaigns'
        },
        (payload) => {
          console.log('Campaign updated:', payload);
          const oldAmount = Number(payload.old.current_amount);
          const newAmount = Number(payload.new.current_amount);
          
          if (newAmount > oldAmount && payload.new.is_active) {
            const increase = newAmount - oldAmount;
            toast.success(
              `"${payload.new.title}" received $${increase.toFixed(2)}`,
              {
                duration: 4000,
                icon: '📈'
              }
            );
          }
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
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
    <div className="min-h-screen bg-background p-3 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-2xl md:text-3xl font-bold">Active Campaigns</h1>
              {isLive && (
                <Badge variant="outline" className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 animate-pulse text-xs">
                  <Radio className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs md:text-sm">Support our special giving initiatives</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full" />
              </div>
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <p className="text-muted-foreground text-sm">No active campaigns at the moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
