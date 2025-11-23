import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  content: z.string().min(1, "Prayer request is required").max(2000, "Prayer request must be less than 2000 characters"),
  is_urgent: z.boolean().default(false),
});

export default function PrayerRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      is_urgent: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to submit a prayer request");
        return;
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { error } = await supabase
        .from("prayer_requests")
        .insert({
          user_id: user.id,
          title: values.title,
          content: values.content,
          is_urgent: values.is_urgent,
        });

      if (error) throw error;

      // Send email alert if urgent
      if (values.is_urgent) {
        try {
          await supabase.functions.invoke("send-urgent-prayer-alert", {
            body: {
              memberName: profile?.full_name || "A member",
              title: values.title,
              content: values.content,
            },
          });
        } catch (emailError) {
          console.error("Error sending urgent prayer alert:", emailError);
          // Don't fail the submission if email fails
        }
      }

      toast.success("Prayer request submitted successfully");
      form.reset();
    } catch (error: any) {
      console.error("Error submitting prayer request:", error);
      toast.error("Failed to submit prayer request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm md:text-base">Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter a brief title" 
                  className="text-sm md:text-base"
                  {...field} 
                />
              </FormControl>
              <FormMessage className="text-xs md:text-sm" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm md:text-base">Prayer Request</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Share your prayer request..." 
                  className="min-h-[120px] md:min-h-[150px] text-sm md:text-base resize-none"
                  {...field} 
                />
              </FormControl>
              <FormDescription className="text-xs md:text-sm">
                Your prayer request will be kept confidential and only seen by church leadership.
              </FormDescription>
              <FormMessage className="text-xs md:text-sm" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_urgent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 md:p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              </FormControl>
              <div className="space-y-1 leading-none flex-1">
                <FormLabel className="text-sm md:text-base font-medium">
                  Mark as urgent
                </FormLabel>
                <FormDescription className="text-xs md:text-sm">
                  Check this if you need immediate prayer
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full text-sm md:text-base h-10 md:h-11"
        >
          {isSubmitting ? "Submitting..." : "Submit Prayer Request"}
        </Button>
      </form>
    </Form>
  );
}
