import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useState, useEffect } from "react";
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
import { setPaymentLoading } from "@/hooks/usePaymentLoading";

const openCheckoutUrl = async (url: string) => {
  console.log("[DonationForm] Opening checkout URL:", url);
  console.log("[DonationForm] Is native platform:", Capacitor.isNativePlatform());

  try {
    if (Capacitor.isNativePlatform()) {
      // Show loading overlay for native platforms
      setPaymentLoading(true);
      console.log("[DonationForm] Opening in Capacitor Browser...");
      await Browser.open({ url });
      console.log("[DonationForm] Browser.open() completed");
    } else {
      // Web - check if we're in an iframe (Lovable preview)
      const isInIframe = window !== window.parent;
      if (isInIframe) {
        // In preview iframe - open in new tab as fallback for testing
        window.open(url, "_blank");
      } else {
        // On deployed site - redirect in same tab
        window.location.href = url;
      }
    }
  } catch (error) {
    console.error("[DonationForm] Failed to open checkout URL:", error);
    setPaymentLoading(false);
    toast.error("Unable to open the donation page. Please try again.");
  }
};

const donationSchema = z.object({
  amount: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Please enter a valid amount greater than 0" },
  ),
  category: z.string().min(1, "Please select a category"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  type: z.enum(["one-time", "recurring"]),
  interval: z.enum(["month", "week"]).optional(),
  campaign_id: z.string().optional(),
  guest_email: z.string().email("Invalid email address").optional(),
});

type DonationFormValues = z.infer<typeof donationSchema>;

const DONATION_CATEGORIES = ["Tithes", "Offerings"];

export const DonationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampaignFromStorage, setSelectedCampaignFromStorage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const campaignId = sessionStorage.getItem("selectedCampaignId");
    if (campaignId) {
      setSelectedCampaignFromStorage(campaignId);
    }

    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: "",
      category: "",
      notes: "",
      type: "one-time",
      interval: "month",
      campaign_id: selectedCampaignFromStorage || undefined,
    },
  });

  const donationType = form.watch("type");

  const onSubmit = async (values: DonationFormValues) => {
    // Give immediate feedback on mobile/native so it never feels like "nothing happens"
    const loadingToastId = toast.loading("Preparing secure checkout…");

    try {
      setIsSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;

      // For guests, require email
      if (!session && !values.guest_email) {
        toast.dismiss(loadingToastId);
        toast.error("Please provide your email address");
        return;
      }

      console.log("[DonationForm] Creating donation checkout for:", values);

      if (values.type === "recurring") {
        if (!values.interval) {
          toast.dismiss(loadingToastId);
          toast.error("Please select a recurring interval");
          return;
        }

        const { data, error } = await supabase.functions.invoke("create-recurring-donation", {
          body: {
            amount: parseFloat(values.amount),
            category: values.category,
            notes: values.notes || null,
            interval: values.interval,
            isNativeApp: Capacitor.isNativePlatform(),
          },
          headers: authHeaders,
        });

        if (error) throw error;

        if (!data?.url) {
          throw new Error("No checkout URL returned");
        }

        toast.dismiss(loadingToastId);
        toast.success("Opening recurring donation setup…");
        await openCheckoutUrl(data.url);
      } else {
        const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
          body: {
            amount: parseFloat(values.amount),
            category: values.category,
            notes: values.notes || null,
            campaign_id: values.campaign_id || selectedCampaignFromStorage || null,
            guest_email: values.guest_email || null,
            isNativeApp: Capacitor.isNativePlatform(),
          },
          headers: authHeaders,
        });

        if (error) throw error;

        if (!data?.url) {
          throw new Error("No checkout URL returned");
        }

        if (data.sessionId) {
          sessionStorage.setItem("pendingDonationSession", data.sessionId);
        }
        sessionStorage.removeItem("selectedCampaignId"); // Clear after use

        toast.dismiss(loadingToastId);
        toast.success("Opening secure checkout…");
        await openCheckoutUrl(data.url);
        form.reset();
      }
    } catch (error) {
      console.error("[DonationForm] Error creating donation checkout:", error);
      toast.dismiss(loadingToastId);
      toast.error("Failed to open checkout. Please try again.");
      setPaymentLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };


  const onInvalid = (errors: any) => {
    console.log("[DonationForm] Form validation errors:", errors);
    if (errors?.category) {
      toast.error("Please select a category");
      return;
    }
    if (errors?.amount) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (errors?.guest_email) {
      toast.error("Please enter a valid email address");
      return;
    }
    toast.error("Please check the form and try again");
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
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Donation Type</FormLabel>
                  <FormControl>
                    <RadioGroup 
                      onValueChange={(value) => {
                        if (value === "recurring" && !isAuthenticated) {
                          toast.error("Please sign in to set up recurring donations");
                          return;
                        }
                        field.onChange(value);
                      }} 
                      defaultValue={field.value} 
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one-time" id="one-time" />
                        <Label htmlFor="one-time" className="cursor-pointer">
                          One-Time
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="recurring" id="recurring" disabled={!isAuthenticated} />
                        <Label htmlFor="recurring" className={`cursor-pointer ${!isAuthenticated ? "text-muted-foreground" : ""}`}>
                          Recurring {!isAuthenticated && "(Sign in required)"}
                        </Label>
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

            {!isAuthenticated && (
              <FormField
                control={form.control}
                name="guest_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address (Required for guests)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormDescription>We'll send your donation receipt to this email</FormDescription>
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
                      <Input type="number" step="0.01" min="1" placeholder="0.00" className="pl-9" {...field} />
                    </div>
                  </FormControl>
                  {donationType === "recurring" && (
                    <FormDescription>This amount will be charged automatically</FormDescription>
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
                type="button"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
                onClick={() => form.handleSubmit(onSubmit, onInvalid)()}
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
