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

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone_visible')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile settings');
      } else if (data) {
        setPhoneVisible(data.phone_visible ?? true);
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
    </div>
  );
};

export default ProfileSettings;
