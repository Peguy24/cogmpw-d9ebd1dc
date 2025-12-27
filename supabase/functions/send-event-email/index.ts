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

interface EventEmailRequest {
  eventTitle: string;
  eventDescription: string;
  eventDate: string;
  eventLocation: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated and has admin/leader role
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'leader'])
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { eventTitle, eventDescription, eventDate, eventLocation }: EventEmailRequest = await req.json();

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - skipping email notification");
      return new Response(
        JSON.stringify({ message: "Email notifications not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Get all approved users with their auth emails
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: approvedProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('is_approved', true);

    if (!approvedProfiles || approvedProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No approved users to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get email addresses from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching users:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Create a map of user IDs to emails
    const userEmails = new Map(
      authUsers.users.map(u => [u.id, u.email])
    );

    // Filter to only approved user emails
    const approvedUserIds = new Set(approvedProfiles.map(p => p.id));
    const recipientEmails = Array.from(userEmails.entries())
      .filter(([id]) => approvedUserIds.has(id))
      .map(([, email]) => email)
      .filter((email): email is string => !!email);

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No email addresses found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Format the date nicely
    const formattedDate = new Date(eventDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    // Send emails in batches (Resend allows multiple recipients)
    const emailResponse = await resend.emails.send({
      from: "COGMPW Church <noreply@cogmpw.com>",
      to: recipientEmails,
      subject: `New Event: ${escapeHtml(eventTitle)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Church Event! 📅</h1>
          <h2 style="color: #555;">${escapeHtml(eventTitle)}</h2>
          <p style="color: #666; line-height: 1.6;">${escapeHtml(eventDescription)}</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${escapeHtml(eventLocation)}</p>
            <p style="margin: 5px 0;"><strong>🕐 Date & Time:</strong> ${formattedDate}</p>
          </div>
          
          <p style="color: #666;">Open the COGMPW Church app to RSVP and get more details!</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            You're receiving this email because you're a member of COGMPW Church.
          </p>
        </div>
      `,
    });

    console.log(`Event email sent to ${recipientEmails.length} recipients:`, emailResponse);

    return new Response(
      JSON.stringify({ 
        message: "Event emails sent successfully",
        recipientCount: recipientEmails.length 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-event-email function:", error);
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
