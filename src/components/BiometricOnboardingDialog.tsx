import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BiometricOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  biometryName: string;
  onSaveCredentials: (email: string, password: string) => Promise<boolean>;
  onSkip: () => void;
}

export const BiometricOnboardingDialog = ({
  open,
  onOpenChange,
  userEmail,
  biometryName,
  onSaveCredentials,
  onSkip,
}: BiometricOnboardingDialogProps) => {
  const [step, setStep] = useState<"intro" | "password">("intro");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleEnable = () => {
    setStep("password");
  };

  const handleSetup = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setIsVerifying(true);

    try {
      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (error) {
        toast.error("Incorrect password. Please try again.");
        setIsVerifying(false);
        return;
      }

      // Password is correct, save credentials for biometric login
      const success = await onSaveCredentials(userEmail, password);

      if (success) {
        toast.success(`${biometryName} login enabled! You can now sign in faster.`);
        handleClose();
      } else {
        toast.error(`Failed to enable ${biometryName}. Please try again in Settings.`);
        handleClose();
      }
    } catch (err) {
      console.error("Biometric setup error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setStep("intro");
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "intro" ? (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Fingerprint className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">Enable {biometryName}?</DialogTitle>
              <DialogDescription className="text-center pt-2 space-y-2">
                <p>
                  Sign in to COGMPW instantly using {biometryName} instead of typing your password every time.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-1">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span>Your credentials are stored securely on your device</span>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleEnable} className="w-full">
                Enable {biometryName}
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="w-full">
                Maybe Later
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Your Password</DialogTitle>
              <DialogDescription>
                Enter your password to enable {biometryName} login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="onboarding-password">Password</Label>
                <div className="relative">
                  <Input
                    id="onboarding-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password) {
                        handleSetup();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setStep("intro")} disabled={isVerifying}>
                Back
              </Button>
              <Button onClick={handleSetup} disabled={!password || isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  `Enable ${biometryName}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
