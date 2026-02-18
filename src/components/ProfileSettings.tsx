import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Loader2, Camera as CameraIcon, Lock, Eye, EyeOff, Sun, Moon, Monitor, Trash2, ExternalLink, Fingerprint, Settings } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { BiometricSetupDialog } from "@/components/BiometricSetupDialog";
import { CameraPermissionDialog } from "@/components/CameraPermissionDialog";

interface ProfileSettingsProps {
  user: User;
}

const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const { theme, setTheme } = useTheme();
  const biometric = useBiometricAuth();
  const [phoneVisible, setPhoneVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile data
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCameraPermissionDialog, setShowCameraPermissionDialog] = useState(false);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification preferences
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [sermonsEnabled, setSermonsEnabled] = useState(true);
  const [devotionalsEnabled, setDevotionalsEnabled] = useState(true);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      // Load profile data including avatar
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('phone_visible, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        toast.error('Failed to load profile settings');
      } else if (profileData) {
        setPhoneVisible(profileData.phone_visible ?? true);
        setFullName(profileData.full_name || "");
        setAvatarUrl(profileData.avatar_url);
      }

      // Load notification preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) {
        console.error('Error loading notification preferences:', prefsError);
      } else if (prefsData) {
        setNewsEnabled(prefsData.news_enabled);
        setEventsEnabled(prefsData.events_enabled);
        setSermonsEnabled(prefsData.sermons_enabled);
        setDevotionalsEnabled(prefsData.devotionals_enabled);
      } else {
        // Create default preferences if they don't exist
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id });
        
        if (insertError) {
          console.error('Error creating notification preferences:', insertError);
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [user.id]);

  const handleAvatarClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Request permissions if not already granted/limited
        const perms = await Camera.checkPermissions();
        console.log('Camera permissions:', JSON.stringify(perms));
        
        const cameraReady = perms.camera === 'granted' || perms.camera === 'limited';
        const photosReady = perms.photos === 'granted' || perms.photos === 'limited';

        if (!cameraReady || !photosReady) {
          await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
        }

        // Always attempt getPhoto — it will fail if truly denied

        const photo = await Camera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
          quality: 80,
          width: 512,
          height: 512,
        });

        if (photo.dataUrl) {
          setUploadingAvatar(true);
          try {
            const response = await fetch(photo.dataUrl);
            const blob = await response.blob();
            const ext = photo.format || 'jpeg';
            const fileName = `${user.id}/avatar.${ext}`;

            if (avatarUrl) {
              const oldPath = avatarUrl.split('/avatars/')[1];
              if (oldPath) {
                await supabase.storage.from('avatars').remove([oldPath]);
              }
            }

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: publicUrl })
              .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            toast.success('Profile photo updated');
          } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Failed to upload photo');
          } finally {
            setUploadingAvatar(false);
          }
        }
      } catch (error: any) {
        if (error?.message?.includes('User cancelled')) return;
        console.error('Camera error:', error);
        setShowCameraPermissionDialog(true);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile photo updated');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTogglePhoneVisibility = async (checked: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone_visible: checked })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
    } else {
      setPhoneVisible(checked);
      toast.success('Privacy settings updated');
    }
    setSaving(false);
  };

  const handleToggleNotification = async (
    type: 'news' | 'events' | 'sermons' | 'devotionals',
    checked: boolean
  ) => {
    setSaving(true);
    
    const updateData = {
      news_enabled: type === 'news' ? checked : newsEnabled,
      events_enabled: type === 'events' ? checked : eventsEnabled,
      sermons_enabled: type === 'sermons' ? checked : sermonsEnabled,
      devotionals_enabled: type === 'devotionals' ? checked : devotionalsEnabled,
    };

    const { error } = await supabase
      .from('notification_preferences')
      .update(updateData)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences');
    } else {
      if (type === 'news') setNewsEnabled(checked);
      if (type === 'events') setEventsEnabled(checked);
      if (type === 'sermons') setSermonsEnabled(checked);
      if (type === 'devotionals') setDevotionalsEnabled(checked);
      toast.success('Notification preferences updated');
    }
    setSaving(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


  const openAppSettings = () => {
    // iOS deep-linking only reliably supports the app's Settings screen (not Face ID directly)
    if (Capacitor.getPlatform() === "ios") {
      try {
        window.location.href = "app-settings:";
      } catch {
        toast.info("Open Settings and find COGMPW in the apps list.", { duration: 6000 });
      }
      return;
    }

    toast.info("Open your phone Settings and find COGMPW in the apps list.", { duration: 6000 });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Profile Photo Section */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Profile Photo</h3>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-base sm:text-lg bg-primary/10 text-primary">
                {getInitials(fullName || user.email || "U")}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CameraIcon className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <p className="font-medium truncate">{fullName || "Member"}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap the camera icon to change your photo
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
          Change Password
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="new-password" className="text-sm">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10 h-10 sm:h-11"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirm-password" className="text-sm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10 h-10 sm:h-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={changingPassword || !newPassword || !confirmPassword}
            className="w-full sm:w-auto h-10 sm:h-11"
          >
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </div>
      </div>

      {/* Biometric Authentication - Native only */}
      {biometric.isNative && (
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 sm:h-5 sm:w-5" />
            {biometric.getBiometryName()} Login
          </h3>

          {!biometric.isAvailable ? (
            <div className="rounded-lg border bg-muted/50 p-3 sm:p-4 space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Biometrics are not available yet on this device.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">To enable Face ID:</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>Open <strong>Settings</strong> on your iPhone</li>
                  <li>Go to <strong>Face ID & Passcode</strong></li>
                  <li>Scroll to <strong>Other Apps</strong></li>
                  <li>Enable <strong>COGMPW</strong></li>
                </ol>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={biometric.refresh} disabled={biometric.isRefreshing}>
                  {biometric.isRefreshing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={openAppSettings} className="gap-1 text-xs">
                  <Settings className="h-3 w-3" />
                  App Settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                  <Label className="text-sm">{biometric.getBiometryName()} Enabled</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {biometric.hasStoredCredentials
                      ? `Use ${biometric.getBiometryName()} to sign in quickly`
                      : "Enable to sign in faster next time"}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {biometric.hasStoredCredentials ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await biometric.deleteCredentials();
                        toast.success(`${biometric.getBiometryName()} login disabled`);
                      }}
                    >
                      Disable
                    </Button>
                  ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowBiometricSetup(true)}>
                      Enable
                    </Button>
                  )}
                </div>
              </div>
              <BiometricSetupDialog
                open={showBiometricSetup}
                onOpenChange={setShowBiometricSetup}
                userEmail={user.email || ""}
                biometryName={biometric.getBiometryName()}
                onSaveCredentials={biometric.saveCredentials}
              />
              <CameraPermissionDialog
                open={showCameraPermissionDialog}
                onOpenChange={setShowCameraPermissionDialog}
              />
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Appearance</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <Label className="text-sm">Theme</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:flex-nowrap flex-shrink-0">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="icon"
                className="h-10 w-full sm:w-10"
                onClick={() => setTheme("light")}
                aria-label="Light mode"
                title="Light mode"
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="icon"
                className="h-10 w-full sm:w-10"
                onClick={() => setTheme("dark")}
                aria-label="Dark mode"
                title="Dark mode"
              >
                <Moon className="h-4 w-4" />
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="icon"
                className="h-10 w-full sm:w-10"
                onClick={() => setTheme("system")}
                aria-label="System default"
                title="System default"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Privacy Settings</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <Label htmlFor="phone-visibility" className="text-sm">Phone Number Visibility</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Allow other members to see your phone number
              </p>
            </div>
            <Switch
              id="phone-visibility"
              checked={phoneVisible}
              onCheckedChange={handleTogglePhoneVisibility}
              disabled={saving}
              className="flex-shrink-0 mt-0.5"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          <strong>Note:</strong> Administrators and leaders can always view your contact info for ministry purposes.
        </p>
      </div>

      {/* Notification Preferences */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Notification Preferences</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          Choose which notifications you want to receive
        </p>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <Label htmlFor="news-notifications" className="text-sm">News & Announcements</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                New church news and announcements
              </p>
            </div>
            <Switch
              id="news-notifications"
              checked={newsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('news', checked)}
              disabled={saving}
              className="flex-shrink-0 mt-0.5"
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <Label htmlFor="events-notifications" className="text-sm">Events</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                New church events
              </p>
            </div>
            <Switch
              id="events-notifications"
              checked={eventsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('events', checked)}
              disabled={saving}
              className="flex-shrink-0 mt-0.5"
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <Label htmlFor="sermons-notifications" className="text-sm">Sermons</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                New sermons available
              </p>
            </div>
            <Switch
              id="sermons-notifications"
              checked={sermonsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('sermons', checked)}
              disabled={saving}
              className="flex-shrink-0 mt-0.5"
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <Label htmlFor="devotionals-notifications" className="text-sm">Devotionals</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                New daily devotionals
              </p>
            </div>
            <Switch
              id="devotionals-notifications"
              checked={devotionalsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('devotionals', checked)}
              disabled={saving}
              className="flex-shrink-0 mt-0.5"
            />
          </div>
        </div>
      </div>

      {/* Account Deletion Section */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
          Delete Account
        </h3>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 sm:p-4 space-y-3">
          <p className="text-xs sm:text-sm text-foreground/90">
            You can request the deletion of your account and all associated data. This action is irreversible.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              size="sm"
              asChild
              className="w-full sm:w-auto"
            >
              <a 
                href="mailto:ministryofprayer2@gmail.com?subject=Account%20Deletion%20Request&body=I%20would%20like%20to%20request%20the%20deletion%20of%20my%20account%20and%20all%20associated%20data.%0A%0AMy%20registered%20email%20address%20is%3A%20%5BYour%20email%20here%5D%0A%0APlease%20confirm%20once%20my%20account%20has%20been%20deleted."
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Request Account Deletion
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full sm:w-auto"
            >
              <Link to="/privacy-policy#delete-account">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Deletion Policy
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We will process your request within 30 days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;