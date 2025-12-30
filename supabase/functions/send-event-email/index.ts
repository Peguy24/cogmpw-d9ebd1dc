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
      from: "COGMPW Church <hello@noreply.cogmpw.com>",
      to: recipientEmails,
      subject: `📅 New Event: ${escapeHtml(eventTitle)}`,
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
              <img src="https://cogmpw.lovable.app/logo-source.webp" alt="COGMPW Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #8b5cf6;" />
            </div>
            
            <!-- Main Card -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(139, 92, 246, 0.2);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">📅 New Church Event!</h1>
                <p style="color: #c4b5fd; margin: 0; font-size: 14px; letter-spacing: 1px;">YOU'RE INVITED</p>
              </div>
              
              <!-- Event Details -->
              <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2);">
                <h2 style="color: #a78bfa; margin: 0 0 12px 0; font-size: 22px;">${escapeHtml(eventTitle)}</h2>
                <p style="color: #e2e8f0; font-size: 15px; line-height: 24px; margin: 0 0 20px 0;">${escapeHtml(eventDescription)}</p>
                
                <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px;">
                  <table style="width: 100%;">
                    <tr>
                      <td style="color: #e2e8f0; font-size: 14px; padding: 8px 0;">
                        <strong style="color: #c4b5fd;">📍 Location:</strong> ${escapeHtml(eventLocation)}
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #e2e8f0; font-size: 14px; padding: 8px 0;">
                        <strong style="color: #c4b5fd;">🕐 Date & Time:</strong> ${formattedDate}
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center; margin: 0 0 24px 0;">
                Open the COGMPW app to RSVP and get more details!
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://cogmpw.lovable.app/home" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">RSVP Now</a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding-top: 24px;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
                You're receiving this email because you're a member of COGMPW Church.
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
