import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface ProfileSettingsProps {
  user: User;
}

const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const [phoneVisible, setPhoneVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Notification preferences
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [sermonsEnabled, setSermonsEnabled] = useState(true);
  const [devotionalsEnabled, setDevotionalsEnabled] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      // Load privacy settings
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('phone_visible')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        toast.error('Failed to load profile settings');
      } else if (profileData) {
        setPhoneVisible(profileData.phone_visible ?? true);
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
      // Update state
      if (type === 'news') setNewsEnabled(checked);
      if (type === 'events') setEventsEnabled(checked);
      if (type === 'sermons') setSermonsEnabled(checked);
      if (type === 'devotionals') setDevotionalsEnabled(checked);
      toast.success('Notification preferences updated');
    }
    setSaving(false);
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
