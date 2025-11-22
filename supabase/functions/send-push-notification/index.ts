import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FCM_API_URL = "https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send";

interface NotificationPayload {
  title: string;
  body: string;
  tokens?: string[];
}

serve(async (req) => {
  try {
    const { title, body, tokens } = await req.json() as NotificationPayload;

    // If no specific tokens provided, get all tokens from database
    let targetTokens = tokens;
    if (!targetTokens || targetTokens.length === 0) {
      const { data: tokenData } = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/rest/v1/push_tokens?select=token`,
        {
          headers: {
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`
          }
        }
      ).then(res => res.json());
      
      targetTokens = tokenData?.map((t: { token: string }) => t.token) || [];
    }

    if (!targetTokens || targetTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found', success: true }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    // For now, we'll use FCM HTTP v1 API
    // Note: You'll need to configure Firebase Cloud Messaging credentials
    const results = await Promise.allSettled(
      targetTokens.map(async (token) => {
        // This is a placeholder - actual FCM implementation requires OAuth2 token
        console.log(`Would send notification to token: ${token}`);
        console.log(`Title: ${title}, Body: ${body}`);
        
        // TODO: Implement actual FCM sending with OAuth2 credentials
        return { success: true, token };
      })
    );

    return new Response(
      JSON.stringify({ 
        message: 'Notifications queued',
        results: results.length,
        success: true
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
