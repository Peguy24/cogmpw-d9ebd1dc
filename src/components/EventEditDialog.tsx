import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const eventSchema = z.object({
  title: z.string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must be less than 200 characters" }),
  description: z.string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(2000, { message: "Description must be less than 2000 characters" }),
  event_date: z.date({
    required_error: "Event date is required",
  }),
  event_time: z.string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Time must be in HH:MM format (e.g., 14:30)",
    }),
  location: z.string()
    .trim()
    .min(1, { message: "Location is required" })
    .max(300, { message: "Location must be less than 300 characters" }),
  visibility: z.enum(["guest", "member", "both"], {
    required_error: "Please select who can view this event",
  }),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  media_url: string | null;
  media_type: string | null;
  visibility: string;
}

interface EventEditDialogProps {
  event: EventItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EventEditDialog = ({ event, open, onOpenChange, onSuccess }: EventEditDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(event.media_url);
  const [removeMedia, setRemoveMedia] = useState(false);

  const eventDate = new Date(event.event_date);
  const eventTime = format(eventDate, 'HH:mm');

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event.title,
      description: event.description,
      event_date: eventDate,
      event_time: eventTime,
      location: event.location,
      visibility: event.visibility as "guest" | "member" | "both",
    },
  });

  useEffect(() => {
    if (open) {
      const eventDate = new Date(event.event_date);
      const eventTime = format(eventDate, 'HH:mm');
      
      form.reset({
        title: event.title,
        description: event.description,
        event_date: eventDate,
        event_time: eventTime,
        location: event.location,
        visibility: event.visibility as "guest" | "member" | "both",
      });
      setMediaPreview(event.media_url);
      setMediaFile(null);
      setRemoveMedia(false);
    }
  }, [open, event, form]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 50MB",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    setRemoveMedia(false);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setRemoveMedia(true);
  };

  const onSubmit = async (values: EventFormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to edit events",
          variant: "destructive",
        });
        return;
      }

      const [hours, minutes] = values.event_time.split(':').map(Number);
      const eventDateTime = new Date(values.event_date);
      eventDateTime.setHours(hours, minutes, 0, 0);

      let mediaUrl: string | null = event.media_url;
      let mediaType: string | null = event.media_type;

      // Handle media changes
      if (removeMedia && event.media_url) {
        const oldFileName = event.media_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('event-media')
            .remove([oldFileName]);
        }
        mediaUrl = null;
        mediaType = null;
      } else if (mediaFile) {
        if (event.media_url) {
          const oldFileName = event.media_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('event-media')
              .remove([oldFileName]);
          }
        }

        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const { error } = await supabase
        .from("events")
        .update({
          title: values.title,
          description: values.description,
          event_date: eventDateTime.toISOString(),
          location: values.location,
          media_url: mediaUrl,
          media_type: mediaType,
          visibility: values.visibility,
        })
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter event description" 
                      className="min-h-[100px] resize-y"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        placeholder="14:30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who Can View This Event?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="guest">Guests Only</SelectItem>
                      <SelectItem value="member">Members Only</SelectItem>
                      <SelectItem value="both">Everyone (Guests & Members)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose who can see this event in the app
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Image or Video (Optional)</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    disabled={isSubmitting}
                  />
                  {mediaPreview && !removeMedia && (
                    <div className="relative">
                      {(mediaFile?.type.startsWith('video/') || event.media_type === 'video') ? (
                        <video 
                          src={mediaPreview} 
                          controls 
                          className="w-full rounded-lg max-h-64 object-cover"
                        />
                      ) : (
                        <img 
                          src={mediaPreview} 
                          alt="Preview" 
                          className="w-full rounded-lg max-h-64 object-cover"
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveMedia}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload an image or video (max 50MB). Supported formats: JPG, PNG, WEBP, GIF, MP4, WEBM
              </FormDescription>
            </FormItem>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Event"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EventEditDialog;
