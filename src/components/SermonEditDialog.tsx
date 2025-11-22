import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

interface Sermon {
  id: string;
  title: string;
  description: string | null;
  sermon_date: string;
  speaker: string | null;
  media_type: string;
  media_url: string | null;
}

interface SermonEditDialogProps {
  sermon: Sermon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SermonEditDialog = ({ sermon, open, onOpenChange, onSuccess }: SermonEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(sermon.title);
  const [description, setDescription] = useState(sermon.description || "");
  const [speaker, setSpeaker] = useState(sermon.speaker || "");
  const [sermonDate, setSermonDate] = useState(sermon.sermon_date.split("T")[0]);
  const [mediaType, setMediaType] = useState<"video" | "audio" | "pdf">(sermon.media_type as any);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setTitle(sermon.title);
    setDescription(sermon.description || "");
    setSpeaker(sermon.speaker || "");
    setSermonDate(sermon.sermon_date.split("T")[0]);
    setMediaType(sermon.media_type as any);
    setMediaFile(null);
    setRemoveMedia(false);
  }, [sermon]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
      setRemoveMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !sermonDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setUploading(!!mediaFile);

    try {
      let mediaUrl = sermon.media_url;

      // Handle media changes
      if (removeMedia) {
        mediaUrl = null;
      } else if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `sermons/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("sermon-media")
          .upload(filePath, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("sermon-media")
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
      }

      setUploading(false);

      // Update sermon
      const { error: updateError } = await supabase
        .from("sermons")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          speaker: speaker.trim() || null,
          sermon_date: sermonDate,
          media_type: mediaType,
          media_url: mediaUrl,
        })
        .eq("id", sermon.id);

      if (updateError) throw updateError;

      toast.success("Sermon updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Error updating sermon:", error);
      toast.error("Failed to update sermon");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sermon</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter sermon title"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-speaker">Speaker</Label>
            <Input
              id="edit-speaker"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="Enter speaker name"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-sermon-date">Sermon Date *</Label>
            <Input
              id="edit-sermon-date"
              type="date"
              value={sermonDate}
              onChange={(e) => setSermonDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter sermon description"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-media-type">Media Type</Label>
            <Select value={mediaType} onValueChange={(value: any) => setMediaType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sermon.media_url && !removeMedia && !mediaFile && (
            <div className="space-y-2">
              <Label>Current Media</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground flex-1">Media file attached</p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setRemoveMedia(true)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-media-file">
              {sermon.media_url && !removeMedia ? "Replace Media" : "Media File"}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-media-file"
                type="file"
                onChange={handleFileChange}
                accept={
                  mediaType === "video"
                    ? "video/*"
                    : mediaType === "audio"
                    ? "audio/*"
                    : "application/pdf"
                }
                className="flex-1"
              />
              {mediaFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMediaFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {mediaFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {mediaFile.name}
              </p>
            )}
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
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Uploading...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Sermon"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SermonEditDialog;
