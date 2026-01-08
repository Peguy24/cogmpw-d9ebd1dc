import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App, URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { setPaymentLoading } from "./usePaymentLoading";

export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUrl = async (incomingUrl: string) => {
      console.log("[DeepLink] Handling URL:", incomingUrl);

      try {
        // Hide payment loading overlay immediately
        setPaymentLoading(false);

        // Close the browser if it was opened for checkout
        if (Capacitor.isNativePlatform()) {
          try {
            await Browser.close();
          } catch {
            // Browser might not be open, ignore
          }
        }

        // Parse the URL to extract path and query params
        // URL formats:
        // - cogmpw://app/giving?donation=success (custom scheme)
        // - https://cogmpw.lovable.app/giving?donation=success (App Links)
        const url = new URL(incomingUrl);

        // Get the pathname (e.g., /giving)
        let path = url.pathname || "/";

        // For custom scheme URLs, the host might contain the path
        if (url.protocol === "cogmpw:") {
          // Supported formats:
          // - cogmpw://app/giving?donation=success
          // - cogmpw://app/donation-success?session_id=...
          // - cogmpw://donation-success?session_id=... (fallback)
          const hostAndPath = url.host + url.pathname;
          if (hostAndPath.startsWith("app")) {
            path = hostAndPath.replace(/^app/, "") || "/";
          } else if (url.host) {
            path = `/${url.host}${url.pathname || ""}`;
          }
        }

        const queryString = url.search;
        const fullPath = path + queryString;

        console.log("[DeepLink] Navigating to:", fullPath);
        navigate(fullPath);

        // Show appropriate toast based on query params
        const params = new URLSearchParams(queryString);
        if (params.get("donation") === "success") {
          toast.success("Donation completed successfully!", {
            description: "Thank you for your generous gift.",
          });
        } else if (params.get("donation") === "canceled") {
          toast.info("Donation canceled", {
            description: "No charge was made.",
          });
        } else if (params.get("subscription") === "success") {
          toast.success("Recurring donation set up successfully!", {
            description: "Thank you for your ongoing support.",
          });
        } else if (params.get("subscription") === "canceled") {
          toast.info("Subscription setup canceled", {
            description: "No recurring donation was created.",
          });
        } else if (params.get("password_reset") === "success") {
          toast.success("Password reset successfully!", {
            description: "Please sign in with your new password.",
          });
        }
      } catch (error) {
        console.error("[DeepLink] Error parsing URL:", error);
        navigate("/home");
      }
    };

    // Handle cold-start deep links (app was closed)
    (async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          await handleUrl(launch.url);
        }
      } catch {
        // ignore
      }
    })();

    // Handle deep links while the app is already running
    const listener = App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => handleUrl(event.url));

    return () => {
      try {
        // Capacitor returns a Promise<PluginListenerHandle> in some environments
        // so we handle both sync + async.
        Promise.resolve(listener).then((h) => h.remove());
      } catch {
        // ignore
      }
    };
  }, [navigate]);
};
