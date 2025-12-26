import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RejectionEmailRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user: requestingUser } } = await supabaseClient.auth.getUser();
    if (!requestingUser) {
      throw new Error("User not authenticated");
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Admin privileges required");
    }

    const { userId }: RejectionEmailRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log("Fetching user data for rejection:", userId);

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user?.email) {
      console.error("Error fetching auth user:", authError);
      throw new Error("Could not fetch user email");
    }

    const userEmail = authUser.user.email;
    console.log("Sending rejection email to:", userEmail);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const userName = profile?.full_name || "Applicant";

    const emailResponse = await resend.emails.send({
      from: "COGMPW <onboarding@resend.dev>",
      to: [userEmail],
      subject: "COGMPW Account Application Update",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Account Application Update</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${userName}</strong>,</p>
            
            <p style="margin-bottom: 20px;">Thank you for your interest in joining the COGMPW church app community.</p>
            
            <p style="margin-bottom: 20px;">After reviewing your application, we were unable to approve your account at this time. The COGMPW app is exclusively for members of our church community, and we could not verify your membership.</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #92400e;"><strong>Why was my application not approved?</strong></p>
              <p style="margin: 10px 0 0 0; color: #92400e;">This app is reserved for registered members of the Church of God Mission Paris West. If you believe this was a mistake or you are a member of our church, please contact us.</p>
            </div>
            
            <p style="margin-bottom: 20px;">If you would like to become a member of our church, we warmly invite you to:</p>
            
            <ul style="margin-bottom: 25px; padding-left: 20px;">
              <li style="margin-bottom: 10px;">🏠 Visit us during our Sunday worship services</li>
              <li style="margin-bottom: 10px;">📞 Contact the church office for more information</li>
              <li style="margin-bottom: 10px;">🤝 Speak with a church leader about membership</li>
            </ul>
            
            <p style="margin-bottom: 20px;">Once you become a member of our church family, you are welcome to apply again for app access.</p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              God bless you,<br>
              <strong>Church of God Mission Paris West</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Rejection email sent successfully:", emailResponse);

    // Log the rejection
    await supabaseAdmin.from("approval_logs").insert({
      approved_user_id: userId,
      approved_by_admin_id: requestingUser.id,
      action: "rejected",
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-rejection-email function:", error);
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
