import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Loader2, Mail, Bell } from "lucide-react";
import { toast } from "sonner";

interface NotifyAttendeesDialogProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  attendeeCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotifyAttendeesDialog = ({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  attendeeCount,
  open,
  onOpenChange,
}: NotifyAttendeesDialogProps) => {
  const [subject, setSubject] = useState(`Update: ${eventTitle}`);
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please enter a subject and message");
      return;
    }

    if (!sendEmail && !sendPush) {
      toast.error("Please select at least one notification method");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-event-attendees", {
        body: {
          eventId,
          eventTitle,
          eventDate,
          eventLocation,
          subject,
          message,
          sendEmail,
          sendPush,
        },
      });

      if (error) throw error;

      toast.success(data?.message || "Notifications sent successfully");
      onOpenChange(false);
      setMessage("");
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast.error("Failed to send notifications");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Notify Attendees
          </DialogTitle>
          <DialogDescription>
            Send a message to {attendeeCount} {attendeeCount === 1 ? "person" : "people"} registered for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message to attendees..."
              rows={4}
            />
          </div>

          <div className="space-y-3">
            <Label>Send via</Label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <label
                  htmlFor="sendEmail"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendPush"
                  checked={sendPush}
                  onCheckedChange={(checked) => setSendPush(checked === true)}
                />
                <label
                  htmlFor="sendPush"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  Push Notification & In-App
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Notification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotifyAttendeesDialog;
