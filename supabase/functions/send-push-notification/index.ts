import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_API_URL = "https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility to mask tokens for safe logging (dev only)
const maskToken = (token: string): string => {
  if (token.length <= 8) return '***';
  return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
}

interface NotificationPayload {
  title: string;
  body: string;
  tokens?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create authenticated Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if user has admin or leader role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'leader'])
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Only admins and leaders can send notifications' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { title, body, tokens } = await req.json() as NotificationPayload;

    // If no specific tokens provided, get all tokens from database
    let targetTokens = tokens;
    if (!targetTokens || targetTokens.length === 0) {
      const { data: tokenData } = await supabaseClient
        .from('push_tokens')
        .select('token');
      
      targetTokens = tokenData?.map((t: { token: string }) => t.token) || [];
    }

    if (!targetTokens || targetTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found', success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Log notification details (tokens are masked for security)
    console.log(`Sending notification: "${title}" to ${targetTokens.length} device(s)`);

    // For now, we'll use FCM HTTP v1 API
    // Note: You'll need to configure Firebase Cloud Messaging credentials
    const results = await Promise.allSettled(
      targetTokens.map(async (token) => {
        // This is a placeholder - actual FCM implementation requires OAuth2 token
        // In development, you could log: console.log(`Token: ${maskToken(token)}`);
        
        // TODO: Implement actual FCM sending with OAuth2 credentials
        return { success: true };
      })
    );

    return new Response(
      JSON.stringify({ 
        message: 'Notifications queued',
        results: results.length,
        success: true
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
