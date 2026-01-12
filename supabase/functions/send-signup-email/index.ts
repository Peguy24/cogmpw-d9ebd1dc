import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SIGNUP-EMAIL] ${step}${detailsStr}`);
};

interface SignupEmailRequest {
  email: string;
  fullName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, fullName }: SignupEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    logStep("Processing signup email", { email, fullName });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
    
    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
            <img src="https://cogmpw.lovable.app/church-logo-gold.png" alt="COGMPW Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #3b82f6;" />
          </div>
          
          <!-- Main Card -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(59, 130, 246, 0.2);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Welcome to COGMPW!</h1>
              <p style="color: #93c5fd; margin: 0; font-size: 14px; letter-spacing: 1px;">CHURCH OF GOD MINISTRY OF PRAYER AND THE WORD</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; margin: 0 0 16px 0;">
                Dear <strong style="color: #60a5fa;">${fullName || "New Member"}</strong>,
              </p>
              
              <p style="color: #cbd5e1; font-size: 15px; line-height: 24px; margin: 0;">
                Thank you for registering with our church family! We are blessed to have you join our community of believers.
              </p>
            </div>
            
            <!-- Pending Approval Notice -->
            <div style="background: linear-gradient(135deg, #78350f 0%, #451a03 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #fbbf24;">
              <h3 style="color: #fef3c7; margin: 0 0 8px 0; font-size: 16px; display: flex; align-items: center;">
                ⏳ Account Pending Approval
              </h3>
              <p style="color: #fde68a; font-size: 14px; line-height: 22px; margin: 0;">
                Your account is currently being reviewed by our church administrators. You will receive a confirmation email once approved.
              </p>
            </div>
            
            <!-- Features List -->
            <div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(59, 130, 246, 0.2);">
              <h3 style="color: #93c5fd; margin: 0 0 16px 0; font-size: 16px;">🎉 Once approved, you'll be able to:</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">📖 View daily devotionals and sermons</td>
                </tr>
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">📰 Stay updated with church news and events</td>
                </tr>
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">💬 Connect with other church members</td>
                </tr>
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">🙏 Submit prayer requests</td>
                </tr>
                <tr>
                  <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">💝 Support the church through giving</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center; margin: 0 0 24px 0;">
              We're excited to have you join our community! Please be patient while we review your registration.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="https://cogmpw.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">Open COGMPW App</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px; padding-top: 24px;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">
              God bless you abundantly!
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

    // Send welcome email to the new user
    const { error: emailError } = await resend.emails.send({
      from: "COGMPW <hello@noreply.cogmpw.com>",
      to: [email],
      subject: "Welcome to COGMPW - Registration Received!",
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending email to user", { error: emailError });
      throw emailError;
    }

    logStep("Signup email sent successfully to user", { email });

    // Get all admins and super_leaders to notify them
    try {
      const { data: adminRoles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "super_leader"]);

      if (rolesError) {
        logStep("Error fetching admin/super_leader roles", { error: rolesError });
      } else if (adminRoles && adminRoles.length > 0) {
        logStep("Found admins/super_leaders to notify", { count: adminRoles.length });

        // Create in-app notifications for each admin and super_leader
        const notifications = adminRoles.map((role) => ({
          user_id: role.user_id,
          title: "New Member Registration",
          message: `${fullName || "A new user"} (${email}) has registered and is awaiting approval.`,
          type: "approval_request",
        }));

        const { error: notifError } = await supabaseAdmin
          .from("notifications")
          .insert(notifications);

        if (notifError) {
          logStep("Error creating notifications", { error: notifError });
        } else {
          logStep("Notifications created for admins/super_leaders", { count: notifications.length });
        }

        // Get admin/super_leader emails to send email notifications
        const userIds = adminRoles.map((r) => r.user_id);
        const { data: adminUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

        if (usersError) {
          logStep("Error fetching admin users", { error: usersError });
        } else if (adminUsers) {
          const adminEmails = adminUsers.users
            .filter((u) => userIds.includes(u.id) && u.email)
            .map((u) => u.email as string);

          if (adminEmails.length > 0) {
            logStep("Sending notification emails to admins/super_leaders", { emails: adminEmails });

            const adminEmailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #1a1a2e; margin: 0; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <img src="https://cogmpw.lovable.app/church-logo-gold.png" alt="COGMPW Logo" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #f59e0b;" />
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(245, 158, 11, 0.3);">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <h1 style="color: #fbbf24; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">👤 New Member Registration</h1>
                    </div>
                    
                    <div style="background: rgba(245, 158, 11, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                      <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 12px 0;">
                        <strong style="color: #fbbf24;">Name:</strong> ${fullName || "Not provided"}
                      </p>
                      <p style="color: #e2e8f0; font-size: 16px; margin: 0;">
                        <strong style="color: #fbbf24;">Email:</strong> ${email}
                      </p>
                    </div>
                    
                    <p style="color: #cbd5e1; font-size: 15px; line-height: 24px; text-align: center; margin: 0 0 24px 0;">
                      This member is awaiting your approval to access the app.
                    </p>
                    
                    <div style="text-align: center;">
                      <a href="https://cogmpw.lovable.app/admin/approvals" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">Review Pending Approvals</a>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 24px;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                      COGMPW Admin Notification
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `;

            // Send email to all admins/super_leaders using BCC for privacy
            const { error: adminEmailError } = await resend.emails.send({
              from: "COGMPW <hello@noreply.cogmpw.com>",
              to: ["hello@noreply.cogmpw.com"],
              bcc: adminEmails,
              subject: `🔔 New Member Awaiting Approval: ${fullName || email}`,
              html: adminEmailHtml,
            });

            if (adminEmailError) {
              logStep("Error sending email to admins", { error: adminEmailError });
            } else {
              logStep("Admin notification emails sent successfully");
            }
          }
        }
      }
    } catch (notifyError) {
      logStep("Error in admin notification process", { error: notifyError });
      // Don't throw - we still want to return success for the main signup email
    }

    return new Response(
      JSON.stringify({ success: true, email }),
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
