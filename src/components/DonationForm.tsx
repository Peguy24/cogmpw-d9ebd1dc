import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { DollarSign, Loader2, CreditCard, Heart } from "lucide-react";

const donationSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, { message: "Please enter a valid amount greater than 0" }),
  category: z.string().min(1, "Please select a category"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  type: z.enum(["one-time", "recurring"]),
  interval: z.enum(["month", "week"]).optional(),
});

type DonationFormValues = z.infer<typeof donationSchema>;

const DONATION_CATEGORIES = [
  "Tithes",
  "Offerings",
  "Building Fund",
  "Missions",
  "Youth Ministry",
  "General",
];

export const DonationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: "",
      category: "",
      notes: "",
      type: "one-time",
      interval: "month",
    },
  });

  const donationType = form.watch("type");

  const onSubmit = async (values: DonationFormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to make a donation");
        return;
      }

      console.log("Creating donation checkout for:", values);

      if (values.type === "recurring") {
        if (!values.interval) {
          toast.error("Please select a recurring interval");
          return;
        }

        const { data, error } = await supabase.functions.invoke("create-recurring-donation", {
          body: {
            amount: parseFloat(values.amount),
            category: values.category,
            notes: values.notes || null,
            interval: values.interval,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success("Opening recurring donation setup...");
          form.reset();
        }
      } else {
        const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
          body: {
            amount: parseFloat(values.amount),
            category: values.category,
            notes: values.notes || null,
          },
        });

        if (error) throw error;

        if (data?.url) {
          sessionStorage.setItem('pendingDonationSession', data.sessionId);
          window.open(data.url, '_blank');
          toast.success("Opening donation checkout...");
          form.reset();
        }
      }
    } catch (error) {
      console.error("Error creating donation checkout:", error);
      toast.error("Failed to create donation checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <CardTitle>Make a Donation</CardTitle>
        </div>
        <CardDescription>
          Support our church through your generous giving. All transactions are secure and processed through Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Donation Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one-time" id="one-time" />
                        <Label htmlFor="one-time" className="cursor-pointer">One-Time</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="recurring" id="recurring" />
                        <Label htmlFor="recurring" className="cursor-pointer">Recurring</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {donationType === "recurring" && (
              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Your donation will automatically renew each {field.value === "month" ? "month" : "week"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  {donationType === "recurring" && (
                    <FormDescription>
                      This amount will be charged automatically
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a donation category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DONATION_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note to your donation..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : donationType === "recurring" ? (
                  <>
                    <Heart className="mr-2 h-5 w-5" />
                    Set Up Recurring Donation
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Proceed to Checkout
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Supports Apple Pay and credit cards • Powered by Stripe
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
