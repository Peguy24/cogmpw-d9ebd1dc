import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
            from: "COGMPW Church <onboarding@resend.dev>",
            to: email,
            subject: `Reminder: ${event.title} Tomorrow! ⏰`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Event Reminder ⏰</h1>
                <p style="color: #666;">Hi ${profile.full_name},</p>
                <p style="color: #666;">This is a friendly reminder that you RSVP'd to the following event happening tomorrow:</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #333; margin-top: 0;">${event.title}</h2>
                  <p style="color: #666; line-height: 1.6;">${event.description}</p>
                  
                  <div style="margin-top: 15px;">
                    <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${event.location}</p>
                    <p style="margin: 5px 0;"><strong>🕐 Date & Time:</strong> ${formattedDate}</p>
                  </div>
                </div>
                
                <p style="color: #666;">We look forward to seeing you there!</p>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  You're receiving this reminder because you RSVP'd to this event in the COGMPW Church app.
                </p>
              </div>
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
