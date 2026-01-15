import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App, URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { setPaymentLoading } from "./usePaymentLoading";

export const useDeepLinks = () => {
  const navigate = useNavigate();
  const lastHandledUrlRef = useRef<string | null>(null);
  const lastHandledAtRef = useRef<number>(0);

  useEffect(() => {
    const handleUrl = async (incomingUrl: string) => {
      const now = Date.now();
      // iOS can sometimes re-fire the same launch URL, which can block login by repeatedly signing out.
      if (
        lastHandledUrlRef.current === incomingUrl &&
        now - lastHandledAtRef.current < 3000
      ) {
        return;
      }
      lastHandledUrlRef.current = incomingUrl;
      lastHandledAtRef.current = now;

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

        // For https App Links, strip /app prefix if present
        // Format: https://cogmpw.com/app/home -> /home
        if (url.protocol === "https:" && path.startsWith("/app")) {
          path = path.replace(/^\/app/, "") || "/";
        }

        const queryString = url.search;
        const fullPath = path + queryString;

        // Parse params before navigating so we can apply any required session changes
        const params = new URLSearchParams(queryString);

        // Check if this is a password reset success callback
        if (params.get("password_reset") === "success") {
          // iOS can sometimes re-fire the same launch URL even minutes later.
          // If we keep handling it, we can repeatedly sign out + re-show the banner,
          // making it feel like the user can never finish signing in.
          const handledKey = "password_reset_success_handled_at";
          const handledAt = Number(localStorage.getItem(handledKey) || 0);
          const alreadyHandledRecently = handledAt && now - handledAt < 10 * 60 * 1000; // 10 minutes

          if (alreadyHandledRecently) {
            console.log("[DeepLink] Ignoring repeated password reset success URL");
            return;
          }

          localStorage.setItem(handledKey, String(now));

          // Force sign-out so the Auth screen doesn't auto-redirect to /home
          try {
            const { supabase } = await import("@/integrations/supabase/client");
            await supabase.auth.signOut();
          } catch {
            // ignore
          }

          console.log("[DeepLink] Navigating to: /auth (password reset success)");
          navigate("/auth", {
            replace: true,
            state: { passwordResetSuccess: true },
          });
          return;
        }

        // Check if this is a recovery link with tokens (from Supabase redirect)
        // Format: /reset-password#access_token=...&refresh_token=...&type=recovery
        const hashIndex = incomingUrl.indexOf("#");
        if (hashIndex !== -1 && path.includes("reset-password")) {
          const hashParams = new URLSearchParams(incomingUrl.substring(hashIndex + 1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const type = hashParams.get("type");

          if (accessToken && refreshToken && type === "recovery") {
            console.log("[DeepLink] Handling recovery token in-app");
            // Navigate to reset-password and pass tokens via state so the page can verify
            navigate("/reset-password", {
              replace: true,
              state: { accessToken, refreshToken, type },
            });
            return;
          }
        }

        console.log("[DeepLink] Navigating to:", fullPath);
        navigate(fullPath);

        // Show appropriate toast based on query params
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
    const listener = App.addListener("appUrlOpen", (event: URLOpenListenerEvent) =>
      handleUrl(event.url)
    );

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
