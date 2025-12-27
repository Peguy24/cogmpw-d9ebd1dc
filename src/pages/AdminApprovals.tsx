import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Check, X } from "lucide-react";
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
      .single();

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

    // Fetch emails from auth.users for display
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Note: In production, you'd want to fetch this through an edge function
        // as direct access to auth.users is not available from the client
        return { ...profile, email: "Email not available" };
      })
    );

    setPendingUsers(usersWithEmails);
  };

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to approve user");
      return;
    }

    // Get user's push tokens for notification
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);

    // Send welcome notification if user has push tokens
    if (tokens && tokens.length > 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: "Welcome to COGMPW! 🎉",
            body: "Your account has been approved. You now have full access to the church app!",
            tokens: tokens.map(t => t.token),
          },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
      } catch (notifError) {
        console.error("Failed to send welcome notification:", notifError);
        // Don't show error to admin - approval was successful
      }
    }

    toast.success("User approved successfully");
    await loadPendingUsers();
  };

  const handleReject = async (user: PendingUser) => {
    setUserToReject(user);
  };

  const confirmReject = async () => {
    if (!userToReject) return;
    
    setIsRejecting(true);
    try {
      // Send rejection email BEFORE deleting the profile (we need the user data)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        await supabase.functions.invoke("send-rejection-email", {
          body: { userId: userToReject.id },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
      // Continue with deletion even if email fails
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userToReject.id);

    if (error) {
      toast.error("Failed to reject user");
      setIsRejecting(false);
      setUserToReject(null);
      return;
    }

    toast.success("User rejected and notified via email");
    setIsRejecting(false);
    setUserToReject(null);
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

  return (
    <div className="min-h-screen bg-background">
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
            {pendingUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-3 md:pb-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">{user.full_name}</CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Signed up {new Date(user.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-3 md:mb-4">
                    {user.phone && (
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Phone: {user.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(user.id)}
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
