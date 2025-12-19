import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DONATION-CHECKOUT] ${step}${detailsStr}`);
};

// 🔴 IMPORTANT: Use HTTPS URL for Stripe redirects - Android App Links will intercept this
// Stripe doesn't support custom URL schemes, so we use the web URL which Android intercepts
const APP_BASE_URL = "https://cogmpw.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    let user = null;
    let userEmail = null;

    // Try to get authenticated user, but allow guest donations
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
      userEmail = user?.email;
      logStep("User authenticated", { userId: user?.id, email: userEmail });
    } else {
      logStep("Guest donation (no auth)");
    }

    const { amount, category, notes, campaign_id, guest_email } = await req.json();
    
    if (!amount || amount <= 0) {
      throw new Error("Invalid donation amount");
    }
    
    if (!category) {
      throw new Error("Donation category is required");
    }

    // For guests, require email
    const effectiveEmail = userEmail || guest_email;
    if (!effectiveEmail) {
      throw new Error("Email is required for donations");
    }

    logStep("Donation details received", { amount, category, isGuest: !user });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: effectiveEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("Creating new customer");
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    // Create checkout session with custom amount
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : effectiveEmail,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${category} Donation`,
              description: notes || `Church donation for ${category}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",

      // ⬇️ ALWAYS redirect to your Lovable URL (NO localhost)
      // Include the session id in the URL so the app can reliably record the donation
      success_url: `${APP_BASE_URL}/giving?donation=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE_URL}/giving?donation=canceled`,

      metadata: {
        user_id: user?.id || 'guest',
        category: category,
        notes: notes || '',
        campaign_id: campaign_id || '',
        guest_email: !user ? effectiveEmail : '',
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
