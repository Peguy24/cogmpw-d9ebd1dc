import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Check, X, CheckCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

interface PendingUser {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  email?: string;
}

const AdminApprovals = () => {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userToReject, setUserToReject] = useState<PendingUser | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, [navigate]);

  const checkAdminAndLoadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/home");
      return;
    }

    setIsAdmin(true);
    await loadPendingUsers();
    setLoading(false);
  };

  const loadPendingUsers = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .eq("is_approved", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load pending users");
      return;
    }

    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        return { ...profile, email: "Email not available" };
      })
    );

    setPendingUsers(usersWithEmails);
    setSelectedUsers(new Set()); // Clear selection when reloading
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === pendingUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(pendingUsers.map(u => u.id)));
    }
  };

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to approve user");
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();

    // Send welcome email
    if (session?.access_token) {
      try {
        await supabase.functions.invoke("send-welcome-email", {
          body: { userId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

    // Get user's push tokens for notification
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);

    // Send welcome notification if user has push tokens
    if (tokens && tokens.length > 0 && session?.access_token) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: "Welcome to COGMPW! 🎉",
            body: "Your account has been approved. You now have full access to the church app!",
            tokens: tokens.map(t => t.token),
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch (notifError) {
        console.error("Failed to send welcome notification:", notifError);
      }
    }

    return true;
  };

  const handleSingleApprove = async (userId: string) => {
    const success = await handleApprove(userId);
    if (success) {
      toast.success("User approved and notified");
      await loadPendingUsers();
    }
  };

  const handleReject = async (user: PendingUser) => {
    setUserToReject(user);
  };

  const rejectUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        await supabase.functions.invoke("send-rejection-email", {
          body: { userId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    return !error;
  };

  const confirmReject = async () => {
    if (!userToReject) return;
    
    setIsRejecting(true);
    const success = await rejectUser(userToReject.id);

    if (!success) {
      toast.error("Failed to reject user");
    } else {
      toast.success("User rejected and notified via email");
    }
    
    setIsRejecting(false);
    setUserToReject(null);
    await loadPendingUsers();
  };

  const handleBulkApprove = () => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }
    setBulkAction("approve");
  };

  const handleBulkReject = () => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }
    setBulkAction("reject");
  };

  const confirmBulkAction = async () => {
    setIsBulkProcessing(true);
    const userIds = Array.from(selectedUsers);
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      let success = false;
      if (bulkAction === "approve") {
        success = await handleApprove(userId);
      } else if (bulkAction === "reject") {
        success = await rejectUser(userId);
      }
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setIsBulkProcessing(false);
    setBulkAction(null);

    if (bulkAction === "approve") {
      toast.success(`Approved ${successCount} user${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`);
    } else {
      toast.success(`Rejected ${successCount} user${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`);
    }
    
    await loadPendingUsers();
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

  const selectedCount = selectedUsers.size;
  const allSelected = pendingUsers.length > 0 && selectedCount === pendingUsers.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Single user reject dialog */}
      <AlertDialog open={!!userToReject} onOpenChange={(open) => !open && setUserToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject User Registration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject <strong>{userToReject?.full_name}</strong>? 
              This will permanently delete their account and send them a notification email. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              disabled={isRejecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRejecting ? "Rejecting..." : "Reject User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk action dialog */}
      <AlertDialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "approve" ? "Approve" : "Reject"} {selectedCount} User{selectedCount !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "approve" 
                ? `This will approve ${selectedCount} user${selectedCount !== 1 ? 's' : ''} and send them welcome emails and notifications.`
                : `This will permanently delete ${selectedCount} account${selectedCount !== 1 ? 's' : ''} and send rejection emails. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              disabled={isBulkProcessing}
              className={bulkAction === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isBulkProcessing 
                ? "Processing..." 
                : bulkAction === "approve" 
                  ? `Approve ${selectedCount} User${selectedCount !== 1 ? 's' : ''}`
                  : `Reject ${selectedCount} User${selectedCount !== 1 ? 's' : ''}`
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-8">
        <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-bold">Pending Approvals</h1>
          </div>
          <Badge variant="secondary" className="text-xs md:text-sm">{pendingUsers.length} Pending</Badge>
        </div>
      </header>

      <main className="container py-4 md:py-6 px-3 md:px-4">
        {pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm md:text-base">No pending user approvals</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {/* Bulk actions bar */}
            <Card className="bg-muted/50">
              <CardContent className="py-3 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      {allSelected ? "Deselect All" : "Select All"}
                    </label>
                    {selectedCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {selectedCount} selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleBulkApprove}
                      disabled={selectedCount === 0}
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Approve Selected
                    </Button>
                    <Button
                      onClick={handleBulkReject}
                      disabled={selectedCount === 0}
                      variant="destructive"
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {pendingUsers.map((user) => (
              <Card key={user.id} className={selectedUsers.has(user.id) ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-3 md:pb-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base md:text-lg truncate">{user.full_name}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">
                            Signed up {new Date(user.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">Pending</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-12">
                  <div className="space-y-2 mb-3 md:mb-4">
                    {user.phone && (
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Phone: {user.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSingleApprove(user.id)}
                      className="flex-1 min-h-[44px]"
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(user)}
                      variant="destructive"
                      className="flex-1 min-h-[44px]"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminApprovals;
