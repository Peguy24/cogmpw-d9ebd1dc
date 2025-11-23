import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, Users, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string | null;
  ministry: string | null;
  created_at: string;
  isLeader: boolean;
  isAdmin: boolean;
  isSuperLeader: boolean;
}

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'leader' | 'member'>('all');

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
        isSuperLeader: roles.some(r => (r.role as string) === "super_leader"),
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

    // Log the role change
    await supabase.from("role_change_logs").insert({
      changed_by_user_id: currentUserId,
      target_user_id: userId,
      role: 'leader',
      action
    });

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

    // Log the role change
    await supabase.from("role_change_logs").insert({
      changed_by_user_id: currentUserId,
      target_user_id: userId,
      role: 'admin',
      action
    });

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

  const toggleSuperLeaderRole = async (userId: string, currentlySuperLeader: boolean) => {
    const action = currentlySuperLeader ? 'revoked' : 'granted';
    
    if (currentlySuperLeader) {
      // Remove super_leader role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "super_leader" as any);

      if (error) {
        toast.error("Failed to remove super leader role");
        return;
      }

      toast.success("Super Leader role removed");
    } else {
      // Add super_leader role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "super_leader" as any });

      if (error) {
        toast.error("Failed to add super leader role");
        return;
      }

      toast.success("Super Leader role assigned");
    }

    // Log the role change
    await supabase.from("role_change_logs").insert({
      changed_by_user_id: currentUserId,
      target_user_id: userId,
      role: 'super_leader',
      action
    });

    // Send notification to the user
    try {
      const { error: notifError } = await supabase.functions.invoke(
        'notify-role-change',
        {
          body: {
            userId,
            role: 'super_leader',
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

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const bulkAssignRole = async (role: 'admin' | 'leader' | 'super_leader') => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of selectedUsers) {
      // Skip current user
      if (userId === currentUserId) continue;

      const user = users.find(u => u.id === userId);
      if (!user) continue;

      // Skip if already has the role
      if ((role === 'admin' && user.isAdmin) || (role === 'leader' && user.isLeader) || (role === 'super_leader' && user.isSuperLeader)) {
        continue;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });

      if (error) {
        errorCount++;
      } else {
        successCount++;
        
        // Log the role change
        await supabase.from("role_change_logs").insert({
          changed_by_user_id: currentUserId,
          target_user_id: userId,
          role,
          action: 'granted'
        });

        // Send notification
        try {
          await supabase.functions.invoke('notify-role-change', {
            body: { userId, role, action: 'granted' }
          });
        } catch (e) {
          console.error('Notification error:', e);
        }
      }
    }

    setProcessing(false);
    setSelectedUsers(new Set());
    await loadUsers();

    if (successCount > 0) {
      toast.success(`${role} role assigned to ${successCount} user${successCount > 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to assign role to ${errorCount} user${errorCount > 1 ? 's' : ''}`);
    }
  };

  const bulkRemoveRole = async (role: 'admin' | 'leader' | 'super_leader') => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of selectedUsers) {
      // Skip current user
      if (userId === currentUserId) continue;

      const user = users.find(u => u.id === userId);
      if (!user) continue;

      // Skip if doesn't have the role
      if ((role === 'admin' && !user.isAdmin) || (role === 'leader' && !user.isLeader) || (role === 'super_leader' && !user.isSuperLeader)) {
        continue;
      }

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as any);

      if (error) {
        errorCount++;
      } else {
        successCount++;
        
        // Log the role change
        await supabase.from("role_change_logs").insert({
          changed_by_user_id: currentUserId,
          target_user_id: userId,
          role,
          action: 'revoked'
        });

        // Send notification
        try {
          await supabase.functions.invoke('notify-role-change', {
            body: { userId, role, action: 'revoked' }
          });
        } catch (e) {
          console.error('Notification error:', e);
        }
      }
    }

    setProcessing(false);
    setSelectedUsers(new Set());
    await loadUsers();

    if (successCount > 0) {
      toast.success(`${role} role removed from ${successCount} user${successCount > 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to remove role from ${errorCount} user${errorCount > 1 ? 's' : ''}`);
    }
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'admin') return user.isAdmin;
    if (roleFilter === 'leader') return user.isLeader && !user.isAdmin;
    if (roleFilter === 'member') return !user.isAdmin && !user.isLeader;
    return true;
  });

  const getUserCounts = () => {
    return {
      all: users.length,
      admin: users.filter(u => u.isAdmin).length,
      leader: users.filter(u => u.isLeader && !u.isAdmin).length,
      member: users.filter(u => !u.isAdmin && !u.isLeader).length,
    };
  };

  const counts = getUserCounts();

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg">Manage User Roles</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Assign admin or leader roles to users. Select multiple users for batch actions.
                </CardDescription>
              </div>
              {selectedUsers.size > 0 && (
                <Badge variant="secondary" className="w-fit">
                  {selectedUsers.size} selected
                </Badge>
              )}
            </div>
          </CardHeader>
          {selectedUsers.size > 0 && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => bulkAssignRole('admin')}
                  disabled={processing}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Make Admin
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => bulkAssignRole('leader')}
                  disabled={processing}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Make Leader
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => bulkAssignRole('super_leader')}
                  disabled={processing}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Make Super Leader
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkRemoveRole('admin')}
                  disabled={processing}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Remove Admin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkRemoveRole('leader')}
                  disabled={processing}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Remove Leader
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkRemoveRole('super_leader')}
                  disabled={processing}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Remove Super Leader
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUsers(new Set())}
                  disabled={processing}
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)} className="mb-4 md:mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="admin" className="text-xs md:text-sm">
              Admins ({counts.admin})
            </TabsTrigger>
            <TabsTrigger value="leader" className="text-xs md:text-sm">
              Leaders ({counts.leader})
            </TabsTrigger>
            <TabsTrigger value="member" className="text-xs md:text-sm">
              Members ({counts.member})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredUsers.length > 0 && (
          <div className="flex items-center gap-2 mb-3 md:mb-4 px-1">
            <Checkbox
              id="select-all"
              checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
              onCheckedChange={() => {
                if (selectedUsers.size === filteredUsers.length) {
                  setSelectedUsers(new Set());
                } else {
                  setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                }
              }}
            />
            <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All {roleFilter !== 'all' ? `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}s` : 'Users'}
            </Label>
          </div>
        )}

        <div className="space-y-3 md:space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-3 md:pb-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg">
                      <span className="truncate">{user.full_name}</span>
                      {user.isAdmin && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.isSuperLeader && !user.isAdmin && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Super Leader
                        </Badge>
                      )}
                      {user.isLeader && !user.isAdmin && !user.isSuperLeader && (
                        <Badge variant="secondary" className="text-xs">Leader</Badge>
                      )}
                    </CardTitle>
                    <div className="space-y-1 mt-2 text-xs md:text-sm text-muted-foreground">
                      {user.ministry && (
                        <div>Ministry: {user.ministry}</div>
                      )}
                      {user.phone && (
                        <div>Phone: {user.phone}</div>
                      )}
                      <div>
                        Member since {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
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

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor={`super-leader-${user.id}`} className="text-sm md:text-base">
                        Super Leader Permissions
                      </Label>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        Can view and manage prayer requests (pastor-level access)
                      </div>
                    </div>
                    <Switch
                      id={`super-leader-${user.id}`}
                      checked={user.isSuperLeader}
                      disabled={user.isAdmin || user.id === currentUserId}
                      onCheckedChange={() => toggleSuperLeaderRole(user.id, user.isSuperLeader)}
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
                      disabled={user.isAdmin || user.isSuperLeader || user.id === currentUserId}
                      onCheckedChange={() => toggleLeaderRole(user.id, user.isLeader)}
                      className="shrink-0"
                    />
                  </div>

                  {user.isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Admins automatically have all permissions
                    </p>
                  )}
                  {user.isSuperLeader && !user.isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Super Leaders have leader permissions plus prayer request access
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

        {filteredUsers.length === 0 && users.length > 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm md:text-base">
                No {roleFilter !== 'all' ? roleFilter + 's' : 'users'} found
              </p>
            </CardContent>
          </Card>
        )}

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
