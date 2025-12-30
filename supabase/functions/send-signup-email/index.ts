import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Welcome to COGMPW!</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Dear ${fullName || "New Member"},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            Thank you for registering with the <strong>Church of God Ministry of Prayer and the Word</strong>!
          </p>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #92400e; margin: 0 0 12px 0;">⏳ Pending Approval</h3>
            <p style="color: #78350f; font-size: 14px; line-height: 22px; margin: 0;">
              Your account is currently pending approval by our church administrators. You will receive another email once your account has been approved and you have full access to the app.
            </p>
          </div>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0;">What to expect:</h3>
            <ul style="color: #374151; font-size: 14px; line-height: 22px; margin: 0; padding-left: 20px;">
              <li>View daily devotionals and sermons</li>
              <li>Stay updated with church news and events</li>
              <li>Connect with other church members</li>
              <li>Submit prayer requests</li>
              <li>Support the church through giving</li>
            </ul>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            We're excited to have you join our community! Please be patient while we review your registration.
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
      to: [email],
      subject: "Welcome to COGMPW - Registration Received!",
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending email", { error: emailError });
      throw emailError;
    }

    logStep("Signup email sent successfully", { email });

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
