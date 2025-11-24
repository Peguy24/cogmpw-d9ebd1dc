import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Target, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface CampaignCardProps {
  campaign: {
    id: string;
    title: string;
    description: string;
    target_amount: number;
    current_amount: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
  };
  onDonate?: (campaignId: string) => void;
  onViewDetails?: (campaignId: string) => void;
}

export const CampaignCard = ({ campaign, onDonate, onViewDetails }: CampaignCardProps) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endDate = new Date(campaign.end_date).getTime();
      const distance = endDate - now;

      if (distance < 0) {
        setIsExpired(true);
        setTimeLeft("Campaign ended");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days} day${days !== 1 ? 's' : ''} left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours !== 1 ? 's' : ''} left`);
      } else {
        setTimeLeft(`${minutes} minute${minutes !== 1 ? 's' : ''} left`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [campaign.end_date]);

  const progress = (campaign.current_amount / campaign.target_amount) * 100;
  const isComplete = progress >= 100;
  
  // Get the latest milestone reached
  const getMilestone = () => {
    if (progress >= 100) return { label: "Goal Reached!", variant: "milestone" as const, icon: "🎉" };
    if (progress >= 75) return { label: "75% Funded", variant: "secondary" as const, icon: "⭐" };
    if (progress >= 50) return { label: "50% Funded", variant: "secondary" as const, icon: "🚀" };
    if (progress >= 25) return { label: "25% Funded", variant: "secondary" as const, icon: "🎯" };
    return null;
  };
  
  const milestone = getMilestone();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in">
      <CardHeader className="space-y-2 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <CardTitle className="text-base md:text-xl break-words">{campaign.title}</CardTitle>
          <div className="flex flex-wrap gap-1">
            {isComplete && (
              <Badge variant="default" className="bg-green-500 text-xs">
                <Target className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {!isExpired && campaign.is_active && !isComplete && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="text-xs">Ended</Badge>
            )}
            {milestone && !isComplete && (
              <Badge variant={milestone.variant} className="text-xs">
                {milestone.icon} {milestone.label}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-xs md:text-sm break-words">{campaign.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
        <div className="space-y-2">
          <div className="flex justify-between text-xs md:text-sm">
            <span className="font-semibold text-primary">
              ${campaign.current_amount.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              of ${campaign.target_amount.toLocaleString()} goal
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2 md:h-3" />
          <div className="text-xs md:text-sm font-medium text-center">
            {progress.toFixed(1)}% funded
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{timeLeft}</span>
          </div>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(campaign.id)}
              className="hover-scale min-h-[44px] text-xs md:text-sm w-full sm:w-auto"
            >
              <Users className="h-4 w-4 mr-1" />
              View Details
            </Button>
          )}
        </div>

        {onDonate && !isExpired && campaign.is_active && !isComplete && (
          <Button
            className="w-full min-h-[44px] text-sm md:text-base"
            onClick={() => onDonate(campaign.id)}
          >
            Donate to Campaign
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
