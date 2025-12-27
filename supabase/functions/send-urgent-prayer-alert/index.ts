import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UrgentPrayerAlertRequest {
  memberName: string;
  title: string;
  content: string;
}

// HTML escape function to prevent XSS in email templates
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
    // Authentication check - verify user is logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is an approved member
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_approved')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_approved) {
      console.error("User not approved:", profileError?.message);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Only approved members can submit prayer requests' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { memberName, title, content }: UrgentPrayerAlertRequest = await req.json();

    // Sanitize user input to prevent XSS
    const safeMemberName = escapeHtml(memberName);
    const safeTitle = escapeHtml(title);
    const safeContent = escapeHtml(content);

    console.log("Sending urgent prayer alert to pastor for user:", user.id);

    const emailResponse = await resend.emails.send({
      from: "COGMPW Prayer Requests <noreply@cogmpw.com>",
      to: ["cogmoprayer@gmail.com"],
      subject: `🙏 URGENT Prayer Request from ${safeMemberName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #fef2f2; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #dc2626; margin: 0; font-size: 24px;">🙏 URGENT Prayer Request</h1>
            </div>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #374151; margin: 0 0 8px 0; font-size: 14px;">
                <strong>From:</strong> ${safeMemberName}
              </p>
              <p style="color: #374151; margin: 0; font-size: 14px;">
                <strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
            
            <div style="margin: 24px 0;">
              <h2 style="color: #991b1b; margin: 0 0 12px 0; font-size: 18px;">${safeTitle}</h2>
              <p style="color: #374151; font-size: 16px; line-height: 24px; white-space: pre-wrap; margin: 0;">${safeContent}</p>
            </div>
            
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                ⚠️ This prayer request has been marked as <strong>URGENT</strong> and requires immediate attention.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://cogmpw.lovable.app/admin/prayer-requests" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View in COGMPW App</a>
            </div>
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                This is an automated notification from the COGMPW Church App.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Urgent prayer alert sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending urgent prayer alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
