import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DonationForm } from "@/components/DonationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, History, RefreshCw, Target, CheckCircle, Mail, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CampaignCard } from "@/components/CampaignCard";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Giving = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [donationDetails, setDonationDetails] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

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
      const sessionId = sessionStorage.getItem('pendingDonationSession');
      if (sessionId) {
        // Record donation and fetch details
        supabase.functions.invoke("record-donation", {
          body: { sessionId },
        }).then(async ({ data, error }) => {
          if (error) {
            console.error("Error recording donation:", error);
            toast.error("Payment received but failed to record. Please contact support.");
          } else {
            // Fetch the recorded donation details
            const { data: donations, error: fetchError } = await supabase
              .from("donations")
              .select("*, user_id")
              .eq("stripe_payment_intent_id", data?.paymentIntentId)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (!fetchError && donations) {
              setDonationDetails(donations);
              setShowReceiptDialog(true);
            } else {
              toast.success("Thank you for your generous donation!");
            }
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
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
    </div>
  );
};

export default Giving;
