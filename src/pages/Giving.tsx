import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DonationForm } from "@/components/DonationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, History, RefreshCw, Target, CheckCircle, Mail, Download, AlertCircle, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CampaignCard } from "@/components/CampaignCard";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { setPaymentLoading } from "@/hooks/usePaymentLoading";

const openCheckoutUrl = async (url: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      setPaymentLoading(true);
      await Browser.open({ url, windowName: '_system' });
    } else {
      const isInIframe = window !== window.parent;
      if (isInIframe) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }
  } catch (error) {
    console.error("Failed to open checkout URL:", error);
    setPaymentLoading(false);
    toast.error("Unable to open the donation page. Please try again.");
  }
};

const Giving = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [donationDetails, setDonationDetails] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Campaign donation dialog state
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignAmount, setCampaignAmount] = useState("");
  
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);

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

  const { data: stripeMode } = useQuery({
    queryKey: ["stripe-mode"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-stripe-mode");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const donationStatus = searchParams.get("donation");
    const subscriptionStatus = searchParams.get("subscription");
    
    if (donationStatus === "success") {
      // Always use session_id from URL first - this is the most reliable source
      // sessionStorage may be lost if user opened in new tab or different browser context
      const sessionIdFromUrl = searchParams.get("session_id");
      const sessionIdFromStorage = sessionStorage.getItem("pendingDonationSession");
      const sessionId = sessionIdFromUrl || sessionIdFromStorage;
      
      console.log("[Giving] Recording donation", { 
        sessionIdFromUrl, 
        sessionIdFromStorage, 
        usingSessionId: sessionId 
      });
      
      if (sessionId) {
        // Record donation - this now works for both authenticated and guest users
        supabase.functions.invoke("record-donation", {
          body: { sessionId },
        }).then(async ({ data, error }) => {
          if (error) {
            console.error("Error recording donation:", error);
            // Don't show error for already-recorded donations
            if (!error.message?.includes("already")) {
              toast.error("Payment received but failed to record. Please contact support.");
            }
          } else {
            console.log("[Giving] Donation recorded successfully", data);
            
            // Refresh campaigns so progress bars update
            queryClient.invalidateQueries({ queryKey: ["active-campaigns"] });

            // Try to fetch the recorded donation details (only works for authenticated users)
            if (data?.paymentIntentId) {
              const { data: donations, error: fetchError } = await supabase
                .from("donations")
                .select("*, user_id")
                .eq("stripe_payment_intent_id", data.paymentIntentId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (!fetchError && donations) {
                setDonationDetails(donations);
                setShowReceiptDialog(true);
              } else {
                // Guest donation or fetch failed - still show success
                toast.success("Thank you for your generous donation!");
              }
            } else {
              toast.success("Thank you for your generous donation!");
            }
            
            sessionStorage.removeItem("pendingDonationSession");
          }
          // Navigate after recording is complete
          navigate("/giving", { replace: true });
        });
      } else {
        console.warn("[Giving] No session ID found for donation success");
        toast.success("Thank you for your generous donation!");
        navigate("/giving", { replace: true });
      }
    } else if (donationStatus === "canceled") {
      toast.info("Donation canceled");
      navigate("/giving", { replace: true });
    } else if (subscriptionStatus === "success") {
      const sessionId = searchParams.get("session_id");
      if (sessionId) {
        // Record the subscription in the database
        supabase.functions.invoke("record-subscription", {
          body: { sessionId },
        }).then(({ data, error }) => {
          if (error) {
            console.error("Error recording subscription:", error);
            toast.success("Recurring donation set up successfully!");
          } else {
            toast.success(`Recurring donation of $${data?.amount}/${data?.interval} set up successfully!`);
          }
          navigate("/giving", { replace: true });
        });
      } else {
        toast.success("Recurring donation set up successfully!");
        navigate("/giving", { replace: true });
      }
    } else if (subscriptionStatus === "canceled") {
      toast.info("Subscription setup canceled");
      navigate("/giving", { replace: true });
    }
  }, [searchParams, navigate]);

  const handleCampaignDonate = (campaignId: string) => {
    const campaign = activeCampaigns?.find(c => c.id === campaignId);
    if (campaign) {
      setSelectedCampaign(campaign);
      setCampaignAmount("");
      
      setShowCampaignDialog(true);
    }
  };

  const handleCampaignCheckout = async () => {
    if (!campaignAmount || parseFloat(campaignAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsSubmittingCampaign(true);

      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: {
          amount: parseFloat(campaignAmount),
          category: "Campaign",
          campaign_id: selectedCampaign?.id || null,
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (data.sessionId) {
          sessionStorage.setItem("pendingDonationSession", data.sessionId);
        }
        setShowCampaignDialog(false);
        await openCheckoutUrl(data.url);
        toast.success("Opening donation checkout...");
      }
    } catch (error) {
      console.error("Error creating campaign donation checkout:", error);
      toast.error("Failed to create donation checkout. Please try again.");
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const handleEmailReceipt = async () => {
    if (!donationDetails) return;
    
    setSendingEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", donationDetails.user_id)
        .single();

      const { error } = await supabase.functions.invoke("send-donation-receipt", {
        body: {
          email: user?.email,
          donorName: profile?.full_name || "Valued Donor",
          donation: donationDetails,
        },
      });

      if (error) throw error;
      toast.success("Receipt emailed successfully!");
    } catch (error) {
      console.error("Error sending receipt:", error);
      toast.error("Failed to send receipt. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadReceipt = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-3 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {stripeMode?.isTestMode && (
          <Alert className="bg-amber-50 dark:bg-amber-950/50 border-amber-500 dark:border-amber-600">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs md:text-sm">
              <span className="font-semibold">Test Mode:</span> You're using Stripe test mode. Use test card <code className="bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded text-xs">4242 4242 4242 4242</code> for testing. No real charges will be made.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/home")}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/manage-subscriptions")}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Recurring</span>
              <span className="sm:hidden">Subscriptions</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/giving-history")}
              className="flex-1 sm:flex-none"
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
          </div>
        </div>

        <div className="text-center space-y-2 mb-4 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Online Giving</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base px-2">
            "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." - 2 Corinthians 9:7
          </p>
        </div>

        {activeCampaigns && activeCampaigns.length > 0 && (
          <Card className="mb-4 md:mb-8">
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Target className="h-5 w-5" />
                    Active Campaigns
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Support our special giving initiatives</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/campaigns")} className="w-full sm:w-auto">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onDonate={handleCampaignDonate}
                    onViewDetails={(id) => navigate(`/campaign/${id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <DonationForm />
      </div>

      {/* Donation Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Donation Successful
            </DialogTitle>
          </DialogHeader>
          
          {donationDetails && (
            <div className="space-y-6 print:text-black">
              <div className="text-center border-b pb-4 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg print:bg-gray-100">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h2 className="text-2xl font-bold">Thank You!</h2>
                <p className="text-muted-foreground mt-1">
                  Your generous donation has been received
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">COGMPW</h3>
                <p className="text-sm text-muted-foreground">Official Donation Receipt</p>
              </div>

              <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">Transaction Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground">Amount:</span>
                    <span className="text-xl font-bold text-green-600">
                      ${donationDetails.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground">Category:</span>
                    <span className="text-sm">{donationDetails.category}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground">Date:</span>
                    <span className="text-sm">
                      {format(new Date(donationDetails.created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground">Transaction ID:</span>
                    <span className="text-sm break-all font-mono text-xs">
                      {donationDetails.stripe_payment_intent_id}
                    </span>
                  </div>
                  {donationDetails.notes && (
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                      <span className="text-sm">{donationDetails.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-lg space-y-2 print:bg-gray-100">
                <h3 className="font-semibold text-lg">Tax Information</h3>
                <p className="text-sm">
                  COGMPW is a 501(c)(3) tax-exempt organization. This receipt serves as documentation 
                  of your charitable contribution for tax purposes. No goods or services were provided 
                  in exchange for this donation.
                </p>
                <p className="text-sm font-medium">
                  Please retain this receipt for your tax records.
                </p>
              </div>

              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>May God bless you for your generosity!</p>
                <p className="font-medium mt-1">COGMPW Ministry Team</p>
              </div>

              <div className="flex gap-2 justify-end print:hidden">
                <Button 
                  onClick={handleEmailReceipt} 
                  variant="outline" 
                  size="sm"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Email Receipt
                    </>
                  )}
                </Button>
                <Button onClick={handleDownloadReceipt} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download/Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Donation Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Donate to Campaign
            </DialogTitle>
            {selectedCampaign && (
              <DialogDescription>
                Supporting: {selectedCampaign.title}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-amount">Donation Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="campaign-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  className="pl-9"
                  value={campaignAmount}
                  onChange={(e) => setCampaignAmount(e.target.value)}
                />
              </div>
            </div>


            <Button 
              onClick={handleCampaignCheckout} 
              className="w-full" 
              size="lg"
              disabled={isSubmittingCampaign || !campaignAmount}
            >
              {isSubmittingCampaign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Checkout
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Supports Apple Pay and credit cards • Powered by Stripe
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Giving;
