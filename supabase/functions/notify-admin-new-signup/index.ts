import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        // Use Firebase FCM to send notifications
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
