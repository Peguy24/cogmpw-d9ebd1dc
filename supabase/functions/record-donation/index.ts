import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECORD-DONATION] ${step}${detailsStr}`);
};

const generateReceiptHtml = ({
  donorName,
  amount,
  category,
  date,
  transactionId,
  notes,
}: {
  donorName: string;
  amount: number;
  category: string;
  date: string;
  transactionId: string;
  notes?: string;
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Receipt</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <h1 style="color: #333; font-size: 28px; font-weight: bold; margin: 40px 0; text-align: center;">Donation Receipt</h1>
    
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Dear ${donorName},</p>
    
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
      Thank you for your generous donation to COGMPW. Your support helps us continue our mission and ministry.
    </p>
    
    <div style="margin: 32px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
      <h2 style="color: #333; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">Transaction Details</h2>
      <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Amount:</td>
          <td style="padding: 12px 0; color: #333; font-size: 14px; text-align: right;">$${amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Category:</td>
          <td style="padding: 12px 0; color: #333; font-size: 14px; text-align: right;">${category}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Date:</td>
          <td style="padding: 12px 0; color: #333; font-size: 14px; text-align: right;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Transaction ID:</td>
          <td style="padding: 12px 0; color: #333; font-size: 14px; text-align: right; word-break: break-all;">${transactionId}</td>
        </tr>
        ${notes ? `
        <tr>
          <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Notes:</td>
          <td style="padding: 12px 0; color: #333; font-size: 14px; text-align: right;">${notes}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="margin: 32px 0; padding: 20px; background-color: #fff4e6; border-radius: 8px;">
      <h2 style="color: #333; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">Tax Information</h2>
      <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">
      
      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
        COGMPW is a 501(c)(3) tax-exempt organization. This receipt serves as documentation of your charitable contribution for tax purposes. No goods or services were provided in exchange for this donation.
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Please retain this receipt for your tax records.
      </p>
    </div>
    
    <p style="color: #8898aa; font-size: 14px; line-height: 24px; margin-top: 32px;">
      God bless you,<br>
      COGMPW Ministry Team
    </p>
  </div>
</body>
</html>
  `;
};

const sendDonationReceipt = async ({
  email,
  donorName,
  amount,
  category,
  transactionId,
  notes,
}: {
  email: string;
  donorName: string;
  amount: number;
  category: string;
  transactionId: string;
  notes?: string;
}) => {
  try {
    logStep("Sending donation receipt", { email, amount, category });
    
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
    
    const html = generateReceiptHtml({
      donorName,
      amount,
      category,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      transactionId,
      notes,
    });

    const { error } = await resend.emails.send({
      from: 'COGMPW <hello@noreply.cogmpw.com>',
      to: [email],
      subject: `Donation Receipt - $${amount.toFixed(2)} to COGMPW`,
      html,
    });

    if (error) {
      logStep("Error sending receipt email", { error });
      throw error;
    }

    logStep("Receipt email sent successfully", { email });
  } catch (error) {
    logStep("Failed to send receipt email", { error: error instanceof Error ? error.message : String(error) });
    // Don't throw - we don't want email failures to fail the donation recording
  }
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

    // Try to get authenticated user, but allow guest donations too
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
      if (user) {
        logStep("User authenticated", { userId: user.id });
      }
    }

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    logStep("Processing session", { sessionId, hasUser: !!user });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    logStep("Payment verified", { sessionId, status: session.payment_status });

    // Get metadata from session
    const { user_id, category, notes, campaign_id, guest_email } = session.metadata || {};
    const amount = (session.amount_total || 0) / 100; // Convert from cents

    // Check if donation already recorded (prevent duplicates)
    const { data: existingDonation } = await supabaseClient
      .from('donations')
      .select('id')
      .eq('stripe_payment_intent_id', session.payment_intent as string)
      .maybeSingle();

    if (existingDonation) {
      logStep("Donation already recorded", { donationId: existingDonation.id });
      return new Response(JSON.stringify({ 
        success: true,
        alreadyRecorded: true,
        paymentIntentId: session.payment_intent as string,
        amount,
        category: category || 'General',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine the user_id to use:
    // 1. If authenticated user, use their ID
    // 2. If metadata has user_id (and it's not 'guest'), use that
    // 3. Otherwise, it's a guest donation (user_id = null)
    let effectiveUserId: string | null = null;
    if (user) {
      effectiveUserId = user.id;
    } else if (user_id && user_id !== 'guest') {
      effectiveUserId = user_id;
    }

    logStep("Determined user ID", { effectiveUserId, isGuest: !effectiveUserId });

    // Insert donation record using service role (bypasses RLS)
    const { error: insertError } = await supabaseClient
      .from('donations')
      .insert({
        user_id: effectiveUserId,
        amount,
        category: category || 'General',
        payment_method: 'stripe',
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        notes: notes || null,
        campaign_id: campaign_id || null,
      });

    if (insertError) {
      logStep("Error inserting donation", { error: insertError });
      throw insertError;
    }

    logStep("Donation recorded successfully", { amount, category, userId: effectiveUserId });

    // Send email receipt in background (non-blocking)
    const recipientEmail = user?.email || guest_email || session.customer_email;
    if (recipientEmail) {
      // Get donor name from various sources
      let donorName = 'Generous Donor';
      if (user?.user_metadata?.full_name) {
        donorName = user.user_metadata.full_name;
      } else if (session.customer_details?.name) {
        donorName = session.customer_details.name;
      } else if (session.customer_email) {
        // Use email prefix as fallback name
        donorName = session.customer_email.split('@')[0];
      }
      
      logStep("Sending receipt email", { recipientEmail, donorName });
      
      sendDonationReceipt({
        email: recipientEmail,
        donorName,
        amount,
        category: category || 'General',
        transactionId: session.payment_intent as string,
        notes: notes || undefined,
      }).catch((err) => {
        logStep("Background email task failed", { error: err });
      });
    } else {
      logStep("No email available for receipt", { hasUser: !!user, hasGuestEmail: !!guest_email, hasCustomerEmail: !!session.customer_email });
    }

    return new Response(JSON.stringify({ 
      success: true,
      paymentIntentId: session.payment_intent as string,
      amount,
      category: category || 'General',
    }), {
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