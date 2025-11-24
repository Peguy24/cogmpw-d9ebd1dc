import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const campaignSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
  target_amount: z.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: "Target amount must be greater than 0" }),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  is_active: z.boolean(),
}).refine(
  (data) => {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return end > start;
  },
  {
    message: "End date must be after start date",
    path: ["end_date"],
  }
);

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  campaign?: {
    id: string;
    title: string;
    description: string;
    target_amount: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CampaignForm = ({ campaign, onSuccess, onCancel }: CampaignFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: campaign?.title || "",
      description: campaign?.description || "",
      target_amount: campaign?.target_amount?.toString() || "",
      start_date: campaign?.start_date 
        ? new Date(campaign.start_date).toISOString().split('T')[0]
        : "",
      end_date: campaign?.end_date
        ? new Date(campaign.end_date).toISOString().split('T')[0]
        : "",
      is_active: campaign?.is_active ?? true,
    },
  });

  const onSubmit = async (data: CampaignFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const campaignData = {
        title: data.title,
        description: data.description,
        target_amount: parseFloat(data.target_amount),
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        is_active: data.is_active,
        created_by: user.id,
      };

      if (campaign) {
        // Update existing campaign
        const { error } = await supabase
          .from("giving_campaigns")
          .update(campaignData)
          .eq("id", campaign.id);

        if (error) throw error;
        toast.success("Campaign updated successfully!");
      } else {
        // Create new campaign
        const { error } = await supabase
          .from("giving_campaigns")
          .insert(campaignData);

        if (error) throw error;
        toast.success("Campaign created successfully!");
        form.reset();
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Failed to save campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-lg md:text-2xl">{campaign ? "Edit Campaign" : "Create New Campaign"}</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          {campaign 
            ? "Update campaign details below"
            : "Fill in the details to create a new giving campaign"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">Campaign Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Building Fund 2024"
                      maxLength={200}
                      className="min-h-[44px] text-sm md:text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs md:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose and goals of this campaign..."
                      className="resize-none text-sm md:text-base"
                      rows={4}
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs md:text-sm">
                    {field.value?.length || 0}/2000 characters
                  </FormDescription>
                  <FormMessage className="text-xs md:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">Target Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="50000.00"
                      className="min-h-[44px] text-sm md:text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs md:text-sm" />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base">Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="min-h-[44px] text-sm md:text-base" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs md:text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base">End Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="min-h-[44px] text-sm md:text-base" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs md:text-sm" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 md:p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm md:text-base">Active Campaign</FormLabel>
                    <FormDescription className="text-xs md:text-sm">
                      Make this campaign visible to members
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="min-h-[44px]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1 min-h-[44px] text-sm md:text-base">
                {isSubmitting ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px] text-sm md:text-base">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
