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

// Cache the native biometric module
let NativeBiometric: any = null;
let loadAttempted = false;
let loadError: string | null = null;

// Load the native biometric module - no timeout on the import itself
const loadNativeBiometric = async (): Promise<any> => {
  // Return cached module if already loaded
  if (NativeBiometric) return NativeBiometric;
  
  // If we already tried and failed, return null immediately
  if (loadAttempted && !NativeBiometric) {
    console.log("[Biometric] Previous load attempt failed, skipping");
    return null;
  }
  
  if (!Capacitor.isNativePlatform()) {
    console.log("[Biometric] Not native platform, skipping load");
    return null;
  }

  loadAttempted = true;
  
  try {
    console.log("[Biometric] Attempting dynamic import of capacitor-native-biometric...");
    const module = await import("capacitor-native-biometric");
    console.log("[Biometric] Module imported:", Object.keys(module));
    NativeBiometric = module.NativeBiometric;
    
    if (!NativeBiometric) {
      loadError = "NativeBiometric not found in module exports";
      console.error("[Biometric] " + loadError);
      return null;
    }
    
    console.log("[Biometric] NativeBiometric loaded successfully");
    return NativeBiometric;
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
    console.error("[Biometric] Failed to load native biometric module:", loadError);
    return null;
  }
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const withTimeout = async <T,>(
    promise: Promise<T>,
    ms: number,
    message: string
  ): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    );
    return (await Promise.race([promise, timeout])) as T;
  };

  const refresh = async () => {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    console.log("[Biometric] Starting refresh. isNative:", isNative, "platform:", platform);

    if (!isNative) {
      setState({
        isAvailable: false,
        biometryType: BiometryType.NONE,
        hasStoredCredentials: false,
        isNative: false,
        diagnostic: `Not running on native (platform: ${platform})`,
      });
      return;
    }

    setIsRefreshing(true);

    try {
      // Mark as native early so the UI can show helpful debug text even if checks fail
      setState((prev) => ({ ...prev, isNative: true, diagnostic: "Loading biometric plugin..." }));

      // Load the biometric module (no timeout - it either works or fails quickly)
      const biometric = await loadNativeBiometric();
      
      if (!biometric) {
        const errorMsg = loadError || "Biometric plugin not available";
        console.error("[Biometric] Plugin not available:", errorMsg);
        setState((prev) => ({
          ...prev,
          isNative: true,
          isAvailable: false,
          biometryType: BiometryType.NONE,
          hasStoredCredentials: false,
          diagnostic: `${errorMsg}. Ensure you ran: npm run build && npx cap sync ios && rebuild in Xcode.`,
        }));
        return;
      }

      setState((prev) => ({ ...prev, diagnostic: "Checking biometric availability..." }));

      console.log("[Biometric] Module loaded, calling isAvailable with timeout...");

      const result = await withTimeout(
        biometric.isAvailable() as Promise<{ isAvailable: boolean; biometryType: BiometryType; errorCode?: number }>,
        5000,
        "Biometric check timed out after 5s"
      );

      console.log("[Biometric] isAvailable result:", JSON.stringify(result, null, 2));

      // Check for stored credentials
      let hasCredentials = false;
      try {
        await withTimeout(biometric.getCredentials({ server: CREDENTIALS_SERVER }), 2500, "getCredentials timed out");
        hasCredentials = true;
        console.log("[Biometric] Stored credentials found");
      } catch (credError) {
        console.log("[Biometric] No stored credentials:", credError);
      }

      // Build detailed diagnostic
      let diagnosticMsg: string | null = null;
      if (!result?.isAvailable) {
        const biometryTypeName = BiometryType[result?.biometryType] || `Unknown(${result?.biometryType})`;
        diagnosticMsg = `isAvailable=false, type=${biometryTypeName}`;

        if (result?.errorCode) {
          diagnosticMsg += `, errorCode=${result.errorCode}`;
        }

        if (result?.biometryType === BiometryType.NONE) {
          diagnosticMsg += ". Hint: ensure Face ID/Touch ID is enrolled on the device and the app has permission.";
        }
      }

      const finalState = {
        isAvailable: Boolean(result?.isAvailable),
        biometryType: result?.biometryType ?? BiometryType.NONE,
        hasStoredCredentials: hasCredentials,
        isNative: true,
        diagnostic: diagnosticMsg,
      };

      console.log("[Biometric] Final state:", JSON.stringify(finalState, null, 2));
      setState(finalState);
    } catch (error) {
      console.error("[Biometric] refresh threw error:", error);
      const errMsg = error instanceof Error ? error.message : String(error);

      const hint = errMsg.includes("timed out")
        ? ". If this is iOS, check Face ID permission for the app and restart the app."
        : "";

      setState((prev) => ({
        ...prev,
        isNative: true,
        isAvailable: false,
        biometryType: BiometryType.NONE,
        hasStoredCredentials: false,
        diagnostic: `Check error: ${errMsg}${hint}`,
      }));
    } finally {
      setIsRefreshing(false);
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
  // Also triggers the biometric permission prompt on first enable (iOS will not show a Face ID prompt
  // until we actually attempt a biometric verification).
  const saveCredentials = useCallback(async (email: string, password: string) => {
    if (!Capacitor.isNativePlatform()) return false;

    const biometric = await loadNativeBiometric();
    if (!biometric) return false;

    try {
      // IMPORTANT: This is what makes iOS show the "Allow Face ID" prompt the first time.
      // Without calling verifyIdentity, the app may never appear in Face ID settings.
      await biometric.verifyIdentity({
        reason: `Enable biometric sign-in for COGMPW`,
        title: "Enable Biometric Login",
        subtitle: "Confirm with Face ID / Touch ID",
        description: "This will let you sign in faster next time.",
      });

      await biometric.setCredentials({
        username: email,
        password: password,
        server: CREDENTIALS_SERVER,
      });

      setState((prev) => ({ ...prev, hasStoredCredentials: true }));
      return true;
    } catch (error) {
      console.error("Failed to save credentials:", error);
      return false;
    }
  }, []);

  const testBiometricPrompt = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: "Not running on a native build" };
    }

    try {
      const biometric = await loadNativeBiometric();
      if (!biometric) return { success: false, error: "Biometric plugin not available" };

      await biometric.verifyIdentity({
        reason: "Testing Face ID / Touch ID",
        title: "Biometric Test",
        subtitle: "Verify your identity",
        description: "This is a test to confirm biometrics work on your device.",
      });

      return { success: true };
    } catch (error: any) {
      const msg = error?.message || (error instanceof Error ? error.message : String(error));
      return { success: false, error: msg };
    }
  }, []);

  // Delete stored credentials
  const deleteCredentials = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    const biometric = await loadNativeBiometric();
    if (!biometric) return;

    try {
      await biometric.deleteCredentials({
        server: CREDENTIALS_SERVER,
      });
      setState((prev) => ({ ...prev, hasStoredCredentials: false }));
    } catch (error) {
      console.error("Failed to delete credentials:", error);
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
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    } finally {
      setIsLoading(false);
    }
  }, [state.isAvailable, state.hasStoredCredentials, deleteCredentials]);
  return {
    ...state,
    isLoading,
    isRefreshing,
    refresh,
    getBiometryName,
    saveCredentials,
    testBiometricPrompt,
    authenticateWithBiometric,
    deleteCredentials,
  };
};
