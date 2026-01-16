import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, ArrowLeft, UserPlus } from "lucide-react";
import { format } from "date-fns";
import GuestRSVPDialog from "@/components/GuestRSVPDialog";

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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);

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

  const handleRSVPClick = (event: Event) => {
    setSelectedEvent(event);
    setShowRSVPDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/guest")}
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Upcoming Events</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Join us for worship, fellowship, and community
            </p>
          </div>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Events</h3>
              <p className="text-muted-foreground">
                Check back soon for our next events and gatherings
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {event.media_url && (
                  <div className="relative h-48 sm:h-64 overflow-hidden">
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
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-xl sm:text-2xl">{event.title}</CardTitle>
                  <CardDescription className="space-y-2 text-sm sm:text-base">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-medium">
                        {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-medium">
                        {format(new Date(event.event_date), "h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-medium break-words">{event.location}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Register to receive event reminders
                      </p>
                      <Button size="sm" className="w-full sm:w-auto sm:size-default" onClick={() => handleRSVPClick(event)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register for Event
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-6 sm:py-8 px-4 sm:px-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Already a Member?</h2>
            <p className="text-sm sm:text-lg mb-4 sm:mb-6 opacity-90">
              Sign in to access exclusive member content and features
            </p>
            <Button size="default" className="sm:size-lg" variant="secondary" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Guest RSVP Dialog */}
      {selectedEvent && (
        <GuestRSVPDialog
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          eventDate={format(new Date(selectedEvent.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          eventLocation={selectedEvent.location}
          open={showRSVPDialog}
          onOpenChange={setShowRSVPDialog}
          onSuccess={() => {
            // Optionally refresh or show confirmation
          }}
        />
      )}
    </div>
  );
};

export default GuestEvents;
