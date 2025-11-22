import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string | null;
  ministry: string | null;
  created_at: string;
  isLeader: boolean;
  isAdmin: boolean;
}

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, [navigate]);

  const checkAdminAndLoadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(user.id);

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/home");
      return;
    }

    setIsAdmin(true);
    await loadUsers();
    setLoading(false);
  };

  const loadUsers = async () => {
    // Get all approved users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, ministry, created_at")
      .eq("is_approved", true)
      .order("full_name", { ascending: true });

    if (profilesError) {
      toast.error("Failed to load users");
      return;
    }

    // Get all user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", profiles?.map(p => p.id) || []);

    if (rolesError) {
      toast.error("Failed to load user roles");
      return;
    }

    // Combine data
    const usersWithRoles = (profiles || []).map(profile => {
      const roles = userRoles?.filter(r => r.user_id === profile.id) || [];
      return {
        ...profile,
        isLeader: roles.some(r => r.role === "leader"),
        isAdmin: roles.some(r => r.role === "admin"),
      };
    });

    setUsers(usersWithRoles);
  };

  const toggleLeaderRole = async (userId: string, currentlyLeader: boolean) => {
    if (currentlyLeader) {
      // Remove leader role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "leader");

      if (error) {
        toast.error("Failed to remove leader role");
        return;
      }

      toast.success("Leader role removed");
    } else {
      // Add leader role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "leader" });

      if (error) {
        toast.error("Failed to add leader role");
        return;
      }

      toast.success("Leader role assigned");
    }

    await loadUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">User Management</h1>
          </div>
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            {users.length} Users
          </Badge>
        </div>
      </header>

      <main className="container py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assign Leader Roles</CardTitle>
            <CardDescription>
              Leaders can publish news and events. Admins have full access to all features.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {user.full_name}
                      {user.isAdmin && (
                        <Badge variant="default">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.isLeader && !user.isAdmin && (
                        <Badge variant="secondary">Leader</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="space-y-1 mt-2">
                      {user.ministry && (
                        <div className="text-sm">Ministry: {user.ministry}</div>
                      )}
                      {user.phone && (
                        <div className="text-sm">Phone: {user.phone}</div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Member since {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`leader-${user.id}`} className="text-base">
                      Leader Permissions
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Allow this user to publish news and events
                    </div>
                  </div>
                  <Switch
                    id={`leader-${user.id}`}
                    checked={user.isLeader}
                    disabled={user.isAdmin || user.id === currentUserId}
                    onCheckedChange={() => toggleLeaderRole(user.id, user.isLeader)}
                  />
                </div>
                {user.isAdmin && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Admins automatically have all permissions
                  </p>
                )}
                {user.id === currentUserId && !user.isAdmin && (
                  <p className="text-xs text-muted-foreground mt-2">
                    You cannot modify your own roles
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No approved users found</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminUserManagement;
