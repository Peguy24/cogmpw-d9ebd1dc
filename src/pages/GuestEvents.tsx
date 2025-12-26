import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, ArrowLeft, LogIn } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  media_url: string | null;
  media_type: string | null;
  visibility: string;
}

const GuestEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGuestEvents();
  }, []);

  const fetchGuestEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("visibility", ["guest", "both"])
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching guest events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container py-4 md:py-8 px-3 md:px-4 space-y-4 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/guest")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Upcoming Events</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Join us for worship, fellowship, and community
            </p>
          </div>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="space-y-4 md:space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="p-4 md:p-6">
                  <Skeleton className="h-6 md:h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                  <Skeleton className="h-20 md:h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-8 md:py-12 text-center">
              <Calendar className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">No Upcoming Events</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Check back soon for our next events and gatherings
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {event.media_url && (
                  <div className="relative h-40 sm:h-48 md:h-64 overflow-hidden">
                    {event.media_type === "video" ? (
                      <video
                        src={event.media_url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={event.media_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-2xl">{event.title}</CardTitle>
                  <CardDescription className="space-y-1.5 md:space-y-2 text-sm md:text-base">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
                      <span className="font-medium text-xs md:text-sm">
                        {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
                      <span className="font-medium text-xs md:text-sm">
                        {format(new Date(event.event_date), "h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
                      <span className="font-medium text-xs md:text-sm">{event.location}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                  <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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

export default GuestEvents;
