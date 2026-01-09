import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from "@aparajita/capacitor-biometric-auth";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { supabase } from "@/integrations/supabase/client";

const CREDENTIALS_SERVER = "cogmpw.com";
const STORAGE_KEY = `biometric_credentials:${CREDENTIALS_SERVER}`;

// Internal biometry types used by our UI.
enum BiometryType {
  NONE = 0,
  TOUCH_ID = 1,
  FACE_ID = 2,
  FINGERPRINT = 3,
  FACE_AUTHENTICATION = 4,
  IRIS_AUTHENTICATION = 5,
  MULTIPLE = 6,
}

const mapBiometryType = (raw: unknown): BiometryType => {
  if (typeof raw === "number") {
    // If any plugin ever returns numeric types, map a safe subset.
    if (raw in BiometryType) return raw as BiometryType;
    return BiometryType.NONE;
  }

  const v = String(raw ?? "");
  switch (v) {
    case "faceId":
      return BiometryType.FACE_ID;
    case "touchId":
      return BiometryType.TOUCH_ID;
    case "fingerprintAuthentication":
      return BiometryType.FINGERPRINT;
    case "faceAuthentication":
      return BiometryType.FACE_AUTHENTICATION;
    case "irisAuthentication":
      return BiometryType.IRIS_AUTHENTICATION;
    case "multiple":
      return BiometryType.MULTIPLE;
    default:
      return BiometryType.NONE;
  }
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms));
  return (await Promise.race([promise, timeout])) as T;
};

type StoredCredentials = { username: string; password: string };

const readStoredCredentials = async (): Promise<StoredCredentials | null> => {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const stored = (await SecureStorage.get(STORAGE_KEY)) as unknown;
    if (!stored) return null;

    if (typeof stored === "string") {
      const parsed = JSON.parse(stored) as Partial<StoredCredentials>;
      if (!parsed.username || !parsed.password) return null;
      return { username: parsed.username, password: parsed.password };
    }

    if (typeof stored === "object" && stored !== null) {
      const obj = stored as Partial<StoredCredentials>;
      if (!obj.username || !obj.password) return null;
      return { username: obj.username, password: obj.password };
    }

    return null;
  } catch (e) {
    console.warn("[Biometric] Failed reading secure credentials:", e);
    return null;
  }
};

const writeStoredCredentials = async (creds: StoredCredentials): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    // SecureStorage can store JSON-compatible objects directly.
    await SecureStorage.set(STORAGE_KEY, creds);
    return true;
  } catch (e) {
    console.error("[Biometric] Failed saving secure credentials:", e);
    return false;
  }
};

const removeStoredCredentials = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SecureStorage.remove(STORAGE_KEY);
  } catch (e) {
    console.warn("[Biometric] Failed deleting secure credentials:", e);
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

  const refresh = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    console.log("[Biometric] Refresh. isNative:", isNative, "platform:", platform);

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
      setState((prev) => ({ ...prev, isNative: true, diagnostic: "Checking biometric availability..." }));

      // Check biometry (Capacitor 7 compatible)
      const result = await withTimeout(
        BiometricAuth.checkBiometry(),
        5000,
        "Biometric check timed out after 5s"
      );

      console.log("[Biometric] checkBiometry result:", JSON.stringify(result, null, 2));

      const creds = await withTimeout(readStoredCredentials(), 2500, "Reading credentials timed out");

      let diagnostic: string | null = null;
      if (!result?.isAvailable) {
        const type = mapBiometryType(result?.biometryType);
        const typeName = BiometryType[type] || "NONE";
        diagnostic = `isAvailable=false, type=${typeName}`;

        if (result?.deviceIsSecure === false) {
          diagnostic += ", deviceIsSecure=false (set a passcode/PIN)";
        }

        // If plugin includes a richer reason, show it
        if (typeof result?.reason === "string" && result.reason.trim()) {
          diagnostic += `, reason=${result.reason}`;
        }
      }

      setState({
        isAvailable: Boolean(result?.isAvailable),
        biometryType: mapBiometryType(result?.biometryType),
        hasStoredCredentials: Boolean(creds),
        isNative: true,
        diagnostic,
      });
    } catch (error) {
      console.error("[Biometric] refresh error:", error);

      let msg = error instanceof Error ? error.message : String(error);
      if (error instanceof BiometryError) {
        msg = `${error.code}: ${error.message}`;
      }

      setState((prev) => ({
        ...prev,
        isNative: true,
        isAvailable: false,
        biometryType: BiometryType.NONE,
        hasStoredCredentials: false,
        diagnostic: `Check error: ${msg}`,
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const testBiometricPrompt = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!Capacitor.isNativePlatform()) return { success: false, error: "Not running on a native build" };

    try {
      await BiometricAuth.authenticate({
        reason: "Testing biometrics",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        iosFallbackTitle: "Use Passcode",
        androidTitle: "Biometric Test",
        androidSubtitle: "Verify your identity",
        androidBiometryStrength: AndroidBiometryStrength.weak,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof BiometryError) {
        if (error.code === BiometryErrorType.userCancel) return { success: false, error: "Cancelled" };
        return { success: false, error: error.message };
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, []);

  const saveCredentials = useCallback(async (email: string, password: string) => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      // This triggers the actual Face ID/Touch ID system prompt (and permission).
      await BiometricAuth.authenticate({
        reason: "Enable biometric sign-in for COGMPW",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        iosFallbackTitle: "Use Passcode",
        androidTitle: "Enable Biometric Login",
        androidSubtitle: "Sign in faster next time",
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.weak,
      });

      const saved = await writeStoredCredentials({ username: email, password });
      if (saved) {
        setState((prev) => ({ ...prev, hasStoredCredentials: true }));
      }

      return saved;
    } catch (error) {
      console.error("[Biometric] saveCredentials error:", error);
      return false;
    }
  }, []);

  const deleteCredentials = useCallback(async () => {
    await removeStoredCredentials();
    setState((prev) => ({ ...prev, hasStoredCredentials: false }));
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!Capacitor.isNativePlatform() || !state.isAvailable || !state.hasStoredCredentials) {
      return { success: false, error: "Biometric not available" };
    }

    setIsLoading(true);

    try {
      await BiometricAuth.authenticate({
        reason: "Sign in to COGMPW",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        iosFallbackTitle: "Use Passcode",
        androidTitle: "Biometric Login",
        androidSubtitle: "Sign in",
        androidBiometryStrength: AndroidBiometryStrength.weak,
      });

      const creds = await readStoredCredentials();
      if (!creds) {
        return { success: false, error: "No stored credentials. Please enable biometric login again." };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: creds.username,
        password: creds.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          await deleteCredentials();
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      if (error instanceof BiometryError) {
        if (error.code === BiometryErrorType.userCancel) return { success: false, error: "Cancelled" };
        return { success: false, error: error.message };
      }

      return { success: false, error: error instanceof Error ? error.message : "Authentication failed" };
    } finally {
      setIsLoading(false);
    }
  }, [deleteCredentials, state.hasStoredCredentials, state.isAvailable]);

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
