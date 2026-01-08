import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to handle session persistence based on "Remember me" preference.
 * 
 * On web: When "Remember me" is unchecked, signs out the user when the browser/tab closes.
 * On native iOS/Android: Uses app state changes to detect when app is closed/backgrounded.
 */
export const useSessionPersistence = () => {
  const lastBackgroundedRef = useRef<number>(0);
  const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes background = sign out

  useEffect(() => {
    const rememberMe = localStorage.getItem("remember_me");

    // If remember me is true (default), skip all session management
    if (rememberMe !== "false") {
      return;
    }

    // === NATIVE APP HANDLING ===
    if (Capacitor.isNativePlatform()) {
      let appStateListener: any = null;

      const setupNativeListener = async () => {
        // When app goes to background, record timestamp
        // When app resumes after timeout, sign out
        appStateListener = await App.addListener("appStateChange", async ({ isActive }) => {
          if (!isActive) {
            // App went to background
            lastBackgroundedRef.current = Date.now();
          } else {
            // App became active again
            const backgroundDuration = Date.now() - lastBackgroundedRef.current;
            if (lastBackgroundedRef.current > 0 && backgroundDuration > SESSION_TIMEOUT_MS) {
              // User was away for too long, sign out
              console.log("[SessionPersistence] Session expired after background, signing out");
              await supabase.auth.signOut();
            }
          }
        });
      };

      setupNativeListener();

      return () => {
        if (appStateListener) {
          appStateListener.remove();
        }
      };
    }

    // === WEB BROWSER HANDLING ===
    const handleBeforeUnload = () => {
      // Mark session for cleanup
      sessionStorage.setItem("session_active", "true");
    };

    const checkSessionOnLoad = async () => {
      const sessionActive = sessionStorage.getItem("session_active");

      // If no session marker exists (browser was closed, not just refreshed)
      if (!sessionActive) {
        // Sign out the user
        await supabase.auth.signOut();
      }

      // Set the session marker for this browser session
      sessionStorage.setItem("session_active", "true");
    };

    // Check on initial load
    checkSessionOnLoad();

    // Set up beforeunload listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
};
