import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PASSWORD-RESET] ${step}${detailsStr}`);
};

interface PasswordResetRequest {
  email: string;
  redirectUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, redirectUrl }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    logStep("Processing password reset", { email });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate a password reset link
    const { data, error: resetError } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      logStep("Error generating reset link", { error: resetError });
      throw resetError;
    }

    if (!data?.properties?.hashed_token) {
      throw new Error("Failed to generate reset link");
    }

    // Construct the reset link manually with the correct redirect URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const hashedToken = data.properties.hashed_token;
    
    // For mobile app users, the redirect URL will be cogmpw.com/reset-password
    // which has Universal Links / App Links configured to open the native app.
    // Pass the token so the app can verify directly without going through the browser.
    const resetLink = `${supabaseUrl}/auth/v1/verify?token=${hashedToken}&type=recovery&redirect_to=${encodeURIComponent(redirectUrl)}`;
    
    logStep("Reset link generated", { email, redirectUrl });

    // Get user profile for personalization
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .single();

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
            <img src="https://cogmpw.lovable.app/church-logo-gold.png" alt="COGMPW Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #f59e0b;" />
          </div>
          
          <!-- Main Card -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(245, 158, 11, 0.2);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Password Reset</h1>
              <p style="color: #fcd34d; margin: 0; font-size: 14px; letter-spacing: 1px;">COGMPW ACCOUNT SECURITY</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; margin: 0 0 16px 0;">
                Dear <strong style="color: #60a5fa;">${profile?.full_name || "Member"}</strong>,
              </p>
              
              <p style="color: #cbd5e1; font-size: 15px; line-height: 24px; margin: 0;">
                We received a request to reset your password for your COGMPW account. Click the button below to create a new password.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">Reset My Password</a>
            </div>
            
            <!-- Security Notice -->
            <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid rgba(239, 68, 68, 0.2);">
              <p style="color: #fca5a5; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                ⚠️ If you did not request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>
            
            <p style="color: #94a3b8; font-size: 13px; line-height: 20px; text-align: center; margin: 0;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px; padding-top: 24px;">
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
      to: [email],
      subject: "Reset Your COGMPW Password",
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending email", { error: emailError });
      throw emailError;
    }

    logStep("Password reset email sent successfully", { email });

    return new Response(
      JSON.stringify({ success: true }),
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
