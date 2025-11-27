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
    console.log('Creating notifications:', { title, type, relatedId });

    // Get all approved users
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('is_approved', true);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No approved users found');
      return new Response(
        JSON.stringify({ message: 'No approved users', success: true, count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${profiles.length} approved users`);

    // Get notification preferences for these users
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('notification_preferences')
      .select('user_id, news_enabled, events_enabled, sermons_enabled, devotionals_enabled')
      .in('user_id', profiles.map(p => p.id));

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      // Continue without preferences - notify all users
    }

    console.log(`Found ${preferences?.length || 0} notification preferences`);

    // Filter users based on notification type preference
    const eligibleUsers = profiles.filter(profile => {
      const prefs = preferences?.find(p => p.user_id === profile.id);
      
      // If no preferences found, default to true (notify everyone)
      if (!prefs) return true;
      
      if (type === 'news') return prefs.news_enabled;
      if (type === 'event') return prefs.events_enabled;
      if (type === 'sermon') return prefs.sermons_enabled;
      if (type === 'devotional') return prefs.devotionals_enabled;
      return true;
    });

    // Create notifications for all eligible users
    const notifications = eligibleUsers.map(profile => ({
      user_id: profile.id,
      title,
      message,
      type,
      related_id: relatedId,
      is_read: false
    }));

    console.log(`Inserting ${notifications.length} notifications into database`);

    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      throw insertError;
    }

    console.log(`Successfully created ${notifications.length} notifications for ${type}: ${title}`);

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
