import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-REJECTION-EMAIL] ${step}${detailsStr}`);
};

interface RejectionEmailRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify the requesting user is an admin
    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Only admins can send rejection emails");
    }

    const { userId }: RejectionEmailRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    logStep("Processing rejection email", { userId });

    // Get user profile name before deletion
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    // Get user email from auth
    const { data: { user: targetUser } } = await supabaseClient.auth.admin.getUserById(userId);

    if (!targetUser?.email) {
      logStep("No email found for user", { userId });
      return new Response(
        JSON.stringify({ success: false, message: "No email found for user" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

    const emailHtml = `
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
            <img src="https://cogmpw.lovable.app/logo-source.webp" alt="COGMPW Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #6b7280;" />
          </div>
          
          <!-- Main Card -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(107, 114, 128, 0.2);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Account Registration Update</h1>
              <p style="color: #93c5fd; margin: 0; font-size: 14px; letter-spacing: 1px;">COGMPW CHURCH APP</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; margin: 0 0 16px 0;">
                Dear <strong style="color: #60a5fa;">${profile?.full_name || "Applicant"}</strong>,
              </p>
              
              <p style="color: #cbd5e1; font-size: 15px; line-height: 24px; margin: 0;">
                Thank you for your interest in joining the COGMPW church community app. After careful review, we were unable to approve your registration at this time.
              </p>
            </div>
            
            <!-- Reasons -->
            <div style="background: rgba(107, 114, 128, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(107, 114, 128, 0.2);">
              <h3 style="color: #9ca3af; margin: 0 0 16px 0; font-size: 16px;">This may be because:</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">• We couldn't verify your connection to our church community</td>
                </tr>
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">• The registration information provided was incomplete</td>
                </tr>
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">• There may have been a duplicate registration</td>
                </tr>
              </table>
            </div>
            
            <!-- Appeal Notice -->
            <div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(59, 130, 246, 0.2);">
              <h3 style="color: #60a5fa; margin: 0 0 12px 0; font-size: 16px;">💬 Want to Appeal?</h3>
              <p style="color: #e2e8f0; font-size: 14px; line-height: 22px; margin: 0;">
                If you believe this was a mistake or would like to provide additional information, simply <strong style="color: #93c5fd;">reply to this email</strong> and our team will review your request.
              </p>
            </div>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center; margin: 0 0 24px 0;">
              You're also welcome to register again with updated information.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px; padding-top: 24px;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">
              God bless you!
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
    `;

    const { error: emailError } = await resend.emails.send({
      from: "COGMPW <hello@noreply.cogmpw.com>",
      replyTo: "cogmoprayer@gmail.com",
      to: [targetUser.email],
      subject: "COGMPW App - Registration Update",
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending email", { error: emailError });
      throw emailError;
    }

    logStep("Rejection email sent successfully", { email: targetUser.email });

    // Delete the user from auth.users so they can re-register with the same email
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      logStep("Error deleting auth user", { error: deleteAuthError });
      // Don't throw - email was sent, just log the error
    } else {
      logStep("User deleted from auth.users", { userId });
    }

    return new Response(
      JSON.stringify({ success: true, email: targetUser.email, userDeleted: !deleteAuthError }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
