import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ExternalLink, Loader2, Video, Radio, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import PullToRefresh from "react-simple-pull-to-refresh";

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
  
  // Livestream Form state
  const [livestreamPlatform, setLivestreamPlatform] = useState<"youtube" | "facebook" | "custom">("youtube");
  const [livestreamUrl, setLivestreamUrl] = useState("");
  const [livestreamTitle, setLivestreamTitle] = useState("");
  
  // Radio Form state
  const [radioUrl, setRadioUrl] = useState("");
  const [radioTitle, setRadioTitle] = useState("");
  
  // Radio Player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

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

  const handleSaveLivestream = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livestreamUrl.trim()) {
      toast.error("Please enter a livestream URL");
      return;
    }

    setSaving(true);

    try {
      // Deactivate existing livestream links (not radio)
      const { error: deactivateError } = await supabase
        .from("livestream_links")
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("platform", "radio");

      if (deactivateError) throw deactivateError;

      // Insert the new active livestream link
      const { error: insertError } = await supabase
        .from("livestream_links")
        .insert({
          platform: livestreamPlatform,
          url: livestreamUrl.trim(),
          title: livestreamTitle.trim() || null,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success("Livestream link updated successfully");
      setLivestreamUrl("");
      setLivestreamTitle("");
      loadLivestreams();
    } catch (error) {
      console.error("Error saving livestream:", error);
      toast.error("Failed to save livestream link");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRadio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!radioUrl.trim()) {
      toast.error("Please enter a radio stream URL");
      return;
    }

    setSaving(true);

    try {
      // Deactivate existing radio links
      const { error: deactivateError } = await supabase
        .from("livestream_links")
        .update({ is_active: false })
        .eq("is_active", true)
        .eq("platform", "radio");

      if (deactivateError) throw deactivateError;

      // Insert the new active radio link
      const { error: insertError } = await supabase
        .from("livestream_links")
        .insert({
          platform: "radio",
          url: radioUrl.trim(),
          title: radioTitle.trim() || null,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success("Radio stream updated successfully");
      setRadioUrl("");
      setRadioTitle("");
      loadLivestreams();
    } catch (error) {
      console.error("Error saving radio:", error);
      toast.error("Failed to save radio stream");
    } finally {
      setSaving(false);
    }
  };

  const activeLivestream = livestreams.find((ls) => ls.is_active && ls.platform !== "radio");
  const activeRadio = livestreams.find((ls) => ls.is_active && ls.platform === "radio");

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

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

  const handleRefresh = async () => {
    await loadLivestreams();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="space-y-4 md:space-y-6">
      {/* Radio Section */}
      {activeRadio && (
        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Radio className="h-4 w-4 md:h-5 md:w-5" />
                  {activeRadio.title || "Church Radio"}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Listen to our church radio station
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 md:p-6 space-y-4">
              <audio 
                ref={audioRef}
                src={activeRadio.url}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              
              <div className="flex items-center gap-3 md:gap-4">
                <Button
                  size="lg"
                  variant="default"
                  onClick={togglePlayPause}
                  className="h-12 w-12 md:h-14 md:w-14 rounded-full p-0 shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 md:h-6 md:w-6" />
                  ) : (
                    <Play className="h-5 w-5 md:h-6 md:w-6 ml-0.5" />
                  )}
                </Button>
                
                <div className="flex-1 flex items-center gap-2 md:gap-3 min-w-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleMute}
                    className="h-9 w-9 p-0 shrink-0"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      onValueChange={handleVolumeChange}
                      max={1}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Livestream Section */}
      {activeLivestream ? (
        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg break-words">
                  <Video className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                  <span className="break-words">{activeLivestream.title || "Live Stream"}</span>
                </CardTitle>
                <CardDescription className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {activeLivestream.platform}
                  </Badge>
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full md:w-auto text-sm md:text-base h-9 md:h-10"
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
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center p-4">
                <Button
                  size="lg"
                  onClick={() => window.open(activeLivestream.url, "_blank")}
                  className="gap-2 text-sm md:text-base h-10 md:h-11"
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
          <CardContent className="py-8 md:py-12 text-center">
            <Video className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
            <p className="text-sm md:text-base text-muted-foreground">No active livestream available</p>
          </CardContent>
        </Card>
      )}

      {isLeaderOrAdmin && (
        <>
          {/* Livestream Management Form */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Update Livestream Link</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Set the active livestream link that members will see
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveLivestream} className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="livestream-platform" className="text-sm md:text-base">Platform</Label>
                  <Select value={livestreamPlatform} onValueChange={(value: any) => setLivestreamPlatform(value)}>
                    <SelectTrigger className="text-sm md:text-base h-9 md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="livestream-title" className="text-sm md:text-base">Title (Optional)</Label>
                  <Input
                    id="livestream-title"
                    value={livestreamTitle}
                    onChange={(e) => setLivestreamTitle(e.target.value)}
                    placeholder="e.g., Sunday Morning Service"
                    maxLength={100}
                    className="text-sm md:text-base h-9 md:h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="livestream-url" className="text-sm md:text-base">Livestream URL *</Label>
                  <Input
                    id="livestream-url"
                    value={livestreamUrl}
                    onChange={(e) => setLivestreamUrl(e.target.value)}
                    placeholder="https://..."
                    required
                    className="text-sm md:text-base h-9 md:h-10"
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full text-sm md:text-base h-10 md:h-11">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Set Active Livestream"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Radio Management Form */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Update Radio Stream</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Set the active radio stream link that members can listen to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRadio} className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="radio-title" className="text-sm md:text-base">Title (Optional)</Label>
                  <Input
                    id="radio-title"
                    value={radioTitle}
                    onChange={(e) => setRadioTitle(e.target.value)}
                    placeholder="e.g., Church Radio 24/7"
                    maxLength={100}
                    className="text-sm md:text-base h-9 md:h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="radio-url" className="text-sm md:text-base">Radio Stream URL *</Label>
                  <Input
                    id="radio-url"
                    value={radioUrl}
                    onChange={(e) => setRadioUrl(e.target.value)}
                    placeholder="Direct audio stream URL (e.g., .mp3, .aac)"
                    required
                    className="text-sm md:text-base h-9 md:h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the direct audio stream URL for your radio station
                  </p>
                </div>

                <Button type="submit" disabled={saving} className="w-full text-sm md:text-base h-10 md:h-11">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Set Active Radio Stream"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </PullToRefresh>
  );
};

export default LivestreamSection;
