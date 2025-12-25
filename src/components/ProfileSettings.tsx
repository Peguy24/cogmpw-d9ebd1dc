import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Loader2, Camera, Lock, Eye, EyeOff } from "lucide-react";

interface ProfileSettingsProps {
  user: User;
}

const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const [phoneVisible, setPhoneVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile data
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
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
                <Camera className="h-4 w-4" />
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
          <div className="flex-1">
            <p className="font-medium">{fullName || "Member"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click the camera icon to change your photo
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </h3>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button 
            onClick={handlePasswordChange} 
            disabled={changingPassword || !newPassword || !confirmPassword}
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

      {/* Privacy Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="phone-visibility">Phone Number Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Allow other church members to see your phone number in the directory
              </p>
            </div>
            <Switch
              id="phone-visibility"
              checked={phoneVisible}
              onCheckedChange={handleTogglePhoneVisibility}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Church administrators and leaders can always view your contact information
          for ministry purposes. This setting only affects what other members can see.
        </p>
      </div>

      {/* Notification Preferences */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which types of notifications you want to receive
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="news-notifications">News & Announcements</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new church news and announcements are posted
              </p>
            </div>
            <Switch
              id="news-notifications"
              checked={newsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('news', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="events-notifications">Events</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new church events are created
              </p>
            </div>
            <Switch
              id="events-notifications"
              checked={eventsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('events', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="sermons-notifications">Sermons</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new sermons are available
              </p>
            </div>
            <Switch
              id="sermons-notifications"
              checked={sermonsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('sermons', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="devotionals-notifications">Devotionals</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new daily devotionals are posted
              </p>
            </div>
            <Switch
              id="devotionals-notifications"
              checked={devotionalsEnabled}
              onCheckedChange={(checked) => handleToggleNotification('devotionals', checked)}
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;