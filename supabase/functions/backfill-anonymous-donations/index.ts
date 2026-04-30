// One-shot maintenance function: looks up every donation that has user_id = NULL,
// fetches the corresponding Stripe customer email via the stored payment_intent_id,
// matches it against an existing member account, and links the donation to that member.
//
// Safe to run multiple times. Donations whose email does not match any member stay
// as guest donations (user_id remains NULL).
//
// Invoke once from the admin app (or via curl with the anon key).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[BACKFILL-ANON] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Caller must be an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: callerData } = await admin.auth.getUser(token);
    const caller = callerData.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // 1. Find all donations that are currently unattributed
    const { data: orphanDonations, error: fetchErr } = await admin
      .from("donations")
      .select("id, amount, category, created_at")
      .is("user_id", null)
      .eq("status", "completed");

    if (fetchErr) throw fetchErr;
    log("Found unattributed donations", { count: orphanDonations?.length ?? 0 });

    if (!orphanDonations || orphanDonations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, scanned: 0, recovered: 0, kept_as_guest: 0, results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2. Get their stripe_payment_intent_ids
    const donationIds = orphanDonations.map((d) => d.id);
    const { data: paymentDetails } = await admin
      .from("donation_payment_details")
      .select("donation_id, stripe_payment_intent_id")
      .in("donation_id", donationIds);

    const piByDonation = new Map<string, string>();
    (paymentDetails || []).forEach((p) => {
      if (p.stripe_payment_intent_id) piByDonation.set(p.donation_id, p.stripe_payment_intent_id);
    });

    // 3. Pre-load all member emails so we can match without N round trips
    const memberEmailToId = new Map<string, string>();
    let page = 1;
    // Load up to ~2000 users; fine for a church app.
    while (page <= 10) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) {
        log("listUsers error", { error: listErr.message });
        break;
      }
      const users = list?.users ?? [];
      users.forEach((u: any) => {
        if (u.email) memberEmailToId.set(u.email.toLowerCase(), u.id);
      });
      if (users.length < 200) break;
      page++;
    }
    log("Loaded members for matching", { count: memberEmailToId.size });

    // 4. For each orphan donation, look up the Stripe customer email and try to match
    let recovered = 0;
    let keptAsGuest = 0;
    const results: any[] = [];

    for (const donation of orphanDonations) {
      const paymentIntentId = piByDonation.get(donation.id);
      if (!paymentIntentId) {
        keptAsGuest++;
        results.push({ donation_id: donation.id, status: "no_payment_intent" });
        continue;
      }

      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        let email: string | null = (pi.receipt_email as string | null) || null;
        if (!email && pi.customer) {
          const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer.id;
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted) {
            email = (customer as any).email || null;
          }
        }

        if (!email) {
          keptAsGuest++;
          results.push({ donation_id: donation.id, status: "no_email_on_stripe" });
          continue;
        }

        const matchedUserId = memberEmailToId.get(email.toLowerCase());
        if (!matchedUserId) {
          keptAsGuest++;
          results.push({ donation_id: donation.id, status: "no_member_match", email });
          continue;
        }

        const { error: updateErr } = await admin
          .from("donations")
          .update({ user_id: matchedUserId })
          .eq("id", donation.id);

        if (updateErr) {
          results.push({ donation_id: donation.id, status: "update_failed", error: updateErr.message });
          continue;
        }

        recovered++;
        results.push({
          donation_id: donation.id,
          status: "recovered",
          email,
          user_id: matchedUserId,
          amount: donation.amount,
        });
      } catch (err) {
        results.push({
          donation_id: donation.id,
          status: "stripe_error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    log("Backfill complete", { scanned: orphanDonations.length, recovered, keptAsGuest });

    return new Response(
      JSON.stringify({
        success: true,
        scanned: orphanDonations.length,
        recovered,
        kept_as_guest: keptAsGuest,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
