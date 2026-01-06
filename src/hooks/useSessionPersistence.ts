import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to handle session persistence based on "Remember me" preference.
 * When "Remember me" is unchecked, signs out the user when the browser/tab closes.
 */
export const useSessionPersistence = () => {
  useEffect(() => {
    const handleBeforeUnload = () => {
      const rememberMe = localStorage.getItem('remember_me');
      
      // If remember me is explicitly set to false, mark session for cleanup
      if (rememberMe === 'false') {
        // Use sessionStorage to track if this was a page reload vs close
        sessionStorage.setItem('session_active', 'true');
      }
    };

    const checkSessionOnLoad = async () => {
      const rememberMe = localStorage.getItem('remember_me');
      const sessionActive = sessionStorage.getItem('session_active');
      
      // If remember me is false and no session marker exists (browser was closed)
      if (rememberMe === 'false' && !sessionActive) {
        // Sign out the user
        await supabase.auth.signOut();
      }
      
      // Set the session marker for this browser session
      if (rememberMe === 'false') {
        sessionStorage.setItem('session_active', 'true');
      }
    };

    // Check on initial load
    checkSessionOnLoad();

    // Set up beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
};
