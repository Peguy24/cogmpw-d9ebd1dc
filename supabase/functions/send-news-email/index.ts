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

interface NewsEmailRequest {
  newsTitle: string;
  newsContent: string;
  isPinned: boolean;
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

    const { newsTitle, newsContent, isPinned }: NewsEmailRequest = await req.json();

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

    // Truncate content if too long for email preview
    const contentPreview = newsContent.length > 500 
      ? newsContent.substring(0, 500) + '...' 
      : newsContent;

    const pinnedBadge = isPinned 
      ? '<div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">📌 PINNED ANNOUNCEMENT</div>' 
      : '';

    // Send emails in batches
    const emailResponse = await resend.emails.send({
      from: "COGMPW Church <hello@noreply.cogmpw.com>",
      to: recipientEmails,
      subject: `${isPinned ? '📌 IMPORTANT: ' : '📢 '}${escapeHtml(newsTitle)}`,
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
              <img src="https://cogmpw.lovable.app/church-logo-gold.png" alt="COGMPW Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #3b82f6;" />
            </div>
            
            <!-- Main Card -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(59, 130, 246, 0.2);">
              <div style="text-align: center; margin-bottom: 24px;">
                ${pinnedBadge}
                <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">📢 Church News</h1>
                <p style="color: #93c5fd; margin: 0; font-size: 14px; letter-spacing: 1px;">NEW ANNOUNCEMENT</p>
              </div>
              
              <!-- News Content -->
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #60a5fa; margin: 0 0 16px 0; font-size: 20px;">${escapeHtml(newsTitle)}</h2>
                <p style="color: #e2e8f0; font-size: 15px; line-height: 26px; margin: 0; white-space: pre-wrap;">${escapeHtml(contentPreview)}</p>
              </div>
              
              ${newsContent.length > 500 ? '<p style="color: #94a3b8; font-size: 14px; font-style: italic; text-align: center; margin: 0 0 24px 0;">Open the COGMPW app to read the full announcement.</p>' : ''}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://cogmpw.lovable.app/home" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">Read in App</a>
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

    console.log(`News email sent to ${recipientEmails.length} recipients:`, emailResponse);

    return new Response(
      JSON.stringify({ 
        message: "News emails sent successfully",
        recipientCount: recipientEmails.length 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-news-email function:", error);
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
