import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

interface WelcomeEmailRequest {
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
      throw new Error("Only admins can send welcome emails");
    }

    const { userId }: WelcomeEmailRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    logStep("Processing welcome email", { userId });

    // Get user profile
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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🎉 Welcome to COGMPW!</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Dear ${profile?.full_name || "Member"},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Great news! Your account has been <strong>approved</strong> and you now have full access to the COGMPW church app.
          </p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0;">What you can now do:</h3>
            <ul style="color: #374151; font-size: 14px; line-height: 22px; margin: 0; padding-left: 20px;">
              <li>View daily devotionals and sermons</li>
              <li>Stay updated with church news and events</li>
              <li>Connect with other church members in the community chat</li>
              <li>Submit prayer requests</li>
              <li>Support the church through giving</li>
              <li>RSVP to upcoming events</li>
            </ul>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Open the COGMPW app on your device to start exploring all the features available to you.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://cogmpw.lovable.app" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">Open COGMPW App</a>
          </div>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              We're blessed to have you as part of our community!<br><br>
              God bless,<br>
              <strong>COGMPW Ministry Team</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "COGMPW <onboarding@resend.dev>",
      to: [targetUser.email],
      subject: "🎉 Welcome to COGMPW - Your Account is Approved!",
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending email", { error: emailError });
      throw emailError;
    }

    logStep("Welcome email sent successfully", { email: targetUser.email });

    return new Response(
      JSON.stringify({ success: true, email: targetUser.email }),
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
