import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, History, HandHeart, Smartphone } from "lucide-react";
import { toast } from "sonner";

function setMetaTag(name: string, content: string) {
  const tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (tag) tag.content = content;
}

function setCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

interface DonationDetails {
  amount: number;
  category: string;
}

export default function DonationSuccess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const sessionId = useMemo(() => searchParams.get("session_id"), [searchParams]);
  const [status, setStatus] = useState<"idle" | "recording" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [donationDetails, setDonationDetails] = useState<DonationDetails | null>(null);

  useEffect(() => {
    // Basic per-page SEO (no dynamic SEO lib in project)
    document.title = "Donation Success | COGMPW Online Giving";
    setMetaTag(
      "description",
      "Donation success confirmation for COGMPW online giving. Your donation is being recorded and will appear in your giving history."
    );
    setCanonical(`${window.location.origin}/donation-success`);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("Missing payment session. Please return to the app and try again.");
      return;
    }

    let cancelled = false;

    (async () => {
      setStatus("recording");
      setErrorMsg(null);

      try {
        // Get auth token if available
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined;

        const { data, error } = await supabase.functions.invoke("record-donation", {
          body: { sessionId },
          headers: authHeaders,
        });

        if (error && !error.message?.includes("already")) {
          throw error;
        }

        if (cancelled) return;

        // Store donation details from the response
        if (data && typeof data.amount === 'number') {
          setDonationDetails({
            amount: data.amount,
            category: data.category || 'General',
          });
        }

        // Ensure the app UI refreshes when user goes to history next.
        await queryClient.invalidateQueries({ queryKey: ["donations-history"] });

        setStatus("success");
        toast.success("Donation recorded", {
          description: "You can now view it in your giving history.",
        });
      } catch (e: any) {
        if (cancelled) return;
        console.error("[DonationSuccess] record-donation failed", e);
        setStatus("error");
        setErrorMsg(e?.message || "Failed to record donation.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient, sessionId]);

  return (
    <main className="min-h-screen bg-background p-4 md:p-10">
      <section className="max-w-xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Donation Success</h1>
          <p className="text-muted-foreground mt-1">
            We're confirming your donation and saving it to your giving history.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === "recording" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : status === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <HandHeart className="h-5 w-5" />
              )}
              Donation Confirmation
            </CardTitle>
            <CardDescription>
              {status === "recording"
                ? "Recording your donation…"
                : status === "success"
                  ? "Your donation has been recorded successfully."
                  : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {status === "success" && donationDetails && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${donationDetails.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{donationDetails.category}</span>
                </div>
              </div>
            )}

            {status === "success" && !donationDetails && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground text-center">
                  Your donation has been recorded. View your giving history for details.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Fallback button for mobile app users when page opens in browser */}
              <Button
                onClick={() => {
                  const deepLink = sessionId 
                    ? `cogmpw://donation-success?session_id=${sessionId}`
                    : `cogmpw://donation-success`;
                  window.location.href = deepLink;
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Open in App
              </Button>
              
              <Button
                onClick={() => navigate("/giving-history")}
                disabled={status === "recording"}
              >
                <History className="h-4 w-4 mr-2" />
                View Giving History
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/giving")}
                disabled={status === "recording"}
              >
                Back to Giving
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              If you're using the mobile app and this page opened in your browser, 
              tap <span className="font-medium">"Open in App"</span> to return to the app.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
