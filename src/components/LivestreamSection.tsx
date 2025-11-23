import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Video, Radio } from "lucide-react";
import { toast } from "sonner";

interface LivestreamLink {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  is_active: boolean;
}

const LivestreamSection = () => {
  const [livestreams, setLivestreams] = useState<LivestreamLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [platform, setPlatform] = useState<"youtube" | "facebook" | "custom" | "radio">("youtube");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    checkRole();
    loadLivestreams();
  }, []);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "leader"]);

    setIsLeaderOrAdmin(roles && roles.length > 0);
  };

  const loadLivestreams = async () => {
    const { data, error } = await supabase
      .from("livestream_links")
      .select("*")
      .order("is_active", { ascending: false });

    if (error) {
      toast.error("Failed to load livestream links");
      console.error(error);
    } else {
      setLivestreams(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a livestream URL");
      return;
    }

    setSaving(true);

    try {
      // First, deactivate all existing links
      const { error: deactivateError } = await supabase
        .from("livestream_links")
        .update({ is_active: false })
        .eq("is_active", true);

      if (deactivateError) throw deactivateError;

      // Then insert the new active link
      const { error: insertError } = await supabase
        .from("livestream_links")
        .insert({
          platform,
          url: url.trim(),
          title: title.trim() || null,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success("Livestream link updated successfully");
      setUrl("");
      setTitle("");
      loadLivestreams();
    } catch (error) {
      console.error("Error saving livestream:", error);
      toast.error("Failed to save livestream link");
    } finally {
      setSaving(false);
    }
  };

  const activeLivestream = livestreams.find((ls) => ls.is_active && ls.platform !== "radio");
  const activeRadio = livestreams.find((ls) => ls.is_active && ls.platform === "radio");

  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      let videoId = "";

      // Handle different YouTube URL formats
      if (urlObj.hostname.includes("youtube.com")) {
        videoId = urlObj.searchParams.get("v") || "";
      } else if (urlObj.hostname.includes("youtu.be")) {
        videoId = urlObj.pathname.slice(1);
      }

      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }
    } catch (error) {
      console.error("Invalid URL:", error);
    }
    return null;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading livestream...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Radio Section */}
      {activeRadio && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  {activeRadio.title || "Church Radio"}
                </CardTitle>
                <CardDescription>
                  Listen to our church radio station
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6">
              <audio 
                controls 
                className="w-full"
                src={activeRadio.url}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Livestream Section */}
      {activeLivestream ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  {activeLivestream.title || "Live Stream"}
                </CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="mt-2">
                    {activeLivestream.platform}
                  </Badge>
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(activeLivestream.url, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Watch Now
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeLivestream.platform === "youtube" && getYouTubeEmbedUrl(activeLivestream.url) ? (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={getYouTubeEmbedUrl(activeLivestream.url)!}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube Livestream"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Button
                  size="lg"
                  onClick={() => window.open(activeLivestream.url, "_blank")}
                  className="gap-2"
                >
                  <Video className="h-5 w-5" />
                  Join Livestream
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No active livestream available</p>
          </CardContent>
        </Card>
      )}

      {isLeaderOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Update Livestream Link</CardTitle>
            <CardDescription>
              Set the active livestream link that members will see
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={(value: any) => setPlatform(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="radio">Radio</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Sunday Morning Service"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">{platform === "radio" ? "Radio Stream URL *" : "Livestream URL *"}</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={platform === "radio" ? "Direct audio stream URL (e.g., .mp3, .aac)" : "https://..."}
                  required
                />
                {platform === "radio" && (
                  <p className="text-xs text-muted-foreground">
                    Enter the direct audio stream URL for your radio station
                  </p>
                )}
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : platform === "radio" ? (
                  "Set Active Radio"
                ) : (
                  "Set Active Livestream"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LivestreamSection;
