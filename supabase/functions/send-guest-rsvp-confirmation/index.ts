import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Escape HTML to prevent XSS in email templates
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuestRSVPConfirmationRequest {
  guestName: string;
  guestEmail: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guestName, guestEmail, eventTitle, eventDate, eventLocation }: GuestRSVPConfirmationRequest = await req.json();

    console.log(`Sending RSVP confirmation to ${guestEmail} for event: ${eventTitle}`);

    // eventDate is already formatted from the frontend, use it directly

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "COGMPW <hello@noreply.cogmpw.com>",
        to: [guestEmail],
        subject: `You're Registered: ${eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Church of God Mission</h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px;">Prince William, Virginia</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #1a1a2e; margin: 0 0 20px; font-size: 24px;">You're Registered! 🎉</h2>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Dear ${escapeHtml(guestName)},
                </p>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                  Thank you for registering for our upcoming event. We're excited to have you join us!
                </p>
                
                <!-- Event Details Card -->
                <div style="background-color: #f8f9fa; border-left: 4px solid #d4af37; padding: 20px; margin: 0 0 25px; border-radius: 0 8px 8px 0;">
                  <h3 style="color: #1a1a2e; margin: 0 0 15px; font-size: 18px;">${escapeHtml(eventTitle)}</h3>
                  <p style="color: #555555; margin: 0 0 10px; font-size: 14px;">
                    <strong>Date & Time:</strong><br>
                    ${escapeHtml(eventDate)}
                  </p>
                  <p style="color: #555555; margin: 0; font-size: 14px;">
                    <strong>Location:</strong><br>
                    ${escapeHtml(eventLocation)}
                  </p>
                </div>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                  If you have any questions or need to update your registration, please don't hesitate to reach out to us.
                </p>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                  We look forward to seeing you!
                </p>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0 0;">
                  Blessings,<br>
                  <strong>COGMPW Team</strong>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
                <p style="color: #888888; font-size: 12px; margin: 0;">
                  Church of God Mission Prince William<br>
                  © ${new Date().getFullYear()} All rights reserved
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Confirmation email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending guest RSVP confirmation:", error);
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
