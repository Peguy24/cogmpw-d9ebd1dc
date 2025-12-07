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
      from: "COGMPW <onboarding@resend.dev>",
      to: [email],
      subject: "Donation Receipt - COGMPW",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 3px solid #4CAF50;
                margin-bottom: 30px;
              }
              .header h1 {
                margin: 0;
                color: #2c3e50;
              }
              .amount {
                font-size: 32px;
                color: #4CAF50;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
              }
              .details {
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .details-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e0e0e0;
              }
              .details-row:last-child {
                border-bottom: none;
              }
              .label {
                font-weight: bold;
                color: #666;
              }
              .tax-info {
                background-color: #fff9e6;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ffc107;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                color: #666;
              }
              .transaction-id {
                font-family: monospace;
                font-size: 11px;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>COGMPW</h1>
              <p style="margin: 5px 0; color: #666;">Donation Receipt</p>
            </div>

            <p>Dear ${escapeHtml(donorName)},</p>
            
            <p>Thank you for your generous donation to COGMPW. Your support helps us continue our mission and ministry.</p>

            <div class="amount">$${donation.amount.toFixed(2)}</div>

            <div class="details">
              <h2 style="margin-top: 0;">Transaction Details</h2>
              
              <div class="details-row">
                <span class="label">Category:</span>
                <span>${escapeHtml(donation.category)}</span>
              </div>
              
              <div class="details-row">
                <span class="label">Date:</span>
                <span>${formattedDate}</span>
              </div>
              
              <div class="details-row">
                <span class="label">Transaction ID:</span>
                <span class="transaction-id">${donation.stripe_payment_intent_id || 'N/A'}</span>
              </div>
              
              ${donation.notes ? `
              <div class="details-row">
                <span class="label">Notes:</span>
                <span>${escapeHtml(donation.notes)}</span>
              </div>
              ` : ''}
            </div>

            <div class="tax-info">
              <h3 style="margin-top: 0;">Tax Information</h3>
              <p style="margin: 10px 0; font-size: 14px;">
                COGMPW is a 501(c)(3) tax-exempt organization. This receipt serves as documentation 
                of your charitable contribution for tax purposes. No goods or services were provided 
                in exchange for this donation.
              </p>
              <p style="margin: 10px 0; font-weight: bold; font-size: 14px;">
                Please retain this receipt for your tax records.
              </p>
            </div>

            <div class="footer">
              <p>May God bless you for your generosity!</p>
              <p style="font-weight: bold;">COGMPW Ministry Team</p>
              <p style="font-size: 12px; color: #999; margin-top: 20px;">
                If you have any questions about this donation, please contact us.
              </p>
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
