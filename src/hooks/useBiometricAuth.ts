import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const CREDENTIALS_SERVER = "cogmpw.com";

// Biometry types matching capacitor-native-biometric
enum BiometryType {
  NONE = 0,
  TOUCH_ID = 1,
  FACE_ID = 2,
  FINGERPRINT = 3,
  FACE_AUTHENTICATION = 4,
  IRIS_AUTHENTICATION = 5,
  MULTIPLE = 6,
}

// Lazy load the native biometric module only on native platforms
let NativeBiometric: any = null;

const loadNativeBiometric = async () => {
  if (NativeBiometric) return NativeBiometric;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const module = await import("capacitor-native-biometric");
      NativeBiometric = module.NativeBiometric;
      return NativeBiometric;
    } catch (error) {
      console.log("Failed to load native biometric module:", error);
      return null;
    }
  }
  return null;
};

interface BiometricState {
  isAvailable: boolean;
  biometryType: BiometryType;
  hasStoredCredentials: boolean;
  isNative: boolean;
  diagnostic: string | null;
}

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    biometryType: BiometryType.NONE,
    hasStoredCredentials: false,
    isNative: false,
    diagnostic: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refresh = async () => {
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      setState({
        isAvailable: false,
        biometryType: BiometryType.NONE,
        hasStoredCredentials: false,
        isNative: false,
        diagnostic: null,
      });
      return;
    }

    // Mark as native early so the UI can show helpful debug text even if checks fail
    setState((prev) => ({ ...prev, isNative: true, diagnostic: null }));

    const biometric = await loadNativeBiometric();
    if (!biometric) {
      setState((prev) => ({
        ...prev,
        isNative: true,
        isAvailable: false,
        biometryType: BiometryType.NONE,
        hasStoredCredentials: false,
        diagnostic: "Biometric module not loaded (did you run cap sync?)",
      }));
      return;
    }

    try {
      const result = await biometric.isAvailable();

      // Check for stored credentials
      let hasCredentials = false;
      try {
        await biometric.getCredentials({ server: CREDENTIALS_SERVER });
        hasCredentials = true;
      } catch {
        // No credentials stored
      }

      setState({
        isAvailable: Boolean(result?.isAvailable),
        biometryType: result?.biometryType ?? BiometryType.NONE,
        hasStoredCredentials: hasCredentials,
        isNative: true,
        diagnostic: result?.isAvailable
          ? null
          : "Biometrics not available (not enrolled/disabled or missing permission)",
      });
    } catch (error) {
      console.log("Biometric not available:", error);
      setState((prev) => ({
        ...prev,
        isNative: true,
        isAvailable: false,
        biometryType: BiometryType.NONE,
        hasStoredCredentials: false,
        diagnostic: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  // Check if biometric is available and if credentials are stored
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get human-readable biometry type name
  const getBiometryName = useCallback(() => {
    switch (state.biometryType) {
      case BiometryType.FACE_ID:
        return "Face ID";
      case BiometryType.TOUCH_ID:
        return "Touch ID";
      case BiometryType.FINGERPRINT:
        return "Fingerprint";
      case BiometryType.FACE_AUTHENTICATION:
        return "Face Recognition";
      case BiometryType.IRIS_AUTHENTICATION:
        return "Iris";
      case BiometryType.MULTIPLE:
        return "Biometric";
      default:
        return "Biometric";
    }
  }, [state.biometryType]);

  // Save credentials after successful login
  const saveCredentials = useCallback(async (email: string, password: string) => {
    if (!Capacitor.isNativePlatform()) return false;

    const biometric = await loadNativeBiometric();
    if (!biometric) return false;

    try {
      await biometric.setCredentials({
        username: email,
        password: password,
        server: CREDENTIALS_SERVER,
      });

      setState(prev => ({ ...prev, hasStoredCredentials: true }));
      return true;
    } catch (error) {
      console.error("Failed to save credentials:", error);
      return false;
    }
  }, []);

  // Authenticate with biometric and login
  const authenticateWithBiometric = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!Capacitor.isNativePlatform() || !state.isAvailable || !state.hasStoredCredentials) {
      return { success: false, error: "Biometric not available" };
    }

    const biometric = await loadNativeBiometric();
    if (!biometric) {
      return { success: false, error: "Biometric module not available" };
    }

    setIsLoading(true);

    try {
      // Verify biometric first
      await biometric.verifyIdentity({
        reason: "Sign in to COGMPW",
        title: "Biometric Login",
        subtitle: "Use your biometric to sign in",
        description: "Place your finger on the sensor or look at the camera",
      });

      // Get stored credentials
      const credentials = await biometric.getCredentials({
        server: CREDENTIALS_SERVER,
      });

      // Sign in with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.username,
        password: credentials.password,
      });

      if (error) {
        // If credentials are invalid, delete them
        if (error.message.includes("Invalid login credentials")) {
          await deleteCredentials();
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Biometric auth error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Authentication failed" 
      };
    } finally {
      setIsLoading(false);
    }
  }, [state.isAvailable, state.hasStoredCredentials]);

  // Delete stored credentials
  const deleteCredentials = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    const biometric = await loadNativeBiometric();
    if (!biometric) return;

    try {
      await biometric.deleteCredentials({
        server: CREDENTIALS_SERVER,
      });
      setState(prev => ({ ...prev, hasStoredCredentials: false }));
    } catch (error) {
      console.error("Failed to delete credentials:", error);
    }
  }, []);

  return {
    ...state,
    isLoading,
    refresh,
    getBiometryName,
    saveCredentials,
    authenticateWithBiometric,
    deleteCredentials,
  };
};
