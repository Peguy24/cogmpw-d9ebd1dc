import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Loader2, History, HandHeart, Smartphone, ExternalLink } from "lucide-react";
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

const COUNTDOWN_SECONDS = 5;

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

  // Countdown state - only starts after user taps "Open in App"
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [showFallback, setShowFallback] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const autoOpenStorageKey = useMemo(
    () => (sessionId ? `cogmpw:donationSuccess:autoOpenAttempted:${sessionId}` : null),
    [sessionId]
  );

  const setAutoOpenAttempted = useCallback(() => {
    if (!autoOpenStorageKey) return;
    try {
      sessionStorage.setItem(autoOpenStorageKey, "1");
    } catch {
      // ignore
    }
  }, [autoOpenStorageKey]);

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
        
        // No auto-open; user must tap "Open in App" to start countdown
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

  // Function to attempt opening the app with a specific path
  const tryOpenApp = useCallback(
    (targetPath: string = "giving-history", queryParams: string = "") => {
      const successType = isSubscription ? "subscription" : "donation";
      const normalizedTarget = targetPath.replace(/^\//, "");

      const deepLinkPath = queryParams
        ? `app/${normalizedTarget}?${queryParams}`
        : `app/${normalizedTarget}?${successType}=success`;

      const schemeUrl = `cogmpw://${deepLinkPath}`;

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

      // Prevent refresh loops
      setAutoOpenAttempted();

      if (isAndroid) {
        // intent:// + S.browser_fallback_url is generally the most reliable on Android.
        // This resolves to: cogmpw://app/<path>?...
        const intentUrl = `intent://${deepLinkPath}#Intent;scheme=cogmpw;package=com.peguy24.cogmpw;S.browser_fallback_url=${encodeURIComponent(
          fallbackUrl
        )};end`;

        const link = document.createElement("a");
        link.href = intentUrl;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For iOS and other platforms, use the custom scheme directly
      window.location.href = schemeUrl;
    },
    [isSubscription, setAutoOpenAttempted]
  );

  // Handle countdown timer (UX only). We avoid auto-opening from a timer because
  // many mobile browsers block custom scheme/intent navigation unless it happens
  // directly within a user gesture.
  useEffect(() => {
    if (!countdownActive) return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          // Show fallback message after countdown finishes
          setTimeout(() => {
            setCountdownActive(false);
            setShowFallback(true);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdownActive]);

  const handleOpenInApp = () => {
    // If we are already inside the native app, just navigate
    if (isNative) {
      navigate("/giving-history");
      return;
    }

    // Attempt to open immediately (must be inside a user gesture)
    tryOpenApp("giving-history");

    // Then show a short countdown UI to guide the user (no auto-open)
    if (!countdownActive) {
      setCountdown(COUNTDOWN_SECONDS);
      setCountdownActive(true);
    }
  };

  const handleViewHistory = () => {
    if (isNative) {
      navigate("/giving-history");
    } else {
      tryOpenApp("giving-history");
    }
  };

  const handleBackToGiving = () => {
    if (isNative) {
      navigate("/giving");
    } else {
      tryOpenApp("giving");
    }
  };

  const handleCancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setCountdownActive(false);
    setShowFallback(false);
    setCountdown(COUNTDOWN_SECONDS);
  };

  const handleOpenNow = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setCountdownActive(false);
    tryOpenApp("giving-history");
  };

  const progressValue = countdownActive ? ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100 : 0;

  return (
    <main className="min-h-screen bg-background p-4 md:p-10">
      <section className="max-w-xl mx-auto animate-fade-in">
        <header className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {status === "success" ? (
              <CheckCircle className="h-8 w-8 text-primary" />
            ) : status === "recording" ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <HandHeart className="h-8 w-8 text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold">Thank You!</h1>
          <p className="text-muted-foreground mt-1">
            {isSubscription
              ? "Your recurring donation has been set up successfully."
              : "Your donation has been received successfully."}
          </p>
        </header>

        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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

            {/* Countdown UI */}
            {!isNative && countdownActive && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trying to open the app… {countdown}s</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancelCountdown}>
                      Cancel
                    </Button>
                    <Button variant="default" size="sm" onClick={handleOpenNow}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Now
                    </Button>
                  </div>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            )}

            {/* Fallback message when app didn't open */}
            {!isNative && showFallback && !countdownActive && (
              <div className="p-4 bg-muted/60 border border-border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">App did not open automatically</p>
                    <p className="text-sm text-muted-foreground">To return to the COGMPW app:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Close this browser tab</li>
                      <li>
                        Find and tap the <span className="font-medium text-foreground">COGMPW</span> app icon on your home
                        screen
                      </li>
                      <li>Your donation has been recorded and will appear in your giving history</li>
                    </ol>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFallback(false);
                    handleOpenInApp();
                  }}
                  className="w-full"
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {!isNative && !countdownActive && !showFallback && (
                <Button onClick={handleOpenInApp} className="w-full" size="lg">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Open in App
                </Button>
              )}

              <Button 
                variant={countdownActive ? "default" : "secondary"}
                onClick={handleViewHistory} 
                disabled={status === "recording"}
                className="w-full"
              >
                <History className="h-4 w-4 mr-2" />
                View Giving History
              </Button>

              <Button variant="outline" onClick={handleBackToGiving} disabled={status === "recording"} className="w-full">
                Back to Giving
              </Button>
            </div>

            {!isNative && !countdownActive && !showFallback && (
              <p className="text-xs text-muted-foreground text-center">
                Tap <span className="font-medium">"Open in App"</span> to return to the app.
                A countdown will start before redirecting.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
