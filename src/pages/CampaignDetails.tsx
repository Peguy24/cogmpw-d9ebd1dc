import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Target, Trophy, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("giving_campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["campaign-leaderboard", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_donor_stats")
        .select("*")
        .eq("campaign_id", id)
        .order("total_donated", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Real-time updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`campaign-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'giving_campaigns',
          filter: `id=eq.${id}`
        },
        () => {
          // Refetch handled by React Query
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!campaign) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endDate = new Date(campaign.end_date).getTime();
      const distance = endDate - now;

      if (distance < 0) {
        setTimeLeft("Campaign ended");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setTimeLeft(`${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} remaining`);
      } else {
        setTimeLeft(`${hours} hour${hours !== 1 ? 's' : ''} remaining`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [campaign]);

  const handleDonate = () => {
    if (campaign) {
      sessionStorage.setItem('selectedCampaignId', campaign.id);
      navigate("/giving");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Campaign not found</p>
          <Button onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const progress = (campaign.current_amount / campaign.target_amount) * 100;
  const isComplete = progress >= 100;
  const isExpired = new Date(campaign.end_date) < new Date();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate("/campaigns")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl">{campaign.title}</CardTitle>
                <CardDescription className="text-base">{campaign.description}</CardDescription>
              </div>
              {isComplete && (
                <Badge variant="default" className="bg-green-500">
                  <Target className="h-4 w-4 mr-1" />
                  Goal Reached!
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Raised</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${campaign.current_amount.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Goal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${campaign.target_amount.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Time Left
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {timeLeft}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <Progress value={Math.min(progress, 100)} className="h-4" />
              <div className="text-center text-sm font-medium">
                {progress.toFixed(1)}% of goal reached
              </div>
            </div>

            {!isExpired && campaign.is_active && !isComplete && (
              <Button onClick={handleDonate} size="lg" className="w-full">
                Donate Now
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Donors
            </CardTitle>
            <CardDescription>Thank you to our generous supporters</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-4">
                {leaderboard.map((donor, index) => (
                  <div
                    key={donor.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{donor.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {donor.donation_count} donation{donor.donation_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      ${Number(donor.total_donated).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No donations yet. Be the first to contribute!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
