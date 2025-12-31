import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for auth access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin, leader, or super_leader role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "leader", "super_leader"]);

    if (roleError || !roleData || roleData.length === 0) {
      console.error("User does not have required role:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden - insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { eventId, eventTitle } = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Event ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Exporting attendees for event: ${eventId}`);

    // Fetch RSVPs
    const { data: rsvps, error: rsvpsError } = await supabaseAdmin
      .from("event_rsvps")
      .select("user_id, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (rsvpsError) {
      console.error("Error fetching RSVPs:", rsvpsError);
      throw rsvpsError;
    }

    if (!rsvps || rsvps.length === 0) {
      return new Response(
        JSON.stringify({ csv: "No attendees registered for this event." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profiles and auth emails
    const attendeesData = await Promise.all(
      rsvps.map(async (rsvp, index) => {
        // Get profile
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name, phone, phone_visible, ministry")
          .eq("id", rsvp.user_id)
          .single();

        // Get email from auth.users
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(rsvp.user_id);

        return {
          number: index + 1,
          name: profile?.full_name || "Unknown",
          email: authUser?.user?.email || "",
          phone: profile?.phone_visible && profile?.phone ? profile.phone : "",
          ministry: profile?.ministry || "",
          registeredAt: new Date(rsvp.created_at).toLocaleDateString(),
        };
      })
    );

    // Generate CSV
    const csvHeader = "No,Name,Email,Phone,Ministry,Registration Date";
    const csvRows = attendeesData.map(
      (a) => `${a.number},"${a.name}","${a.email}","${a.phone}","${a.ministry}","${a.registeredAt}"`
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    console.log(`Successfully exported ${attendeesData.length} attendees`);

    return new Response(
      JSON.stringify({ csv, count: attendeesData.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in export-event-attendees:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
