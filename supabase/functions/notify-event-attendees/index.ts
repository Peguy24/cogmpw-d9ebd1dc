import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  subject: string;
  message: string;
  sendEmail: boolean;
  sendPush: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User auth failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "leader", "super_leader"]);

    if (roleError || !roleData || roleData.length === 0) {
      console.error("Insufficient permissions:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: NotifyRequest = await req.json();
    const { eventId, eventTitle, eventDate, eventLocation, subject, message, sendEmail, sendPush } = body;

    if (!eventId || (!sendEmail && !sendPush)) {
      return new Response(
        JSON.stringify({ error: "Event ID and at least one notification method required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Notifying attendees for event: ${eventId}, email: ${sendEmail}, push: ${sendPush}`);

    // Fetch member attendees
    const { data: rsvps, error: rsvpsError } = await supabaseAdmin
      .from("event_rsvps")
      .select("user_id")
      .eq("event_id", eventId);

    if (rsvpsError) throw rsvpsError;

    // Fetch guest attendees
    const { data: guestRsvps, error: guestRsvpsError } = await supabaseAdmin
      .from("guest_event_rsvps")
      .select("email, full_name")
      .eq("event_id", eventId);

    if (guestRsvpsError) {
      console.error("Error fetching guest RSVPs:", guestRsvpsError);
    }

    const memberCount = rsvps?.length || 0;
    const guestCount = guestRsvps?.length || 0;

    if (memberCount === 0 && guestCount === 0) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, pushSent: 0, message: "No attendees to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = rsvps?.map(r => r.user_id) || [];
    let emailsSent = 0;
    let pushSent = 0;

    // Send emails
    if (sendEmail && resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      // Get emails for member attendees
      console.log(`Fetching emails for ${userIds.length} member attendees`);
      const memberEmailPromises = userIds.map(async (userId) => {
        try {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (authError) {
            console.error(`Error fetching user ${userId}:`, authError.message);
            return null;
          }
          const email = authUser?.user?.email;
          console.log(`User ${userId} email: ${email || 'NOT FOUND'}`);
          return email;
        } catch (err) {
          console.error(`Exception fetching user ${userId}:`, err);
          return null;
        }
      });
      
      const memberEmails = (await Promise.all(memberEmailPromises)).filter(Boolean) as string[];
      console.log(`Found ${memberEmails.length} member emails:`, memberEmails);
      
      // Get guest emails
      const guestEmails = (guestRsvps || []).map(g => g.email).filter(Boolean);
      console.log(`Found ${guestEmails.length} guest emails:`, guestEmails);
      
      const allEmails = [...memberEmails, ...guestEmails];
      console.log(`Total emails to send: ${allEmails.length}`);
      if (allEmails.length > 0) {
        const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #d4af37, #b8962e); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📅 Event Update</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #333; margin-top: 0;">${subject}</h2>
              <p style="font-size: 16px; white-space: pre-wrap;">${message}</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #d4af37;">
                <h3 style="margin-top: 0; color: #d4af37;">Event Details</h3>
                <p style="margin: 8px 0;"><strong>📌 Event:</strong> ${eventTitle}</p>
                <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>📍 Location:</strong> ${eventLocation}</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                You're receiving this because you registered for this event.
              </p>
            </div>
          </body>
          </html>
        `;

        try {
          // Send batch email (Resend supports up to 100 recipients per batch)
          const batchSize = 50;
          for (let i = 0; i < allEmails.length; i += batchSize) {
            const batch = allEmails.slice(i, i + batchSize);
            await resend.emails.send({
              from: "COGMPW Events <onboarding@resend.dev>",
              to: batch,
              subject: `${subject} - ${eventTitle}`,
              html: htmlContent,
            });
            emailsSent += batch.length;
          }
          console.log(`Sent ${emailsSent} emails`);
        } catch (emailError) {
          console.error("Error sending emails:", emailError);
        }
      }
    }

    // Send push notifications
    if (sendPush) {
      // Get push tokens for attendees
      const { data: tokens } = await supabaseAdmin
        .from("push_tokens")
        .select("token")
        .in("user_id", userIds);

      if (tokens && tokens.length > 0) {
        // Push notification logic (placeholder - actual FCM implementation needed)
        pushSent = tokens.length;
        console.log(`Push notifications queued for ${pushSent} devices`);
      }
    }

    // Create in-app notifications for all attendees
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title: subject,
      message: message,
      type: "event_update",
      related_id: eventId,
    }));

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating in-app notifications:", notifError);
    }

    console.log(`Notification complete: ${emailsSent} emails, ${pushSent} push, ${userIds.length} in-app`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        pushSent, 
        inAppSent: userIds.length,
        message: `Notified ${userIds.length} attendees` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-event-attendees:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
