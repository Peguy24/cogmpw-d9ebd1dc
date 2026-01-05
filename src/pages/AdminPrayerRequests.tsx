import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PrayerRequest {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_urgent: boolean;
  is_answered: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export default function AdminPrayerRequests() {
  const navigate = useNavigate();
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuthAndLoadRequests();
  }, []);

  const checkAuthAndLoadRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAccess = roles?.some(r => r.role === "admin" || (r.role as string) === "super_leader");
    setIsAuthorized(hasAccess || false);

    if (hasAccess) {
      loadPrayerRequests();
    } else {
      setIsLoading(false);
    }
  };

  const loadPrayerRequests = async () => {
    try {
      const { data: requests, error: requestsError } = await supabase
        .from("prayer_requests")
        .select("*")
        .order("is_urgent", { ascending: false })
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles separately
      const userIds = requests?.map(r => r.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge the data
      const requestsWithProfiles = requests?.map(request => ({
        ...request,
        profiles: profiles?.find(p => p.id === request.user_id),
      })) || [];

      setPrayerRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error("Error loading prayer requests:", error);
      toast.error("Failed to load prayer requests");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAnswered = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("prayer_requests")
        .update({ is_answered: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      // Find the prayer request to get user info
      const prayerRequest = prayerRequests.find(req => req.id === id);
      
      // If marking as answered (not unmarking), send email notification
      if (!currentStatus && prayerRequest) {
        try {
          // Get user email from auth
          const { data: userData } = await supabase.auth.admin.listUsers();
          
          // Since we can't access admin API from client, get email via profiles join
          // We need to fetch the user's email from auth.users via an edge function or RPC
          // For now, let's use the supabase function to send email
          await supabase.functions.invoke("send-prayer-answered-email", {
            body: {
              prayerRequestId: id,
              prayerTitle: prayerRequest.title,
              memberName: prayerRequest.profiles?.full_name || "Membre",
              memberEmail: prayerRequest.user_id, // We'll get the email in the edge function
            },
          });
          console.log("Prayer answered email sent successfully");
        } catch (emailError) {
          console.error("Error sending prayer answered email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      setPrayerRequests(prev =>
        prev.map(req =>
          req.id === id ? { ...req, is_answered: !currentStatus } : req
        )
      );

      toast.success(!currentStatus ? "Marked as answered" : "Marked as unanswered");
    } catch (error: any) {
      console.error("Error updating prayer request:", error);
      toast.error("Failed to update prayer request");
    }
  };

  const deletePrayerRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prayer request?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("prayer_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPrayerRequests(prev => prev.filter(req => req.id !== id));
      toast.success("Prayer request deleted");
    } catch (error: any) {
      console.error("Error deleting prayer request:", error);
      toast.error("Failed to delete prayer request");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-3 md:p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              You don't have permission to view this page. Only admins and super leaders can access prayer requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <Button 
              onClick={() => navigate("/home")} 
              className="w-full min-h-[44px] text-sm md:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 md:px-4 max-w-4xl">
      <div className="mb-4 md:mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/home")}
            className="min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Prayer Requests</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              View and manage prayer requests from church members
            </p>
          </div>
        </div>
      </div>

      {prayerRequests.length === 0 ? (
        <Card>
          <CardContent className="py-6 md:py-8 text-center">
            <p className="text-sm md:text-base text-muted-foreground">No prayer requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {prayerRequests.map((request) => (
            <Card key={request.id} className={request.is_urgent ? "border-destructive" : ""}>
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle className="text-base md:text-xl break-words">{request.title}</CardTitle>
                      {request.is_urgent && (
                        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                      {request.is_answered && (
                        <Badge variant="default" className="flex items-center gap-1 bg-green-500 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          Answered
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs md:text-sm break-words">
                      From: {request.profiles?.full_name || "Unknown"} • {format(new Date(request.created_at), "PPp")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
                <p className="whitespace-pre-wrap text-sm md:text-base break-words">{request.content}</p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant={request.is_answered ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleAnswered(request.id, request.is_answered)}
                    className="min-h-[44px] text-xs md:text-sm w-full sm:w-auto"
                  >
                    {request.is_answered ? "Mark as Unanswered" : "Mark as Answered"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePrayerRequest(request.id)}
                    className="min-h-[44px] text-xs md:text-sm w-full sm:w-auto"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
