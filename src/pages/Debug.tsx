import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface DebugInfo {
  launchUrl: string | null;
  userAgent: string;
  currentRoute: string;
  isNativePlatform: boolean;
  platform: string;
  isAndroidWebView: boolean;
  windowLocationHref: string;
  timestamp: string;
}

export default function Debug() {
  const location = useLocation();
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [appUrlOpenEvents, setAppUrlOpenEvents] = useState<string[]>([]);

  const collectDebugInfo = async () => {
    const ua = navigator.userAgent || "";
    const isAndroidWebView = /\bwv\b/i.test(ua) || /;\s*wv\)/i.test(ua);

    let launchUrl: string | null = null;
    try {
      if (Capacitor.isNativePlatform()) {
        const launch = await App.getLaunchUrl();
        launchUrl = launch?.url || null;
      }
    } catch (e) {
      launchUrl = `Error: ${e}`;
    }

    const info: DebugInfo = {
      launchUrl,
      userAgent: ua,
      currentRoute: location.pathname + location.search,
      isNativePlatform: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      isAndroidWebView,
      windowLocationHref: window.location.href,
      timestamp: new Date().toISOString(),
    };

    setDebugInfo(info);
  };

  useEffect(() => {
    collectDebugInfo();

    // Listen for appUrlOpen events
    const setupListener = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const listener = await App.addListener("appUrlOpen", (event) => {
          setAppUrlOpenEvents((prev) => [
            ...prev,
            `[${new Date().toISOString()}] ${event.url}`,
          ]);
        });

        return () => {
          listener.remove();
        };
      } catch {
        // ignore
      }
    };

    setupListener();
  }, [location]);

  const copyToClipboard = () => {
    const text = JSON.stringify(
      { debugInfo, appUrlOpenEvents },
      null,
      2
    );
    navigator.clipboard.writeText(text);
    toast.success("Debug info copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Debug Info</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="icon" onClick={collectDebugInfo}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {debugInfo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Platform Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Platform:</span>
                <span className="break-all">{debugInfo.platform}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Is Native:</span>
                <span className={debugInfo.isNativePlatform ? "text-green-600" : "text-red-600"}>
                  {String(debugInfo.isNativePlatform)}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Android WV:</span>
                <span className={debugInfo.isAndroidWebView ? "text-green-600" : "text-orange-600"}>
                  {String(debugInfo.isAndroidWebView)}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Timestamp:</span>
                <span className="break-all">{debugInfo.timestamp}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {debugInfo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">URLs & Routes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-muted-foreground block">Launch URL:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs break-all block mt-1">
                  {debugInfo.launchUrl || "(none)"}
                </code>
              </div>
              <div>
                <span className="font-medium text-muted-foreground block">Current Route:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs break-all block mt-1">
                  {debugInfo.currentRoute}
                </code>
              </div>
              <div>
                <span className="font-medium text-muted-foreground block">window.location.href:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs break-all block mt-1">
                  {debugInfo.windowLocationHref}
                </code>
              </div>
            </CardContent>
          </Card>
        )}

        {debugInfo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">User Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="bg-muted px-2 py-1 rounded text-xs break-all block">
                {debugInfo.userAgent}
              </code>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              appUrlOpen Events ({appUrlOpenEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appUrlOpenEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events received yet</p>
            ) : (
              <div className="space-y-1">
                {appUrlOpenEvents.map((event, i) => (
                  <code key={i} className="bg-muted px-2 py-1 rounded text-xs break-all block">
                    {event}
                  </code>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={() => navigate("/home")} className="flex-1">
            Go to Home
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
            Go to Index
          </Button>
        </div>
      </div>
    </div>
  );
}
