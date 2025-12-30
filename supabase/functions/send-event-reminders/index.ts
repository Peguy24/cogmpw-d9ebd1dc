import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize user input to prevent XSS in email HTML
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting event reminder check...");

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - skipping email reminders");
      return new Response(
        JSON.stringify({ message: "Email notifications not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Use service role for full access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Calculate time window: 24 to 26 hours from now
    const now = new Date();
    const twentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentySixHours = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    console.log(`Looking for events between ${twentyFourHours.toISOString()} and ${twentySixHours.toISOString()}`);

    // Find events happening in the next 24-26 hours
    const { data: upcomingEvents, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, title, description, event_date, location')
      .gte('event_date', twentyFourHours.toISOString())
      .lte('event_date', twentySixHours.toISOString());

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      throw eventsError;
    }

    if (!upcomingEvents || upcomingEvents.length === 0) {
      console.log("No upcoming events in the next 24 hours");
      return new Response(
        JSON.stringify({ message: "No upcoming events to remind" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${upcomingEvents.length} upcoming event(s)`);

    let totalRemindersSent = 0;

    // Process each event
    for (const event of upcomingEvents) {
      console.log(`Processing event: ${event.title} (${event.id})`);

      // Get RSVPs for this event
      const { data: rsvps, error: rsvpError } = await supabaseAdmin
        .from('event_rsvps')
        .select('user_id')
        .eq('event_id', event.id);

      if (rsvpError) {
        console.error(`Error fetching RSVPs for event ${event.id}:`, rsvpError);
        continue;
      }

      if (!rsvps || rsvps.length === 0) {
        console.log(`No RSVPs for event: ${event.title}`);
        continue;
      }

      console.log(`Found ${rsvps.length} RSVP(s) for event: ${event.title}`);

      // Check which users have already received reminders
      const { data: sentReminders } = await supabaseAdmin
        .from('event_reminders_sent')
        .select('user_id')
        .eq('event_id', event.id);

      const alreadySentUserIds = new Set(sentReminders?.map(r => r.user_id) || []);

      // Filter users who haven't received reminders yet
      const usersToRemind = rsvps.filter(rsvp => !alreadySentUserIds.has(rsvp.user_id));

      if (usersToRemind.length === 0) {
        console.log(`All users already reminded for event: ${event.title}`);
        continue;
      }

      console.log(`Need to remind ${usersToRemind.length} user(s) for event: ${event.title}`);

      // Get user emails and profiles
      const userIds = usersToRemind.map(r => r.user_id);
      
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      
      const userEmailMap = new Map(
        authUsers.users.map(u => [u.id, u.email])
      );

      // Send reminder emails
      for (const profile of profiles || []) {
        const email = userEmailMap.get(profile.id);
        if (!email) continue;

        const formattedDate = new Date(event.event_date).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });

        try {
          await resend.emails.send({
            from: "COGMPW Church <hello@noreply.cogmpw.com>",
            to: email,
            subject: `⏰ Reminder: ${escapeHtml(event.title)} Tomorrow!`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #1a1a2e; margin: 0; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto;">
                  <!-- Header with Logo -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <img src="https://cogmpw.lovable.app/logo-source.webp" alt="COGMPW Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #f59e0b;" />
                  </div>
                  
                  <!-- Main Card -->
                  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(245, 158, 11, 0.2);">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">⏰ Event Reminder</h1>
                      <p style="color: #fbbf24; margin: 0; font-size: 14px; letter-spacing: 1px;">HAPPENING TOMORROW!</p>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; margin: 0 0 16px 0;">
                        Hi <strong style="color: #60a5fa;">${escapeHtml(profile.full_name)}</strong>,
                      </p>
                      
                      <p style="color: #cbd5e1; font-size: 15px; line-height: 24px; margin: 0;">
                        This is a friendly reminder that you RSVP'd to the following event happening tomorrow:
                      </p>
                    </div>
                    
                    <!-- Event Details -->
                    <div style="background: rgba(245, 158, 11, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(245, 158, 11, 0.2);">
                      <h2 style="color: #fbbf24; margin: 0 0 12px 0; font-size: 20px;">${escapeHtml(event.title)}</h2>
                      <p style="color: #e2e8f0; font-size: 14px; line-height: 22px; margin: 0 0 16px 0;">${escapeHtml(event.description)}</p>
                      
                      <table style="width: 100%;">
                        <tr>
                          <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">📍 <strong>Location:</strong> ${escapeHtml(event.location)}</td>
                        </tr>
                        <tr>
                          <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">🕐 <strong>Date & Time:</strong> ${formattedDate}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center; margin: 0 0 24px 0;">
                      We look forward to seeing you there!
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <a href="https://cogmpw.lovable.app/home" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">View Event Details</a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="text-align: center; margin-top: 32px; padding-top: 24px;">
                    <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
                      You're receiving this reminder because you RSVP'd to this event.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0; font-weight: 600;">
                      COGMPW Ministry Team
                    </p>
                    <p style="color: #475569; font-size: 12px; margin: 16px 0 0 0;">
                      © ${new Date().getFullYear()} Church of God Ministry of Prayer and the Word
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          // Record that reminder was sent
          await supabaseAdmin
            .from('event_reminders_sent')
            .insert({
              event_id: event.id,
              user_id: profile.id,
            });

          totalRemindersSent++;
          console.log(`Reminder sent to ${email} for event: ${event.title}`);
        } catch (emailError) {
          console.error(`Failed to send reminder to ${email}:`, emailError);
        }
      }
    }

    console.log(`Completed sending ${totalRemindersSent} reminder(s)`);

    return new Response(
      JSON.stringify({ 
        message: "Event reminders sent successfully",
        remindersSent: totalRemindersSent,
        eventsProcessed: upcomingEvents.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-event-reminders function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
