import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DevotionalPostFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DevotionalPostForm = ({ onSuccess, onCancel }: DevotionalPostFormProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scriptureReference, setScriptureReference] = useState("");
  const [devotionalDate, setDevotionalDate] = useState("");
  const [visibility, setVisibility] = useState<"guest" | "member" | "both">("member");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim() || !devotionalDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("devotionals")
        .insert({
          title: title.trim(),
          content: content.trim(),
          scripture_reference: scriptureReference.trim() || null,
          devotional_date: devotionalDate,
          visibility,
          created_by: user?.id,
        });

      if (error) throw error;

      const { data: insertedDevotional } = await supabase
        .from("devotionals")
        .select('id')
        .eq('title', title.trim())
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Create in-app notifications
      if (insertedDevotional) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.functions.invoke('create-notifications', {
            body: {
              title: 'New Devotional',
              message: title.trim(),
              type: 'devotional',
              relatedId: insertedDevotional.id
            },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });
        } catch (notifError) {
          console.error('Error creating notifications:', notifError);
        }
      }

      // Send push notification
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await supabase.functions.invoke('send-push-notification', {
          body: {
            title: '📖 New Daily Devotional',
            body: title.trim(),
            notificationType: 'devotionals',
          },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
      } catch (notifError) {
        console.error('Error sending push notification:', notifError);
        // Don't fail the whole operation if notification fails
      }

      toast.success("Devotional added successfully");
      onSuccess();
    } catch (error) {
      console.error("Error adding devotional:", error);
      toast.error("Failed to add devotional");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Devotional</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter devotional title"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="devotional-date">Date *</Label>
            <Input
              id="devotional-date"
              type="date"
              value={devotionalDate}
              onChange={(e) => setDevotionalDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scripture">Scripture Reference</Label>
            <Input
              id="scripture"
              value={scriptureReference}
              onChange={(e) => setScriptureReference(e.target.value)}
              placeholder="e.g., John 3:16, Psalm 23:1-6"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility *</Label>
            <Select value={visibility} onValueChange={(value: "guest" | "member" | "both") => setVisibility(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guest">Guests Only</SelectItem>
                <SelectItem value="member">Members Only</SelectItem>
                <SelectItem value="both">Everyone (Guests & Members)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter devotional content"
              rows={8}
              maxLength={5000}
              required
            />
            <p className="text-sm text-muted-foreground">
              {content.length}/5000 characters
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Devotional"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DevotionalPostForm;
