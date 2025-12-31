import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserCheck, Users, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MemberAttendee {
  user_id: string;
  full_name: string;
  checked_in: boolean;
  checked_in_at?: string;
}

interface GuestAttendee {
  id: string;
  full_name: string;
  email: string;
  checked_in: boolean;
  checked_in_at?: string;
}

interface EventCheckinDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EventCheckinDialog = ({
  eventId,
  eventTitle,
  open,
  onOpenChange,
}: EventCheckinDialogProps) => {
  const [members, setMembers] = useState<MemberAttendee[]>([]);
  const [guests, setGuests] = useState<GuestAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAttendees();
    }
  }, [open, eventId]);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch member RSVPs with check-in status
      const { data: rsvps, error: rsvpError } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", eventId);

      if (rsvpError) throw rsvpError;

      // Get profiles for members
      const userIds = rsvps?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Get check-ins
      const { data: checkins } = await supabase
        .from("event_checkins")
        .select("user_id, checked_in_at")
        .eq("event_id", eventId);

      const checkinMap = new Map(checkins?.map(c => [c.user_id, c.checked_in_at]) || []);

      const memberList: MemberAttendee[] = (profiles || []).map(p => ({
        user_id: p.id,
        full_name: p.full_name,
        checked_in: checkinMap.has(p.id),
        checked_in_at: checkinMap.get(p.id),
      }));

      // Sort: not checked in first, then alphabetically
      memberList.sort((a, b) => {
        if (a.checked_in !== b.checked_in) return a.checked_in ? 1 : -1;
        return a.full_name.localeCompare(b.full_name);
      });

      setMembers(memberList);

      // Fetch guest RSVPs with check-in status
      const { data: guestRsvps, error: guestError } = await supabase
        .from("guest_event_rsvps")
        .select("id, full_name, email")
        .eq("event_id", eventId);

      if (guestError) throw guestError;

      // Get guest check-ins
      const { data: guestCheckins } = await supabase
        .from("guest_event_checkins")
        .select("guest_rsvp_id, checked_in_at")
        .eq("event_id", eventId);

      const guestCheckinMap = new Map(guestCheckins?.map(c => [c.guest_rsvp_id, c.checked_in_at]) || []);

      const guestList: GuestAttendee[] = (guestRsvps || []).map(g => ({
        id: g.id,
        full_name: g.full_name,
        email: g.email,
        checked_in: guestCheckinMap.has(g.id),
        checked_in_at: guestCheckinMap.get(g.id),
      }));

      // Sort: not checked in first, then alphabetically
      guestList.sort((a, b) => {
        if (a.checked_in !== b.checked_in) return a.checked_in ? 1 : -1;
        return a.full_name.localeCompare(b.full_name);
      });

      setGuests(guestList);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      toast.error("Failed to load attendees");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberCheckin = async (userId: string, isCheckedIn: boolean) => {
    setCheckingIn(userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isCheckedIn) {
        // Remove check-in
        const { error } = await supabase
          .from("event_checkins")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);

        if (error) throw error;
        toast.success("Check-in removed");
      } else {
        // Add check-in
        const { error } = await supabase
          .from("event_checkins")
          .insert({
            event_id: eventId,
            user_id: userId,
            checked_in_by: user.id,
          });

        if (error) throw error;
        toast.success("Checked in!");
      }

      fetchAttendees();
    } catch (error) {
      console.error("Error updating check-in:", error);
      toast.error("Failed to update check-in");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleGuestCheckin = async (guestRsvpId: string, isCheckedIn: boolean) => {
    setCheckingIn(guestRsvpId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isCheckedIn) {
        // Remove check-in
        const { error } = await supabase
          .from("guest_event_checkins")
          .delete()
          .eq("event_id", eventId)
          .eq("guest_rsvp_id", guestRsvpId);

        if (error) throw error;
        toast.success("Check-in removed");
      } else {
        // Add check-in
        const { error } = await supabase
          .from("guest_event_checkins")
          .insert({
            event_id: eventId,
            guest_rsvp_id: guestRsvpId,
            checked_in_by: user.id,
          });

        if (error) throw error;
        toast.success("Checked in!");
      }

      fetchAttendees();
    } catch (error) {
      console.error("Error updating guest check-in:", error);
      toast.error("Failed to update check-in");
    } finally {
      setCheckingIn(null);
    }
  };

  const memberCheckedInCount = members.filter(m => m.checked_in).length;
  const guestCheckedInCount = guests.filter(g => g.checked_in).length;
  const totalCheckedIn = memberCheckedInCount + guestCheckedInCount;
  const totalAttendees = members.length + guests.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Event Check-in
          </DialogTitle>
          <DialogDescription>
            {eventTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 py-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totalCheckedIn}</p>
            <p className="text-xs text-muted-foreground">Checked In</p>
          </div>
          <div className="text-muted-foreground">/</div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalAttendees}</p>
            <p className="text-xs text-muted-foreground">Registered</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                Members ({memberCheckedInCount}/{members.length})
              </TabsTrigger>
              <TabsTrigger value="guests" className="gap-2">
                <Users className="h-4 w-4" />
                Guests ({guestCheckedInCount}/{guests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <ScrollArea className="h-[300px] pr-4">
                {members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No member RSVPs for this event
                  </p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          member.checked_in ? "bg-primary/5 border-primary/20" : "bg-background"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {member.checked_in ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            {member.checked_in && member.checked_in_at && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(member.checked_in_at), "h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={member.checked_in ? "outline" : "default"}
                          onClick={() => handleMemberCheckin(member.user_id, member.checked_in)}
                          disabled={checkingIn === member.user_id}
                        >
                          {checkingIn === member.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : member.checked_in ? (
                            "Undo"
                          ) : (
                            "Check In"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="guests">
              <ScrollArea className="h-[300px] pr-4">
                {guests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No guest RSVPs for this event
                  </p>
                ) : (
                  <div className="space-y-2">
                    {guests.map((guest) => (
                      <div
                        key={guest.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          guest.checked_in ? "bg-primary/5 border-primary/20" : "bg-background"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {guest.checked_in ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{guest.full_name}</p>
                            <p className="text-xs text-muted-foreground">{guest.email}</p>
                            {guest.checked_in && guest.checked_in_at && (
                              <p className="text-xs text-muted-foreground">
                                Checked in at {format(new Date(guest.checked_in_at), "h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={guest.checked_in ? "outline" : "default"}
                          onClick={() => handleGuestCheckin(guest.id, guest.checked_in)}
                          disabled={checkingIn === guest.id}
                        >
                          {checkingIn === guest.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : guest.checked_in ? (
                            "Undo"
                          ) : (
                            "Check In"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventCheckinDialog;
