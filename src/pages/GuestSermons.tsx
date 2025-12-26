import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Music, FileText, ArrowLeft, LogIn } from "lucide-react";
import { format } from "date-fns";

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
      <div className="container py-4 md:py-8 px-3 md:px-4 space-y-4 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">Sermons</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Watch and listen to our latest messages
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/guest")}
            className="self-start sm:self-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Sermons List */}
        <div className="space-y-4 md:space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="p-4 md:p-6">
                  <Skeleton className="h-5 md:h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : sermons.length === 0 ? (
            <Card>
              <CardContent className="py-8 md:py-12 text-center">
                <Video className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">
                  No sermons available at the moment
                </p>
              </CardContent>
            </Card>
          ) : (
            sermons.map((sermon) => (
              <Card key={sermon.id}>
                <CardHeader className="p-4 md:p-6">
                  <div className="flex items-start gap-2 flex-wrap">
                    <CardTitle className="text-base md:text-xl">{sermon.title}</CardTitle>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      {getMediaIcon(sermon.media_type)}
                      {sermon.media_type}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    {format(new Date(sermon.sermon_date), "MMMM d, yyyy")}
                    {sermon.speaker && ` • ${sermon.speaker}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
                  {sermon.description && (
                    <p className="text-sm md:text-base text-muted-foreground">{sermon.description}</p>
                  )}
                  
                  {sermon.media_url && (
                    <div className="space-y-2">
                      {sermon.media_type === "video" && (
                        <video controls className="w-full rounded-lg">
                          <source src={sermon.media_url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
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
                          className="w-full text-sm"
                          size="sm"
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

        {/* Subtle member link at bottom */}
        <div className="text-center pt-4">
          <p className="text-xs md:text-sm text-muted-foreground">
            Already a church member?{" "}
            <Button variant="link" className="p-0 h-auto text-xs md:text-sm" onClick={() => navigate("/auth")}>
              Sign in here
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestSermons;
