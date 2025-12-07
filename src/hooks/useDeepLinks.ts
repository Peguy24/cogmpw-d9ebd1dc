import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle deep links when app is opened via URL
    const handleAppUrlOpen = async (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] App opened with URL:', event.url);
      
      try {
        // Close the browser if it was opened for checkout
        if (Capacitor.isNativePlatform()) {
          try {
            await Browser.close();
          } catch (e) {
            // Browser might not be open, ignore
          }
        }

        // Parse the URL to extract path and query params
        // URL formats: 
        // - cogmpw://app/giving?donation=success (custom scheme)
        // - https://cogmpw.lovable.app/giving?donation=success (App Links)
        const url = new URL(event.url);
        
        // Get the pathname (e.g., /giving)
        let path = url.pathname || '/';
        
        // For custom scheme URLs, the host might contain the path
        if (url.protocol === 'cogmpw:') {
          // Handle cogmpw://app/giving format
          const hostAndPath = url.host + url.pathname;
          if (hostAndPath.startsWith('app')) {
            path = hostAndPath.replace(/^app/, '') || '/';
          }
        }
        // For HTTPS App Links, pathname is already correct (e.g., /giving)
        
        // Get query string
        const queryString = url.search;
        const fullPath = path + queryString;
        
        console.log('[DeepLink] Navigating to:', fullPath);
        
        // Navigate to the path
        navigate(fullPath);
        
        // Show appropriate toast based on query params
        const params = new URLSearchParams(queryString);
        if (params.get('donation') === 'success') {
          toast.success('Donation completed successfully!', {
            description: 'Thank you for your generous gift.',
          });
        } else if (params.get('donation') === 'canceled') {
          toast.info('Donation canceled', {
            description: 'No charge was made.',
          });
        } else if (params.get('subscription') === 'success') {
          toast.success('Recurring donation set up successfully!', {
            description: 'Thank you for your ongoing support.',
          });
        } else if (params.get('subscription') === 'canceled') {
          toast.info('Subscription setup canceled', {
            description: 'No recurring donation was created.',
          });
        }
      } catch (error) {
        console.error('[DeepLink] Error parsing URL:', error);
        // Fallback to home if URL parsing fails
        navigate('/home');
      }
    };

    // Add listener for app URL open events
    App.addListener('appUrlOpen', handleAppUrlOpen);

    // Cleanup listener on unmount
    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
};
