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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-bottom: 24px;">Account Registration Update</h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Dear ${profile?.full_name || "Applicant"},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Thank you for your interest in joining the COGMPW church community app. After careful review, we were unable to approve your registration at this time.
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            This may be because:
          </p>
          
          <ul style="color: #374151; font-size: 16px; line-height: 24px;">
            <li>We couldn't verify your connection to our church community</li>
            <li>The registration information provided was incomplete</li>
            <li>There may have been a duplicate registration</li>
          </ul>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            If you believe this was a mistake or have questions, please contact the church office directly. You're welcome to register again with updated information.
          </p>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              God bless,<br>
              <strong>COGMPW Ministry Team</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "COGMPW <noreply@cogmpw.com>",
      to: [targetUser.email],
      subject: "COGMPW App - Registration Update",
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending email", { error: emailError });
      throw emailError;
    }

    logStep("Rejection email sent successfully", { email: targetUser.email });

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
