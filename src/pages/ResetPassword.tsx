import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, AlertTriangle, RefreshCw, ArrowLeft, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import churchLogo from "@/assets/church-logo-gold.png";
import { openCogmpwApp } from "@/lib/openCogmpwApp";

type ResetState = "loading" | "ready" | "expired" | "success" | "error";

const isMobileDevice = () => {
  const ua = navigator.userAgent || "";
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [resetState, setResetState] = useState<ResetState>("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // Check hash fragment for tokens (Supabase redirects with #access_token=...)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");
      const errorCode = hashParams.get("error_code");
      const errorDescription = hashParams.get("error_description");

      // Handle explicit errors from Supabase
      if (errorCode || errorDescription) {
        console.error("Auth error:", errorCode, errorDescription);
        setResetState("expired");
        return;
      }

      // If we have tokens from a recovery link
      if (accessToken && refreshToken && type === "recovery") {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Session error:", error);
            setResetState("expired");
            return;
          }

          setResetState("ready");
        } catch (err) {
          console.error("Token processing error:", err);
          setResetState("expired");
        }
        return;
      }

      // Check if there's already an active recovery session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setResetState("ready");
      } else {
        // No session and no tokens - likely expired or invalid link
        setResetState("expired");
      }
    };

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetState("ready");
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Sign out the user so they must log in with their new password
      await supabase.auth.signOut();

      setResetState("success");
      toast.success("Password updated successfully! Please sign in with your new password.");

      // Auto-redirect only on desktop; mobile users will use the "Open App" button
      if (!isMobileDevice()) {
        setTimeout(() => {
          navigate("/auth?password_reset=success");
        }, 2000);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      setResetState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-password-reset", {
        body: {
          email,
          redirectUrl: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;

      toast.success("A new password reset email has been sent!");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setResendLoading(false);
    }
  };

  // Loading state
  if (resetState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (resetState === "success") {
    const isMobile = isMobileDevice();

    const handleOpenApp = () => {
      // Use the `app/` prefix so Android intent URLs include a real pathname (more reliable parsing on the native side)
      openCogmpwApp(
        "app/auth?password_reset=success",
        `${window.location.origin}/auth?password_reset=success`
      );
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Password Updated!
            </CardTitle>
            <CardDescription>
              Your password has been successfully changed.
              {!isMobile && " Redirecting you to the app..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isMobile ? (
              <>
                <Button onClick={handleOpenApp} className="w-full" size="lg">
                  <Smartphone className="h-5 w-5 mr-2" />
                  Open COGMPW App
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  If you don't have the app installed, you'll be redirected to the web version.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/home")}
                    className="w-full"
                  >
                    Continue in Browser
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => navigate("/home")} className="w-full">
                Go to Home
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired / Error state
  if (resetState === "expired" || resetState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src={churchLogo}
                alt="COGMPW Church Logo"
                className="h-20 w-20 object-contain"
              />
            </div>
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">
              {resetState === "expired" ? "Link Expired or Invalid" : "Something Went Wrong"}
            </CardTitle>
            <CardDescription className="mt-2">
              {resetState === "expired"
                ? "This password reset link has expired or is no longer valid. Reset links are valid for 1 hour."
                : "We encountered an error while processing your request. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Request a new reset link:</p>
              <div className="space-y-2">
                <Label htmlFor="resend-email">Email Address</Label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={handleResendEmail}
                disabled={resendLoading || !email}
                className="w-full"
              >
                {resendLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send New Reset Link"
                )}
              </Button>
            </div>
            <div className="text-center pt-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready state - show password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src={churchLogo}
              alt="COGMPW Church Logo"
              className="h-24 w-24 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
          <CardDescription>
            Enter a new password for your COGMPW account. Make sure it's at least 6 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password requirements hint */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>At least 6 characters long</li>
                <li>Both passwords must match</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>

          <div className="text-center pt-4 mt-4 border-t">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
