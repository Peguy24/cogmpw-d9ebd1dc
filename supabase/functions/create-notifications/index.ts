import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  title: string;
  message: string;
  type: 'news' | 'event' | 'sermon' | 'devotional';
  relatedId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { title, message, type, relatedId } = await req.json() as NotificationRequest;

    // Get all approved users based on their notification preferences
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        notification_preferences!inner(
          news_enabled,
          events_enabled,
          sermons_enabled,
          devotionals_enabled
        )
      `)
      .eq('is_approved', true);

    if (usersError) {
      throw usersError;
    }

    // Filter users based on notification type preference
    const eligibleUsers = users?.filter(user => {
      const prefs = user.notification_preferences[0];
      if (!prefs) return false;
      if (type === 'news') return prefs.news_enabled;
      if (type === 'event') return prefs.events_enabled;
      if (type === 'sermon') return prefs.sermons_enabled;
      if (type === 'devotional') return prefs.devotionals_enabled;
      return true;
    }) || [];

    // Create notifications for all eligible users
    const notifications = eligibleUsers.map(user => ({
      user_id: user.id,
      title,
      message,
      type,
      related_id: relatedId,
      is_read: false
    }));

    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      throw insertError;
    }

    console.log(`Created ${notifications.length} notifications for ${type}: ${title}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: notifications.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-notifications:', error);
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
