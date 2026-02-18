import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Music, FileText, ArrowLeft, LogIn } from "lucide-react";
import { format } from "date-fns";
import VideoPlayer from "@/components/VideoPlayer";

interface Sermon {
  id: string;
  title: string;
  description: string | null;
  sermon_date: string;
  speaker: string | null;
  media_type: string;
  media_url: string | null;
  visibility: string;
}

const GuestSermons = () => {
  const navigate = useNavigate();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGuestSermons();
  }, []);

  const fetchGuestSermons = async () => {
    try {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .in("visibility", ["guest", "both"])
        .order("sermon_date", { ascending: false });

      if (error) throw error;
      setSermons(data || []);
    } catch (error) {
      console.error("Error fetching guest sermons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Sermons</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Watch and listen to our latest messages
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="sm:size-default"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Button size="sm" className="sm:size-default" onClick={() => navigate("/auth")}>
              <LogIn className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          </div>
        </div>

        {/* Sermons List */}
        <div className="space-y-6">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : sermons.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No sermons available at the moment
                </p>
                <Button onClick={() => navigate("/auth")}>
                  Sign in to access more content
                </Button>
              </CardContent>
            </Card>
          ) : (
            sermons.map((sermon) => (
              <Card key={sermon.id}>
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle>{sermon.title}</CardTitle>
                    <Badge variant="secondary" className="gap-1">
                      {getMediaIcon(sermon.media_type)}
                      {sermon.media_type}
                    </Badge>
                  </div>
                  <CardDescription>
                    {format(new Date(sermon.sermon_date), "MMMM d, yyyy")}
                    {sermon.speaker && ` • ${sermon.speaker}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sermon.description && (
                    <p className="text-muted-foreground">{sermon.description}</p>
                  )}
                  
                  {sermon.media_url && (
                    <div className="space-y-2">
                      {sermon.media_type === "video" && (
                        <VideoPlayer src={sermon.media_url!} className="w-full rounded-lg" />
                      )}
                      {sermon.media_type === "audio" && (
                        <audio controls className="w-full">
                          <source src={sermon.media_url} type="audio/mpeg" />
                          Your browser does not support the audio tag.
                        </audio>
                      )}
                      {sermon.media_type === "pdf" && (
                        <Button
                          onClick={() => window.open(sermon.media_url!, "_blank")}
                          className="w-full"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Sermon Notes (PDF)
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sign-in prompt */}
        {sermons.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-8 text-center space-y-4">
              <h3 className="text-xl font-semibold">Want access to more content?</h3>
              <p className="text-muted-foreground">
                Sign in to access our complete library of sermons, devotionals, and more.
              </p>
              <Button onClick={() => navigate("/auth")} size="lg">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GuestSermons;
