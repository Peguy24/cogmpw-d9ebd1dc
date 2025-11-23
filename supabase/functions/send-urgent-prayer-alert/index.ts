import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UrgentPrayerAlertRequest {
  memberName: string;
  title: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberName, title, content }: UrgentPrayerAlertRequest = await req.json();

    console.log("Sending urgent prayer alert to pastor");

    const emailResponse = await resend.emails.send({
      from: "COGMPW Prayer Requests <onboarding@resend.dev>",
      to: ["ministryofprayer@verizon.net"],
      subject: `🙏 URGENT Prayer Request from ${memberName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🙏 Urgent Prayer Request</h2>
          <p style="font-size: 16px; color: #374151;">
            <strong>From:</strong> ${memberName}
          </p>
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">${title}</h3>
            <p style="color: #7f1d1d; white-space: pre-wrap;">${content}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This prayer request has been marked as urgent and requires immediate attention.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Please log in to the COGMPW app to respond to this request.
          </p>
        </div>
      `,
    });

    console.log("Urgent prayer alert sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending urgent prayer alert:", error);
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
