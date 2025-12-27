import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Smartphone, ArrowLeft } from "lucide-react";
import { openCogmpwApp } from "@/lib/openCogmpwApp";

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

export default function ReturnToApp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get all relevant params
  const target = useMemo(() => searchParams.get("target") || "/home", [searchParams]);
  const type = useMemo(() => searchParams.get("type") || "donation", [searchParams]);
  const status = useMemo(() => searchParams.get("status"), [searchParams]);
  const sessionId = useMemo(() => searchParams.get("session_id"), [searchParams]);

  // Build the deep link path with all necessary query params
  const deepLinkPath = useMemo(() => {
    const normalizedTarget = target.replace(/^\//, "");
    const params = new URLSearchParams();
    
    // Add session_id if present (for donation success tracking)
    if (sessionId) {
      params.append("session_id", sessionId);
    }
    
    // Add type if it's a subscription
    if (type === "subscription") {
      params.append("type", "subscription");
    }
    
    // Add status (success or canceled)
    if (status === "canceled") {
      params.append(type, "canceled");
    } else {
      params.append(type, "success");
    }
    
    return `app/${normalizedTarget}?${params.toString()}`;
  }, [target, type, status, sessionId]);

  // Web fallback URL (for users who want to stay on web)
  const webFallbackUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (sessionId) params.append("session_id", sessionId);
    if (type === "subscription") params.append("type", "subscription");
    if (status === "canceled") {
      params.append(type, "canceled");
    } else {
      params.append(type, "success");
    }
    return `${window.location.origin}${target}?${params.toString()}`;
  }, [target, type, status, sessionId]);

  useEffect(() => {
    document.title = "Return to App | COGMPW";
    setMetaTag(
      "description",
      "Return to the COGMPW app after completing your donation. If the app doesn't open automatically, follow the steps shown here."
    );
    setCanonical(`${window.location.origin}/return-to-app`);
    
    // Auto-attempt to open the app after a short delay
    const timer = setTimeout(() => {
      openCogmpwApp(deepLinkPath, webFallbackUrl);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [deepLinkPath, webFallbackUrl]);

  const handleOpenApp = useCallback(() => {
    openCogmpwApp(deepLinkPath, webFallbackUrl);
  }, [deepLinkPath, webFallbackUrl]);

  const handleContinueOnWeb = useCallback(() => {
    // Navigate to the target page on web
    const params = new URLSearchParams();
    if (sessionId) params.append("session_id", sessionId);
    if (type === "subscription") params.append("type", "subscription");
    if (status === "canceled") {
      params.append(type, "canceled");
    } else {
      params.append(type, "success");
    }
    navigate(`${target}?${params.toString()}`);
  }, [navigate, target, type, status, sessionId]);

  return (
    <main className="min-h-screen bg-background p-4 md:p-10">
      <section className="max-w-xl mx-auto animate-fade-in">
        <header className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Return to the App</h1>
          <p className="text-muted-foreground mt-1">
            {status === "canceled" 
              ? "Your payment was canceled. Tap below to return to the app."
              : "Your payment was successful! Tap below to return to the app."
            }
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Open COGMPW</CardTitle>
            <CardDescription>
              Some Android browsers block switching apps. If nothing happens, close this tab and open COGMPW from your recent
              apps or home screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" onClick={handleOpenApp}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open COGMPW App
            </Button>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Tap "Open COGMPW App"</li>
                <li>If it doesn't open, close this browser tab</li>
                <li>Open COGMPW from your recent apps or home screen</li>
              </ol>
            </div>

            <Button variant="outline" className="w-full" onClick={handleContinueOnWeb}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue on Website
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
