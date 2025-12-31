import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize user input to prevent XSS in email HTML
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface SendReceiptRequest {
  email: string;
  donorName: string;
  donation: {
    id: string;
    amount: number;
    category: string;
    created_at: string;
    stripe_payment_intent_id: string | null;
    notes: string | null;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, donorName, donation }: SendReceiptRequest = await req.json();

    if (!email || !donation) {
      throw new Error("Email and donation details are required");
    }

    const formattedDate = new Date(donation.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const emailResponse = await resend.emails.send({
      from: "COGMPW <hello@noreply.cogmpw.com>",
      to: [email],
      subject: "Donation Receipt - COGMPW",
      html: `
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
              <img src="https://cogmpw.lovable.app/church-logo-gold.png" alt="COGMPW Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #10b981;" />
            </div>
            
            <!-- Main Card -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(16, 185, 129, 0.2);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Thank You for Your Gift!</h1>
                <p style="color: #93c5fd; margin: 0; font-size: 14px; letter-spacing: 1px;">DONATION RECEIPT</p>
              </div>
              
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; margin: 0 0 16px 0;">
                  Dear <strong style="color: #60a5fa;">${escapeHtml(donorName)}</strong>,
                </p>
                
                <p style="color: #cbd5e1; font-size: 15px; line-height: 24px; margin: 0;">
                  Thank you for your generous donation to COGMPW. Your support helps us continue our mission and ministry.
                </p>
              </div>

              <!-- Amount Display -->
              <div style="text-align: center; background: linear-gradient(135deg, #065f46 0%, #064e3b 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(16, 185, 129, 0.3);">
                <p style="color: #6ee7b7; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Amount Donated</p>
                <p style="color: #ffffff; font-size: 42px; font-weight: 700; margin: 0;">$${donation.amount.toFixed(2)}</p>
              </div>

              <!-- Transaction Details -->
              <div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(59, 130, 246, 0.2);">
                <h3 style="color: #93c5fd; margin: 0 0 16px 0; font-size: 16px;">Transaction Details</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">Category</td>
                    <td style="color: #e2e8f0; font-size: 14px; padding: 8px 0; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.1);">${escapeHtml(donation.category)}</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">Date</td>
                    <td style="color: #e2e8f0; font-size: 14px; padding: 8px 0; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.1);">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">Transaction ID</td>
                    <td style="color: #e2e8f0; font-size: 12px; padding: 8px 0; text-align: right; font-family: monospace; word-break: break-all;">${donation.stripe_payment_intent_id || 'N/A'}</td>
                  </tr>
                  ${donation.notes ? `
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">Notes</td>
                    <td style="color: #e2e8f0; font-size: 14px; padding: 8px 0; text-align: right; border-top: 1px solid rgba(255,255,255,0.1);">${escapeHtml(donation.notes)}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Tax Info -->
              <div style="background: linear-gradient(135deg, #78350f 0%, #451a03 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #fbbf24;">
                <h3 style="color: #fef3c7; margin: 0 0 8px 0; font-size: 16px;">Tax Information</h3>
                <p style="color: #fde68a; font-size: 13px; line-height: 20px; margin: 0 0 8px 0;">
                  COGMPW is a 501(c)(3) tax-exempt organization. This receipt serves as documentation of your charitable contribution for tax purposes. No goods or services were provided in exchange for this donation.
                </p>
                <p style="color: #fef3c7; font-size: 13px; font-weight: 600; margin: 0;">
                  Please retain this receipt for your tax records.
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://cogmpw.lovable.app/giving-history" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">View Giving History</a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding-top: 24px;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">
                May God bless you for your generosity!
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
      `,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending donation receipt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
