import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PrayerAnsweredRequest {
  prayerRequestId: string;
  prayerTitle: string;
  memberName: string;
  memberEmail: string; // This is actually user_id, we'll get email from auth
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-prayer-answered-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prayerRequestId, prayerTitle, memberName, memberEmail: userId }: PrayerAnsweredRequest = await req.json();

    console.log("Processing prayer answered email for:", { prayerRequestId, memberName, userId });

    if (!userId) {
      console.error("No user_id provided");
      return new Response(
        JSON.stringify({ error: "No user_id provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client to get user email
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      console.error("Error getting user email:", userError);
      return new Response(
        JSON.stringify({ error: "Could not retrieve user email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const memberEmail = userData.user.email;
    console.log("Found user email:", memberEmail);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Votre Prière a été Reçue</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #8B7355 0%, #D4AF37 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🙏 Votre Prière a été Reçue</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Cher(e) <strong>${memberName}</strong>,
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Nous tenons à vous informer que le Pasteur a bien reçu votre demande de prière :
          </p>
          
          <div style="background-color: #f5f0e6; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="font-style: italic; margin: 0; color: #5a4a3a;">
              "${prayerTitle}"
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>Le Pasteur va intercéder pour vous dans la prière.</strong>
          </p>
          
          <div style="background-color: #fff8e7; border: 1px solid #D4AF37; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 15px; margin: 0; text-align: center; color: #5a4a3a;">
              <em>"Souvenez-vous que seul Dieu peut exaucer les prières. Nous sommes Ses instruments pour intercéder en votre faveur."</em>
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Continuez à garder la foi et à persévérer dans la prière. Dieu entend chaque prière et répond selon Sa volonté parfaite et Son timing parfait.
          </p>
          
          <p style="font-size: 16px; margin-bottom: 10px;">
            Avec amour en Christ,
          </p>
          <p style="font-size: 16px; font-weight: bold; color: #8B7355;">
            L'Équipe Pastorale de COGMPW
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
          <p>Church of God Mission Paris West</p>
          <p>© ${new Date().getFullYear()} COGMPW. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "COGMPW <onboarding@resend.dev>",
        to: [memberEmail],
        subject: "🙏 Le Pasteur a reçu votre demande de prière - COGMPW",
        html: emailHtml,
      }),
    });

    const emailResponse = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", emailResponse);
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Email sent successfully to:", memberEmail, emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-prayer-answered-email function:", error);
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
