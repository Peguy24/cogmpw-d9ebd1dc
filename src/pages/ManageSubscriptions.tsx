import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Settings, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ManageSubscriptions() {
  const navigate = useNavigate();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ["recurring-donations"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-recurring-donations");
      
      if (error) throw error;
      return data.subscriptions || [];
    },
  });

  const { data: stripeMode } = useQuery({
    queryKey: ["stripe-mode"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-stripe-mode");
      if (error) throw error;
      return data;
    },
  });

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error("Failed to open subscription management portal");
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const formatInterval = (interval: string) => {
    return interval === "month" ? "Monthly" : "Weekly";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {stripeMode?.isTestMode && (
          <Alert className="bg-amber-50 dark:bg-amber-950/50 border-amber-500 dark:border-amber-600">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Test Mode:</span> You're using Stripe test mode. Use test card <code className="bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded text-xs">4242 4242 4242 4242</code> for testing. No real charges will be made.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/giving")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Recurring Donations</h1>
              <p className="text-muted-foreground">Manage your automatic donations</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>
              Your recurring donations that are currently active
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">${sub.amount.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-medium">{formatInterval(sub.interval)}</span>
                        {sub.cancel_at_period_end && (
                          <Badge variant="destructive" className="ml-2">
                            Canceling
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {sub.metadata?.category && (
                          <span className="font-medium">{sub.metadata.category}</span>
                        )}
                        {sub.metadata?.notes && (
                          <span className="italic"> • {sub.metadata.notes}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Next payment: {new Date(sub.current_period_end).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isOpeningPortal}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {isOpeningPortal ? "Opening Portal..." : "Manage All Subscriptions"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Opens Stripe portal to update payment methods, cancel subscriptions, and more
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No active recurring donations</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/giving")}
                >
                  Set up a recurring donation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
