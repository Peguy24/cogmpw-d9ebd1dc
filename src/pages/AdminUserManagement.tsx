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
    const action = currentlyLeader ? 'revoked' : 'granted';
    
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

    // Send notification to the user
    try {
      const { error: notifError } = await supabase.functions.invoke(
        'notify-role-change',
        {
          body: {
            userId,
            role: 'leader',
            action,
          },
        }
      );

      if (notifError) {
        console.error('Failed to send role change notification:', notifError);
      } else {
        console.log('Role change notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    await loadUsers();
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    const action = currentlyAdmin ? 'revoked' : 'granted';
    
    if (currentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) {
        toast.error("Failed to remove admin role");
        return;
      }

      toast.success("Admin role removed");
    } else {
      // Add admin role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (error) {
        toast.error("Failed to add admin role");
        return;
      }

      toast.success("Admin role assigned");
    }

    // Send notification to the user
    try {
      const { error: notifError } = await supabase.functions.invoke(
        'notify-role-change',
        {
          body: {
            userId,
            role: 'admin',
            action,
          },
        }
      );

      if (notifError) {
        console.error('Failed to send role change notification:', notifError);
      } else {
        console.log('Role change notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
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
        <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-bold truncate">User Management</h1>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs md:text-sm">
            <Users className="h-3 w-3 mr-1" />
            {users.length}
          </Badge>
        </div>
      </header>

      <main className="container py-4 md:py-6 px-3 md:px-4">
        <Card className="mb-4 md:mb-6">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Manage User Roles</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Assign admin or leader roles to users. Admins have full access and can manage other users.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-3 md:space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-3 md:pb-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg">
                      <span className="truncate">{user.full_name}</span>
                      {user.isAdmin && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.isLeader && !user.isAdmin && (
                        <Badge variant="secondary" className="text-xs">Leader</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="space-y-1 mt-2 text-xs md:text-sm">
                      {user.ministry && (
                        <div>Ministry: {user.ministry}</div>
                      )}
                      {user.phone && (
                        <div>Phone: {user.phone}</div>
                      )}
                      <div className="text-muted-foreground">
                        Member since {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor={`admin-${user.id}`} className="text-sm md:text-base">
                        Admin Permissions
                      </Label>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        Full access to all features including user management
                      </div>
                    </div>
                    <Switch
                      id={`admin-${user.id}`}
                      checked={user.isAdmin}
                      disabled={user.id === currentUserId}
                      onCheckedChange={() => toggleAdminRole(user.id, user.isAdmin)}
                      className="shrink-0"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor={`leader-${user.id}`} className="text-sm md:text-base">
                        Leader Permissions
                      </Label>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        Allow this user to publish news and events
                      </div>
                    </div>
                    <Switch
                      id={`leader-${user.id}`}
                      checked={user.isLeader}
                      disabled={user.isAdmin || user.id === currentUserId}
                      onCheckedChange={() => toggleLeaderRole(user.id, user.isLeader)}
                      className="shrink-0"
                    />
                  </div>

                  {user.isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Admins automatically have all permissions
                    </p>
                  )}
                  {user.id === currentUserId && (
                    <p className="text-xs text-muted-foreground">
                      You cannot modify your own roles
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm md:text-base">No approved users found</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminUserManagement;
