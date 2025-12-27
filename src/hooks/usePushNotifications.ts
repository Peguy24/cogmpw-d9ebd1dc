import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePushNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Prevent web preview from throwing: "PushNotifications plugin is not implemented on web"
    if (!Capacitor.isNativePlatform()) return;

    const initPushNotifications = async () => {
      try {
        // 1️⃣ Request permission from the user
        const permStatus = await PushNotifications.requestPermissions();

        if (permStatus.receive === "granted") {
          await PushNotifications.register();
        } else {
          console.warn("Push notification permission not granted:", permStatus);
          return;
        }

        // Utility to mask tokens for safe logging
        const maskToken = (token: string): string => {
          if (!token || token.length <= 8) return "***";
          return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
        };

        // 2️⃣ When registration succeeds, save token
        await PushNotifications.addListener("registration", async (token) => {
          console.log(`Push registration successful: ${maskToken(token.value)}`);

          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (user) {
              const { error } = await supabase.from("push_tokens").upsert({
                user_id: user.id,
                token: token.value,
                platform: "mobile",
              });

              if (error) {
                console.error("Error saving push token:", error);
              }
            } else {
              console.log("No authenticated user found; skipping saving push token.");
            }
          } catch (err) {
            console.error("Error fetching user / saving token:", err);
          }
        });

        // 3️⃣ When registration fails
        await PushNotifications.addListener("registrationError", (error) => {
          console.error("Error on push registration:", JSON.stringify(error));
        });

        // 4️⃣ When a notification is received in foreground
        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push notification received:", notification);

          toast({
            title: notification.title || "New notification",
            description: notification.body,
          });
        });

        // 5️⃣ When the user taps a notification
        await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
          console.log(
            "Push notification action performed",
            notification.actionId,
            notification.inputValue
          );
        });
      } catch (error) {
        console.error("Error initializing push notifications:", error);
      }
    };

    initPushNotifications();

    return () => {
      try {
        PushNotifications.removeAllListeners();
      } catch {
        // ignore
      }
    };
  }, [toast]);
};

