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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Download, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import NotifyAttendeesDialog from "./NotifyAttendeesDialog";

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
  isGuest?: boolean;
}

interface GuestAttendee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface EventAttendeesDialogProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EventAttendeesDialog = ({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  open,
  onOpenChange,
}: EventAttendeesDialogProps) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [guestAttendees, setGuestAttendees] = useState<GuestAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAttendees();
    }
  }, [open, eventId]);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      // Fetch member RSVPs with profile info
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
            isGuest: false,
          };
        })
      );

      setAttendees(attendeesWithProfiles);

      // Fetch guest RSVPs
      const { data: guests, error: guestsError } = await supabase
        .from("guest_event_rsvps")
        .select("id, full_name, email, phone, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (!guestsError && guests) {
        setGuestAttendees(guests);
      }
    } catch (error) {
      console.error("Error fetching attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-event-attendees", {
        body: { eventId, eventTitle },
      });

      if (error) throw error;

      if (data?.csv) {
        // Create and download the CSV file
        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${eventTitle.replace(/[^a-z0-9]/gi, "_")}_attendees.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(`Exported ${data.count} attendees`);
      }
    } catch (error) {
      console.error("Error exporting attendees:", error);
      toast.error("Failed to export attendees");
    } finally {
      setExporting(false);
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
          ) : attendees.length === 0 && guestAttendees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No one has registered for this event yet.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-sm text-muted-foreground">
                  {attendees.length + guestAttendees.length} total ({attendees.length} members, {guestAttendees.length} guests)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotifyDialog(true)}
                    disabled={attendees.length + guestAttendees.length === 0}
                    className="gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Notify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={exporting || (attendees.length === 0 && guestAttendees.length === 0)}
                    className="gap-1"
                  >
                    {exporting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    Export
                  </Button>
                </div>
              </div>
              {/* Member Attendees */}
              {attendees.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Members</h4>
                  {attendees.map((attendee, index) => (
                    <div
                      key={attendee.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors mb-2"
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

              {/* Guest Attendees */}
              {guestAttendees.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Guests</h4>
                  {guestAttendees.map((guest, index) => (
                    <div
                      key={guest.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors mb-2"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(guest.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {guest.full_name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Guest #{index + 1}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {guest.email}
                        </div>
                        
                        {guest.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Phone className="h-3 w-3" />
                            <a 
                              href={`tel:${guest.phone}`}
                              className="hover:underline"
                            >
                              {guest.phone}
                            </a>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          Registered {format(new Date(guest.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      <NotifyAttendeesDialog
        eventId={eventId}
        eventTitle={eventTitle}
        eventDate={eventDate}
        eventLocation={eventLocation}
        attendeeCount={attendees.length + guestAttendees.length}
        open={showNotifyDialog}
        onOpenChange={setShowNotifyDialog}
      />
    </Dialog>
  );
};

export default EventAttendeesDialog;
