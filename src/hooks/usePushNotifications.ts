import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    const initPushNotifications = async () => {
      try {
        // Request permission
        const permStatus = await PushNotifications.requestPermissions();
        
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        }

        // Register listeners
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          
          // Save token to database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from('push_tokens')
              .upsert({ 
                user_id: user.id, 
                token: token.value,
                platform: 'mobile'
              });
            
            if (error) {
              console.error('Error saving push token:', error);
            }
          }
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          toast({
            title: notification.title || 'New notification',
            description: notification.body,
          });
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed', notification.actionId, notification.inputValue);
        });

      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [toast]);
};
