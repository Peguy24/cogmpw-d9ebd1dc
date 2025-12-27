import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client with service role to access auth.users
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

    // Verify the requesting user is an admin
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

    // Check if requesting user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Admin privileges required");
    }

    const { userId }: ApprovalEmailRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log("Fetching user data for:", userId);

    // Get user email from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user?.email) {
      console.error("Error fetching auth user:", authError);
      throw new Error("Could not fetch user email");
    }

    const userEmail = authUser.user.email;
    console.log("Sending approval email to:", userEmail);

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const userName = profile?.full_name || "Member";

    // Send approval email
    const emailResponse = await resend.emails.send({
      from: "COGMPW <noreply@cogmpw.com>",
      to: [userEmail],
      subject: "🎉 Your COGMPW Account Has Been Approved!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to COGMPW! 🎉</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${userName}</strong>,</p>
            
            <p style="margin-bottom: 20px;">Great news! Your account has been <strong style="color: #10b981;">approved</strong> by our administrators.</p>
            
            <p style="margin-bottom: 20px;">You now have full access to the COGMPW church app where you can:</p>
            
            <ul style="margin-bottom: 25px; padding-left: 20px;">
              <li style="margin-bottom: 10px;">📰 Stay updated with church news and announcements</li>
              <li style="margin-bottom: 10px;">📅 View and RSVP to upcoming events</li>
              <li style="margin-bottom: 10px;">🎬 Watch sermons and devotionals</li>
              <li style="margin-bottom: 10px;">💬 Connect with fellow church members</li>
              <li style="margin-bottom: 10px;">🙏 Submit and track prayer requests</li>
              <li style="margin-bottom: 10px;">💝 Support the church through giving</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://cogmpw.com" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Open the App</a>
            </div>
            
            <p style="margin-bottom: 20px;">We're excited to have you as part of our church family!</p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Blessings,<br>
              <strong>Church of God Mission Paris West</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the approval
    await supabaseAdmin.from("approval_logs").insert({
      approved_user_id: userId,
      approved_by_admin_id: requestingUser.id,
      action: "approved",
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-approval-email function:", error);
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
