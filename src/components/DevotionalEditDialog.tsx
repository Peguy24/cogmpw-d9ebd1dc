import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Devotional {
  id: string;
  title: string;
  content: string;
  devotional_date: string;
  scripture_reference: string | null;
}

interface DevotionalEditDialogProps {
  devotional: Devotional;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DevotionalEditDialog = ({ devotional, open, onOpenChange, onSuccess }: DevotionalEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(devotional.title);
  const [content, setContent] = useState(devotional.content);
  const [scriptureReference, setScriptureReference] = useState(devotional.scripture_reference || "");
  const [devotionalDate, setDevotionalDate] = useState(devotional.devotional_date);

  useEffect(() => {
    setTitle(devotional.title);
    setContent(devotional.content);
    setScriptureReference(devotional.scripture_reference || "");
    setDevotionalDate(devotional.devotional_date);
  }, [devotional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim() || !devotionalDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("devotionals")
        .update({
          title: title.trim(),
          content: content.trim(),
          scripture_reference: scriptureReference.trim() || null,
          devotional_date: devotionalDate,
        })
        .eq("id", devotional.id);

      if (error) throw error;

      toast.success("Devotional updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Error updating devotional:", error);
      toast.error("Failed to update devotional");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Devotional</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter devotional title"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-devotional-date">Date *</Label>
            <Input
              id="edit-devotional-date"
              type="date"
              value={devotionalDate}
              onChange={(e) => setDevotionalDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-scripture">Scripture Reference</Label>
            <Input
              id="edit-scripture"
              value={scriptureReference}
              onChange={(e) => setScriptureReference(e.target.value)}
              placeholder="e.g., John 3:16, Psalm 23:1-6"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-content">Content *</Label>
            <Textarea
              id="edit-content"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Devotional"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DevotionalEditDialog;
