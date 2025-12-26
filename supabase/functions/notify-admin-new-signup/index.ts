import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewSignupRequest {
  userName: string;
  userEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { userName, userEmail }: NewSignupRequest = await req.json();

    console.log("New signup notification for:", userName, userEmail);

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(JSON.stringify({ success: true, message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminIds = adminRoles.map(r => r.user_id);
    console.log("Found admin users:", adminIds.length);

    // Get admin emails from auth.users
    const adminEmails: string[] = [];
    for (const adminId of adminIds) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(adminId);
      if (authUser?.user?.email) {
        adminEmails.push(authUser.user.email);
      }
    }

    console.log("Found admin emails:", adminEmails.length);

    // Send email notifications to all admins
    if (adminEmails.length > 0) {
      try {
        const emailResponse = await resend.emails.send({
          from: "COGMPW <onboarding@resend.dev>",
          to: adminEmails,
          subject: "🆕 New Member Signup Awaiting Approval",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🆕 New Member Signup</h1>
              </div>
              
              <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">A new user has signed up and is awaiting your approval:</p>
                
                <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                  <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${userName}</p>
                  <p style="margin: 0;"><strong>Email:</strong> ${userEmail}</p>
                </div>
                
                <p style="margin-bottom: 20px;">Please review this application and approve or reject the user.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://cogmpw.lovable.app/admin/approvals" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Review Application</a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <strong>Church of God Mission Paris West</strong><br>
                  Admin Notification
                </p>
              </div>
            </body>
            </html>
          `,
        });

        console.log("Admin notification emails sent:", emailResponse);
      } catch (emailError) {
        console.error("Error sending admin emails:", emailError);
      }
    }

    // Get push tokens for all admins
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .in("user_id", adminIds);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
    }

    // Send push notifications to admins with tokens
    if (tokens && tokens.length > 0) {
      const pushTokens = tokens.map(t => t.token);
      console.log("Sending push notifications to", pushTokens.length, "admin devices");

      try {
        const notifications = pushTokens.map(async (token) => {
          const response = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${Deno.env.get("FCM_SERVER_KEY")}`,
            },
            body: JSON.stringify({
              to: token,
              notification: {
                title: "🆕 New Member Signup",
                body: `${userName} (${userEmail}) has signed up and is awaiting approval.`,
              },
              data: {
                type: "new_signup",
                click_action: "OPEN_APPROVALS",
              },
            }),
          });
          return response;
        });

        await Promise.allSettled(notifications);
        console.log("Push notifications sent successfully");
      } catch (pushError) {
        console.error("Error sending push notifications:", pushError);
      }
    }

    // Also create in-app notifications for all admins
    const notificationInserts = adminIds.map(adminId => ({
      user_id: adminId,
      title: "New Member Signup",
      message: `${userName} (${userEmail}) has signed up and is awaiting your approval.`,
      type: "new_signup",
      is_read: false,
    }));

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert(notificationInserts);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    } else {
      console.log("In-app notifications created for", adminIds.length, "admins");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-new-signup function:", error);
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
