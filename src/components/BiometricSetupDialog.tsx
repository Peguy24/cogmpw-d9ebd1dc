import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BiometricSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  biometryName: string;
  onSaveCredentials: (email: string, password: string) => Promise<boolean>;
}

export const BiometricSetupDialog = ({
  open,
  onOpenChange,
  userEmail,
  biometryName,
  onSaveCredentials,
}: BiometricSetupDialogProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSetup = async () => {
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsVerifying(true);

    try {
      // Verify the password is correct by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (error) {
        toast.error("Incorrect password. Please try again.");
        return;
      }

      // Password is correct, save credentials for biometric
      const saved = await onSaveCredentials(userEmail, password);

      if (saved) {
        toast.success(`${biometryName} login enabled!`);
        setPassword("");
        onOpenChange(false);
      } else {
        toast.error(`Failed to enable ${biometryName} login`);
      }
    } catch (error) {
      console.error("Biometric setup error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Enable {biometryName} Login
          </DialogTitle>
          <DialogDescription>
            Enter your password to enable {biometryName} for quick sign-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="biometric-password">Password</Label>
            <div className="relative">
              <Input
                id="biometric-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isVerifying) {
                    handleSetup();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Your password will be securely stored on this device for biometric authentication.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
            Cancel
          </Button>
          <Button onClick={handleSetup} disabled={isVerifying || !password.trim()}>
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
      </DialogContent>
    </Dialog>
  );
};
