import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft, Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";
import churchLogo from "@/assets/church-logo-gold.png";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { BiometricOptInDialog } from "@/components/BiometricOptInDialog";

const authSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }).optional(),
  phone: z.string().optional(),
});

const getPublicSiteUrl = () => {
  const host = window.location.hostname;

  // When testing from preview/dev domains, force the public custom domain so
  // password-reset links never bounce users to an internal Lovable domain.
  if (
    host === "localhost" ||
    host.endsWith("lovable.app") ||
    host.endsWith("lovableproject.com") ||
    host.endsWith("lovable.dev")
  ) {
    return "https://cogmpw.com";
  }

  return window.location.origin;
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
  });
  const [rememberMe, setRememberMe] = useState(() => {
    // Default to true, or use stored preference
    return localStorage.getItem("remember_me") !== "false";
  });

  // Store credentials temporarily for saving after successful login
  const pendingCredentials = useRef<{ email: string; password: string } | null>(null);

  // Password reset success (from deep link state or query param)
  const passwordResetParam = searchParams.get("password_reset") === "success";
  const passwordResetState =
    (location.state as { passwordResetSuccess?: boolean } | null)?.passwordResetSuccess === true;
  const didHandlePasswordResetRef = useRef(false);

  const [showPasswordResetBanner, setShowPasswordResetBanner] = useState(false);
  const [isBannerFading, setIsBannerFading] = useState(false);

  useEffect(() => {
    if (didHandlePasswordResetRef.current) return;
    if (!passwordResetParam && !passwordResetState) return;

    didHandlePasswordResetRef.current = true;
    setShowPasswordResetBanner(true);
    // Ensure password recovery mode is off so auth listener works correctly
    setIsPasswordRecovery(false);

    toast.success("Password reset successfully!", {
      description: "Please sign in with your new password.",
    });

    // Clear query/state so it doesn't show again on every interaction
    navigate("/auth", { replace: true });
  }, [navigate, passwordResetParam, passwordResetState]);

  // Auto-hide password reset banner after 10 seconds with fade-out
  useEffect(() => {
    if (showPasswordResetBanner && !isBannerFading) {
      const fadeTimer = setTimeout(() => {
        setIsBannerFading(true);
      }, 10000);
      return () => clearTimeout(fadeTimer);
    }
  }, [showPasswordResetBanner, isBannerFading]);

  // Remove banner after fade-out animation completes
  useEffect(() => {
    if (isBannerFading) {
      const removeTimer = setTimeout(() => {
        setShowPasswordResetBanner(false);
      }, 300); // Match animation duration
      return () => clearTimeout(removeTimer);
    }
  }, [isBannerFading]);

  // Biometric opt-in dialog state
  const [showBiometricOptIn, setShowBiometricOptIn] = useState(false);
  
  // Biometric authentication hook
  const biometric = useBiometricAuth();

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "SIGNED_IN" && !isPasswordRecovery) {
        navigate("/home");
      }
    });

    // Check if user is already logged in (but not during password recovery)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isPasswordRecovery) {
        // Check URL for recovery token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get("type") === "recovery") {
          setIsPasswordRecovery(true);
        } else {
          navigate("/home");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isPasswordRecovery]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setIsLoading(true);

    try {
      const validated = authSchema.parse(formData);
      
      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${getPublicSiteUrl()}/home`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
          },
        },
      });

      if (error) throw error;
      
      // Send welcome email
      try {
        await supabase.functions.invoke('send-signup-email', {
          body: {
            email: validated.email,
            fullName: formData.fullName,
          },
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
      
      toast.success("Account created successfully! Check your email.");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = authSchema.pick({ email: true, password: true }).parse(formData);
      
      // Store credentials temporarily to save after successful login
      pendingCredentials.current = { email: validated.email, password: validated.password };
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      // Store remember me preference
      localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');

      // On successful login, show biometric opt-in dialog (if available, not already set up, and not dismissed before)
      const biometricDismissed = localStorage.getItem('biometric_opt_in_dismissed');
      const shouldShowBiometricOptIn = biometric.isAvailable && !biometric.hasStoredCredentials && pendingCredentials.current && !biometricDismissed;
      
      console.log("[Auth] Sign-in success, biometric check:", {
        isAvailable: biometric.isAvailable,
        hasStoredCredentials: biometric.hasStoredCredentials,
        biometricDismissed: !!biometricDismissed,
        willShowOptIn: shouldShowBiometricOptIn
      });
      
      if (shouldShowBiometricOptIn) {
        setShowBiometricOptIn(true);
        // Safety timeout: if dialog doesn't complete in 5 seconds, navigate anyway
        setTimeout(() => {
          console.log("[Auth] Biometric dialog timeout check");
          // Only navigate if we're still showing the opt-in (hasn't been handled)
          setShowBiometricOptIn((current) => {
            if (current) {
              console.log("[Auth] Biometric dialog timeout, navigating to home");
              toast.success("Signed in successfully!");
              navigate("/home");
              return false;
            }
            return current;
          });
        }, 5000);
      } else {
        toast.success("Signed in successfully!");
        navigate("/home");
      }
    } catch (error) {
      pendingCredentials.current = null;
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle biometric opt-in confirmation
  const handleBiometricOptInConfirm = async () => {
    if (pendingCredentials.current) {
      const saved = await biometric.saveCredentials(
        pendingCredentials.current.email,
        pendingCredentials.current.password
      );
      if (saved) {
        toast.success(`${biometric.getBiometryName()} enabled for faster sign-in!`);
      } else {
        toast.success("Signed in successfully!");
      }
    }
    pendingCredentials.current = null;
    setShowBiometricOptIn(false);
    navigate("/home");
  };

  // Handle biometric opt-in cancel
  const handleBiometricOptInCancel = () => {
    // Store flag to not show prompt again on this device
    localStorage.setItem('biometric_opt_in_dismissed', 'true');
    pendingCredentials.current = null;
    setShowBiometricOptIn(false);
    toast.success("Signed in successfully!");
    navigate("/home");
  };


  // Handle biometric login
  const handleBiometricLogin = async () => {
    const result = await biometric.authenticateWithBiometric();
    if (result.success) {
      toast.success("Signed in successfully!");
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: formData.email,
          redirectUrl: `${getPublicSiteUrl()}/reset-password`,
        },
      });

      if (error) throw error;
      
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
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
      
      toast.success("Password updated successfully!");
      setIsPasswordRecovery(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate("/home");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show password recovery form
  if (isPasswordRecovery) {
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
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
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
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>Church of God Ministry of Prayer and the Word</CardDescription>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mt-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue as a Guest
          </Link>
        </CardHeader>
        <CardContent>
          {/* Password reset success banner */}
          {showPasswordResetBanner && (
            <div className={`mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 ${isBannerFading ? 'animate-fade-out' : 'animate-fade-in'}`}>
              <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
                ✓ Password reset successfully! Please sign in with your new password.
              </p>
            </div>
          )}
          
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={handleForgotPassword}
                    disabled={isLoading || biometric.isLoading}
                  >
                    Forgot password?
                  </Button>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember-me" className="text-sm cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || biometric.isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                
                {/* Biometric login option */}
                {biometric.isAvailable && biometric.hasStoredCredentials && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleBiometricLogin}
                    disabled={isLoading || biometric.isLoading}
                  >
                    <Fingerprint className="h-5 w-5 mr-2" />
                    {biometric.isLoading 
                      ? "Verifying..." 
                      : `Sign in with ${biometric.getBiometryName()}`
                    }
                  </Button>
                )}
                
                {/* Debug: Show biometric state on native */}
                {biometric.isNative && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    <p>Biometric Debug:</p>
                    <p>Available: {biometric.isAvailable ? "Yes" : "No"}</p>
                    <p>Type: {biometric.getBiometryName()}</p>
                    <p>Stored Creds: {biometric.hasStoredCredentials ? "Yes" : "No"}</p>
                    {biometric.diagnostic && <p>Info: {biometric.diagnostic}</p>}
                  </div>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              {/* Info message for previously rejected users */}
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Previously rejected?</span> If you were rejected before and have now become a member of our church, you can register again using the same email.
                </p>
              </div>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone (Optional)</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Biometric Opt-In Dialog */}
      <BiometricOptInDialog
        open={showBiometricOptIn}
        biometryName={biometric.getBiometryName()}
        onConfirm={handleBiometricOptInConfirm}
        onCancel={handleBiometricOptInCancel}
      />
    </div>
  );
};

export default Auth;
