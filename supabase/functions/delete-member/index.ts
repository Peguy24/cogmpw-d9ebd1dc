import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-MEMBER] ${step}${detailsStr}`);
};

interface DeleteMemberRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify the requesting user is an admin
    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Only admins can delete members");
    }

    const { userId }: DeleteMemberRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Prevent admins from deleting themselves
    if (userId === user.id) {
      throw new Error("You cannot delete your own account");
    }

    logStep("Processing member deletion", { userId, requestedBy: user.id });

    // Get user profile name for logging
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const memberName = profile?.full_name || "Unknown";

    // Check if target user is an admin - prevent deleting other admins
    const { data: targetAdminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (targetAdminRole) {
      throw new Error("Cannot delete another admin. Remove admin role first.");
    }

    // Delete user from auth.users (this will cascade delete from profiles and user_roles due to ON DELETE CASCADE)
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      logStep("Error deleting auth user", { error: deleteAuthError });
      throw new Error(`Failed to delete user: ${deleteAuthError.message}`);
    }

    logStep("Member deleted successfully", { userId, memberName });

    return new Response(
      JSON.stringify({ success: true, deletedUserId: userId, memberName }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
