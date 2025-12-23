import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
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
  const isSubscription = useMemo(() => searchParams.get("type") === "subscription", [searchParams]);
  const [status, setStatus] = useState<"idle" | "recording" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [donationDetails, setDonationDetails] = useState<DonationDetails | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const noAutoOpen = useMemo(() => searchParams.get("no_auto_open") === "1", [searchParams]);

  const autoOpenStorageKey = useMemo(
    () => (sessionId ? `cogmpw:donationSuccess:autoOpenAttempted:${sessionId}` : null),
    [sessionId]
  );

  const getAutoOpenAttempted = () => {
    if (!autoOpenStorageKey) return false;
    try {
      return sessionStorage.getItem(autoOpenStorageKey) === "1";
    } catch {
      return false;
    }
  };

  const setAutoOpenAttempted = () => {
    if (!autoOpenStorageKey) return;
    try {
      sessionStorage.setItem(autoOpenStorageKey, "1");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Basic per-page SEO (no dynamic SEO lib in project)
    document.title = isSubscription ? "Thank You | COGMPW Subscription Success" : "Thank You | COGMPW Donation Success";
    setMetaTag(
      "description",
      isSubscription
        ? "Thank you for setting up recurring giving with COGMPW."
        : "Thank you for your donation to COGMPW. View the confirmed amount and category, then return to the app."
    );
    setCanonical(`${window.location.origin}/donation-success`);
  }, [isSubscription]);

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
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;

        // For subscriptions, we may need a different endpoint, but record-donation handles both
        const { data, error } = await supabase.functions.invoke("record-donation", {
          body: { sessionId },
          headers: authHeaders,
        });

        if (error && !error.message?.includes("already")) {
          throw error;
        }

        if (cancelled) return;

        const amount =
          typeof data?.amount === "number"
            ? data.amount
            : typeof data?.amount === "string"
              ? Number.parseFloat(data.amount)
              : null;

        if (amount !== null && Number.isFinite(amount)) {
          setDonationDetails({
            amount,
            category: data?.category || "General",
          });
        }

        // Ensure the app UI refreshes when user goes to history next.
        await queryClient.invalidateQueries({ queryKey: ["donations-history"] });

        setStatus("success");
        toast.success(isSubscription ? "Recurring donation set up" : "Donation recorded", {
          description: "You can now view it in your giving history.",
        });

        // Auto-attempt to open the app if we're in a browser (not native).
        // Guard against refresh loops if the browser falls back to this page.
        if (!isNative && !noAutoOpen && !getAutoOpenAttempted()) {
          setAutoOpenAttempted();
          // Small delay to let the success toast show first
          setTimeout(() => {
            tryOpenApp();
          }, 500);
        }
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
  }, [queryClient, sessionId, isNative, isSubscription, noAutoOpen]);

  // Function to attempt opening the app
  const tryOpenApp = () => {
    const successType = isSubscription ? "subscription" : "donation";
    const targetPath = `app/giving-history?${successType}=success`;
    const schemeUrl = `cogmpw://${targetPath}`;

    const fallbackUrl = (() => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("no_auto_open", "1");
        return url.toString();
      } catch {
        return window.location.href;
      }
    })();

    const ua = navigator.userAgent || "";
    const isAndroid = /android/i.test(ua);
    const isChrome = /chrome/i.test(ua) && !/edg/i.test(ua);

    // Android Chrome works best with intent://
    if (isAndroid && isChrome) {
      const intentUrl = `intent://${targetPath}#Intent;scheme=cogmpw;package=com.peguy24.cogmpw;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
      window.location.href = intentUrl;
      return;
    }

    // For other browsers/platforms, try the custom scheme
    window.location.href = schemeUrl;
  };

  const handleOpenInApp = () => {
    // If we are already inside the native app, just navigate
    if (isNative) {
      navigate("/giving-history");
      return;
    }

    // Prevent refresh loops if the browser immediately falls back to this page
    setAutoOpenAttempted();
    tryOpenApp();
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-10">
      <section className="max-w-xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Thank You!</h1>
          <p className="text-muted-foreground mt-1">
            {isSubscription
              ? "Your recurring donation has been set up successfully."
              : "Your donation has been received successfully."}
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === "recording" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : status === "success" ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <HandHeart className="h-5 w-5" />
              )}
              {isSubscription ? "Subscription Confirmed" : "Donation Confirmation"}
            </CardTitle>
            <CardDescription>
              {status === "recording"
                ? isSubscription
                  ? "Setting up your recurring donation…"
                  : "Recording your donation…"
                : status === "success"
                  ? isSubscription
                    ? "Your recurring donation has been set up successfully."
                    : "Your donation has been recorded successfully."
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
                  <span className="text-2xl font-bold text-primary">${donationDetails.amount.toFixed(2)}</span>
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
              {!isNative && (
                <Button onClick={handleOpenInApp}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Open in App
                </Button>
              )}

              <Button onClick={() => navigate("/giving-history")} disabled={status === "recording"}>
                <History className="h-4 w-4 mr-2" />
                View Giving History
              </Button>

              <Button variant="outline" onClick={() => navigate("/giving")} disabled={status === "recording"}>
                Back to Giving
              </Button>
            </div>

            {!isNative && (
              <p className="text-xs text-muted-foreground">
                If this page opened in your browser, tap <span className="font-medium">"Open in App"</span> to return to
                the app.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
