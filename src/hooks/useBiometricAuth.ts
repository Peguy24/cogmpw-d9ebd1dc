import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import { supabase } from "@/integrations/supabase/client";

const CREDENTIALS_SERVER = "cogmpw.com";

interface BiometricState {
  isAvailable: boolean;
  biometryType: BiometryType;
  hasStoredCredentials: boolean;
  isNative: boolean;
}

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    biometryType: BiometryType.NONE,
    hasStoredCredentials: false,
    isNative: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check if biometric is available and if credentials are stored
  useEffect(() => {
    const checkBiometric = async () => {
      // Only available on native platforms
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        const result = await NativeBiometric.isAvailable();
        
        // Check for stored credentials
        let hasCredentials = false;
        try {
          await NativeBiometric.getCredentials({ server: CREDENTIALS_SERVER });
          hasCredentials = true;
        } catch {
          // No credentials stored
        }

        setState({
          isAvailable: result.isAvailable,
          biometryType: result.biometryType,
          hasStoredCredentials: hasCredentials,
          isNative: true,
        });
      } catch (error) {
        console.log("Biometric not available:", error);
      }
    };

    checkBiometric();
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

    try {
      await NativeBiometric.setCredentials({
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

    setIsLoading(true);

    try {
      // Verify biometric first
      await NativeBiometric.verifyIdentity({
        reason: "Sign in to COGMPW",
        title: "Biometric Login",
        subtitle: "Use your biometric to sign in",
        description: "Place your finger on the sensor or look at the camera",
      });

      // Get stored credentials
      const credentials = await NativeBiometric.getCredentials({
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

    try {
      await NativeBiometric.deleteCredentials({
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
    getBiometryName,
    saveCredentials,
    authenticateWithBiometric,
    deleteCredentials,
  };
};
