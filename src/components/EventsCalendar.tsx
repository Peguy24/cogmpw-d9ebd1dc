import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import EventPostForm from "./EventPostForm";

interface EventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  created_at: string;
  rsvp_count?: number;
  user_rsvp?: boolean;
}

const EventsCalendar = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    getCurrentUser();
    fetchEvents();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCheckingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "leader"]);

      if (error) throw error;

      if (data && data.length > 0) {
        setUserRole(data[0].role);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    } finally {
      setCheckingRole(false);
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (eventsError) throw eventsError;

      const eventsWithRsvps = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("event_rsvps")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          const { data: userRsvp } = await supabase
            .from("event_rsvps")
            .select("id")
            .eq("event_id", event.id)
            .eq("user_id", user?.id || "")
            .maybeSingle();

          return {
            ...event,
            rsvp_count: count || 0,
            user_rsvp: !!userRsvp,
          } as EventItem;
        })
      );

      setEvents(eventsWithRsvps);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string, currentRsvp: boolean) => {
    if (!userId) return;

    try {
      if (currentRsvp) {
        const { error } = await supabase
          .from("event_rsvps")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);

        if (error) throw error;
        toast.success("RSVP removed");
      } else {
        const { error } = await supabase
          .from("event_rsvps")
          .insert({ event_id: eventId, user_id: userId });

        if (error) throw error;
        toast.success("RSVP confirmed! See you there 🙏");
      }

      fetchEvents();
    } catch (error) {
      console.error("Error handling RSVP:", error);
      toast.error("Failed to update RSVP");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const canCreateEvent = userRole === "admin" || userRole === "leader";

  return (
    <div className="space-y-4">
      {!checkingRole && canCreateEvent && (
        <EventPostForm onSuccess={fetchEvents} />
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No upcoming events. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle>{event.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(event.event_date), "PPP 'at' p")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">{event.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {event.rsvp_count} {event.rsvp_count === 1 ? "person" : "people"} going
                  </span>
                </div>

                <Button
                  variant={event.user_rsvp ? "secondary" : "default"}
                  onClick={() => handleRSVP(event.id, event.user_rsvp || false)}
                  className="gap-2"
                >
                  {event.user_rsvp ? (
                    <>
                      <Check className="h-4 w-4" />
                      I'm Going
                    </>
                  ) : (
                    "RSVP"
                  )}
                </Button>
              </div>

              {event.user_rsvp && (
                <Badge variant="outline" className="w-fit">
                  You're attending this event
                </Badge>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default EventsCalendar;
