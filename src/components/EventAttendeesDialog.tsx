import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface Attendee {
  id: string;
  user_id: string;
  created_at: string;
  profile: {
    full_name: string;
    phone: string | null;
    phone_visible: boolean;
    avatar_url: string | null;
    ministry: string | null;
  } | null;
  email?: string;
}

interface EventAttendeesDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EventAttendeesDialog = ({
  eventId,
  eventTitle,
  open,
  onOpenChange,
}: EventAttendeesDialogProps) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchAttendees();
    }
  }, [open, eventId]);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      // Fetch RSVPs with profile info
      const { data: rsvps, error: rsvpsError } = await supabase
        .from("event_rsvps")
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (rsvpsError) throw rsvpsError;

      // Fetch profiles for each RSVP
      const attendeesWithProfiles = await Promise.all(
        (rsvps || []).map(async (rsvp) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone, phone_visible, avatar_url, ministry")
            .eq("id", rsvp.user_id)
            .maybeSingle();

          return {
            ...rsvp,
            profile,
          };
        })
      );

      setAttendees(attendeesWithProfiles);
    } catch (error) {
      console.error("Error fetching attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Event Attendees
          </DialogTitle>
          <DialogDescription>
            People registered for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No one has registered for this event yet.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-3">
                {attendees.length} {attendees.length === 1 ? "person" : "people"} registered
              </div>
              {attendees.map((attendee, index) => (
                <div
                  key={attendee.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {attendee.profile?.full_name
                        ? getInitials(attendee.profile.full_name)
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {attendee.profile?.full_name || "Unknown"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    
                    {attendee.profile?.ministry && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {attendee.profile.ministry}
                      </div>
                    )}
                    
                    {attendee.profile?.phone && attendee.profile.phone_visible && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Phone className="h-3 w-3" />
                        <a 
                          href={`tel:${attendee.profile.phone}`}
                          className="hover:underline"
                        >
                          {attendee.profile.phone}
                        </a>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      Registered {format(new Date(attendee.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EventAttendeesDialog;
