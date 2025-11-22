import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Target, Trophy, Users, Award, Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");
  const [isLive, setIsLive] = useState(false);

  const { data: campaign, isLoading, refetch: refetchCampaign } = useQuery({
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

  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
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

    setIsLive(true);

    const channel = supabase
      .channel(`campaign-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'giving_campaigns',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Campaign updated:', payload);
          const oldAmount = Number(payload.old.current_amount);
          const newAmount = Number(payload.new.current_amount);
          
          if (newAmount > oldAmount) {
            const increase = newAmount - oldAmount;
            toast.success(
              `New donation received: $${increase.toFixed(2)}`,
              {
                duration: 4000,
                icon: '🎉'
              }
            );
          }
          
          refetchCampaign();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: `campaign_id=eq.${id}`
        },
        () => {
          console.log('New donation for this campaign');
          refetchCampaign();
          refetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [id, refetchCampaign, refetchLeaderboard]);

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
  
  // Calculate milestones
  const milestones = [
    { percentage: 25, message: "Great start! 25% funded!", icon: "🎯" },
    { percentage: 50, message: "Halfway there! 50% funded!", icon: "🚀" },
    { percentage: 75, message: "Almost there! 75% funded!", icon: "⭐" },
    { percentage: 100, message: "Goal reached! Thank you!", icon: "🎉" },
  ];
  
  const activeMilestones = milestones.filter(m => progress >= m.percentage);
  const latestMilestone = activeMilestones[activeMilestones.length - 1];
  
  // Get badge variant for donor ranking
  const getRankBadge = (index: number) => {
    if (index === 0) return { variant: "gold" as const, label: "🥇 Top Donor" };
    if (index === 1) return { variant: "silver" as const, label: "🥈 2nd Place" };
    if (index === 2) return { variant: "bronze" as const, label: "🥉 3rd Place" };
    return null;
  };

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
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl">{campaign.title}</CardTitle>
                  {isLive && (
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 animate-pulse">
                      <Radio className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>
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
            
            {latestMilestone && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800 animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{latestMilestone.icon}</span>
                  <div>
                    <Badge variant="milestone" className="mb-1">
                      Milestone Reached!
                    </Badge>
                    <p className="text-sm font-semibold text-foreground">
                      {latestMilestone.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
              <>
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Thank You to Our Generous Donors! 🙏</h3>
                      <p className="text-sm text-muted-foreground">
                        Your support makes a real difference in our mission. Every contribution brings us closer to our goal and impacts lives in meaningful ways.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {leaderboard.map((donor, index) => {
                    const rankBadge = getRankBadge(index);
                    return (
                      <div
                        key={donor.user_id}
                        className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-all animate-fade-in ${
                          rankBadge ? 'border-2 border-primary/30 bg-primary/5' : ''
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                                {donor.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {index < 3 && (
                              <div className="absolute -top-1 -right-1 text-xl">
                                {index === 0 && '🥇'}
                                {index === 1 && '🥈'}
                                {index === 2 && '🥉'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold">{donor.full_name || 'Anonymous'}</div>
                              {rankBadge && (
                                <Badge variant={rankBadge.variant} className="text-xs">
                                  {rankBadge.label}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {donor.donation_count} donation{donor.donation_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">
                            ${Number(donor.total_donated).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
