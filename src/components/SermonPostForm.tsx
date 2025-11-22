import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

interface SermonPostFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SermonPostForm = ({ onSuccess, onCancel }: SermonPostFormProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [sermonDate, setSermonDate] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "audio" | "pdf">("video");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !sermonDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      let mediaUrl = null;

      // Upload media file if provided
      if (mediaFile) {
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert sermon
      const { error: insertError } = await supabase
        .from("sermons")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          speaker: speaker.trim() || null,
          sermon_date: sermonDate,
          media_type: mediaType,
          media_url: mediaUrl,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      toast.success("Sermon added successfully");
      onSuccess();
    } catch (error) {
      console.error("Error adding sermon:", error);
      toast.error("Failed to add sermon");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Sermon</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter sermon title"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaker">Speaker</Label>
            <Input
              id="speaker"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="Enter speaker name"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sermon-date">Sermon Date *</Label>
            <Input
              id="sermon-date"
              type="date"
              value={sermonDate}
              onChange={(e) => setSermonDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter sermon description"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="media-type">Media Type</Label>
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

          <div className="space-y-2">
            <Label htmlFor="media-file">Media File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="media-file"
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
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
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
                  Adding...
                </>
              ) : (
                "Add Sermon"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SermonPostForm;
