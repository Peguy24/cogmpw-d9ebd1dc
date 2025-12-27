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
      to: ["ministryofprayer@verizon.net"],
      subject: `🙏 URGENT Prayer Request from ${safeMemberName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🙏 Urgent Prayer Request</h2>
          <p style="font-size: 16px; color: #374151;">
            <strong>From:</strong> ${safeMemberName}
          </p>
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">${safeTitle}</h3>
            <p style="color: #7f1d1d; white-space: pre-wrap;">${safeContent}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This prayer request has been marked as urgent and requires immediate attention.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Please log in to the COGMPW app to respond to this request.
          </p>
        </div>
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
