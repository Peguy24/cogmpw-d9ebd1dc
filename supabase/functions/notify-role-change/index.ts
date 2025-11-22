import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoleChangeRequest {
  userId: string;
  role: 'leader' | 'admin';
  action: 'granted' | 'revoked';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify the requesting user is an admin
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      throw new Error('Only admins can trigger role change notifications');
    }

    const { userId, role, action }: RoleChangeRequest = await req.json();

    console.log(`Processing role change notification: ${action} ${role} for user ${userId}`);

    // Get user profile to get their name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Get all push tokens for the user
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      throw tokensError;
    }

    if (!pushTokens || pushTokens.length === 0) {
      console.log('No push tokens found for user:', userId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User has no push tokens registered' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Prepare notification message
    const title = action === 'granted' 
      ? `You're now a ${role}!` 
      : `${role} role removed`;
    
    const body = action === 'granted'
      ? `Congratulations! You've been granted ${role} permissions. You can now publish news and events in the COGMPW app.`
      : `Your ${role} permissions have been removed.`;

    // Send push notifications to all user's devices
    const notificationPromises = pushTokens.map(async (tokenData) => {
      try {
        console.log(`Sending notification to token ending in ...${tokenData.token.slice(-4)}`);
        
        const { error: notifError } = await supabaseClient.functions.invoke(
          'send-push-notification',
          {
            body: {
              tokens: [tokenData.token],
              title,
              body,
              data: {
                type: 'role_change',
                role,
                action,
              },
            },
          }
        );

        if (notifError) {
          console.error('Error sending notification:', notifError);
          return { success: false, error: notifError };
        }

        return { success: true };
      } catch (error) {
        console.error('Error in notification promise:', error);
        return { success: false, error };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${pushTokens.length} notifications successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: successCount,
        totalTokens: pushTokens.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in notify-role-change function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
