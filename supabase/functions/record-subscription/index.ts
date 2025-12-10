import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECORD-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    logStep("Processing session", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price'],
    });

    logStep("Session retrieved", { 
      subscriptionId: session.subscription,
      mode: session.mode,
      status: session.status 
    });

    if (session.mode !== 'subscription' || !session.subscription) {
      throw new Error("This is not a subscription session");
    }

    const subscription = session.subscription as Stripe.Subscription;
    const subscriptionItem = subscription.items.data[0];
    const price = subscriptionItem.price;
    const amount = (price.unit_amount || 0) / 100;
    const interval = price.recurring?.interval || 'month';

    // Get metadata from subscription
    const category = subscription.metadata?.category || 'Recurring Donation';
    const notes = subscription.metadata?.notes || `${interval === 'month' ? 'Monthly' : 'Weekly'} recurring donation`;

    logStep("Subscription details", { 
      amount, 
      interval, 
      category,
      subscriptionId: subscription.id 
    });

    // Record the subscription as a donation
    const { data: donation, error: insertError } = await supabaseClient
      .from("donations")
      .insert({
        user_id: user.id,
        amount: amount,
        category: category,
        payment_method: "stripe_subscription",
        status: "active_subscription",
        stripe_payment_intent_id: subscription.id,
        notes: notes,
      })
      .select()
      .single();

    if (insertError) {
      logStep("Error inserting donation", { error: insertError.message });
      throw insertError;
    }

    logStep("Subscription recorded successfully", { donationId: donation.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        donation,
        subscriptionId: subscription.id,
        amount,
        interval,
        category
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
