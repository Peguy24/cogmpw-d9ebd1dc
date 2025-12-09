import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Settings, AlertCircle, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManageSubscriptions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

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

  const cancelMutation = useMutation({
    mutationFn: async ({ subscriptionId, cancelImmediately }: { subscriptionId: string; cancelImmediately: boolean }) => {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { subscriptionId, cancelImmediately },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.subscription.cancel_at_period_end) {
        toast.success("Subscription will be canceled at the end of the billing period");
      } else {
        toast.success("Subscription canceled successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["recurring-donations"] });
      setCancelDialogOpen(false);
      setSelectedSubscription(null);
    },
    onError: (error: any) => {
      console.error("Error canceling subscription:", error);
      toast.error(error.message || "Failed to cancel subscription");
    },
  });

  const handleCancelClick = (sub: any) => {
    setSelectedSubscription(sub);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = (cancelImmediately: boolean) => {
    if (selectedSubscription) {
      cancelMutation.mutate({ 
        subscriptionId: selectedSubscription.id, 
        cancelImmediately 
      });
    }
  };

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
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {sub.metadata?.category ? (
                          <span className="font-medium">{sub.metadata.category}</span>
                        ) : sub.product_name ? (
                          <span className="font-medium">{sub.product_name}</span>
                        ) : (
                          <span className="font-medium">Recurring Donation</span>
                        )}
                        {sub.metadata?.notes && (
                          <span className="italic"> • {sub.metadata.notes}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sub.cancel_at_period_end ? (
                          <>Ends: {new Date(sub.current_period_end).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}</>
                        ) : (
                          <>Next payment: {new Date(sub.current_period_end).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}</>
                        )}
                      </div>
                    </div>
                    {!sub.cancel_at_period_end && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelClick(sub)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isOpeningPortal}
                    variant="outline"
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {isOpeningPortal ? "Opening Portal..." : "Update Payment Method"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Opens Stripe portal to update payment methods
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Recurring Donation</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to cancel this {selectedSubscription?.amount?.toFixed(2)} {formatInterval(selectedSubscription?.interval || 'month').toLowerCase()} donation?
              </p>
              <p className="text-sm">
                You can cancel at the end of your current billing period, or cancel immediately.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep Donation
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleConfirmCancel(false)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Cancel at Period End
            </Button>
            <AlertDialogAction
              onClick={() => handleConfirmCancel(true)}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Cancel Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
