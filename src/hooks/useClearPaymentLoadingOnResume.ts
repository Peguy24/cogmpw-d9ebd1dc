import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { setPaymentLoading } from "@/hooks/usePaymentLoading";

/**
 * Clears the payment overlay as soon as the user returns to the app.
 * This prevents the "Processing Payment" screen from staying stuck if the deep link isn't received.
 */
export const useClearPaymentLoadingOnResume = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) setPaymentLoading(false);
    });

    return () => {
      try {
        Promise.resolve(listener).then((h) => h.remove());
      } catch {
        // ignore
      }
    };
  }, []);
};
