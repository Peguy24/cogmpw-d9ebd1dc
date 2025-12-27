import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoleChangeRequest {
  userId: string;
  role: 'leader' | 'admin' | 'super_leader';
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

    // Get user profile and email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const { data: { user: targetUser } } = await supabaseClient.auth.admin.getUserById(userId);

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

    // Prepare notification message based on role
    const getRoleDisplayName = (role: string) => {
      if (role === 'super_leader') return 'Super Leader';
      return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getRoleDescription = (role: string) => {
      switch (role) {
        case 'admin':
          return 'You now have full administrative access to the COGMPW app, including user management, content publishing, and viewing all prayer requests.';
        case 'super_leader':
          return 'You now have Super Leader permissions in the COGMPW app. You can publish news and events, and view and manage all prayer requests from church members.';
        case 'leader':
          return 'You can now publish news and events in the COGMPW app.';
        default:
          return 'Your permissions have been updated.';
      }
    };

    const roleDisplayName = getRoleDisplayName(role);
    
    const title = action === 'granted' 
      ? `You're now a ${roleDisplayName}!` 
      : `${roleDisplayName} role removed`;
    
    const body = action === 'granted'
      ? `Congratulations! You've been granted ${roleDisplayName} permissions. ${getRoleDescription(role)}`
      : `Your ${roleDisplayName} permissions have been removed.`;

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

    console.log(`Sent ${successCount}/${pushTokens.length} push notifications successfully`);

    // Send email notification
    let emailSent = false;
    if (targetUser?.email) {
      try {
        const emailSubject = action === 'granted'
          ? `🎉 You've Been Promoted to ${roleDisplayName}`
          : `${roleDisplayName} Role Update`;

        const emailHtml = action === 'granted'
          ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">🎉 Congratulations, ${profile?.full_name || 'Member'}!</h2>
              <p style="font-size: 16px; color: #374151;">
                You've been granted <strong>${roleDisplayName}</strong> permissions in the COGMPW church app.
              </p>
              <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Your New Permissions:</h3>
                <p style="color: #4b5563; margin: 0;">${getRoleDescription(role)}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                Log in to the COGMPW app to start using your new permissions.
              </p>
              <p style="color: #6b7280; font-size: 14px;">
                God bless,<br>
                COGMPW Leadership Team
              </p>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Role Update Notification</h2>
              <p style="font-size: 16px; color: #374151;">
                Hello ${profile?.full_name || 'Member'},
              </p>
              <p style="font-size: 16px; color: #374151;">
                Your <strong>${roleDisplayName}</strong> permissions have been removed from the COGMPW church app.
              </p>
              <p style="color: #6b7280; font-size: 14px;">
                If you have any questions about this change, please contact the church administration.
              </p>
              <p style="color: #6b7280; font-size: 14px;">
                God bless,<br>
                COGMPW Leadership Team
              </p>
            </div>
          `;

        const emailResponse = await resend.emails.send({
          from: "COGMPW Church <noreply@cogmpw.com>",
          to: [targetUser.email],
          subject: emailSubject,
          html: emailHtml,
        });

        console.log("Email notification sent successfully:", emailResponse);
        emailSent = true;
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't fail the whole request if email fails
      }
    } else {
      console.log("No email address found for user, skipping email notification");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: successCount,
        totalTokens: pushTokens.length,
        emailSent 
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
