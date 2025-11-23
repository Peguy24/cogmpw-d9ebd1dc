import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view this page. Only admins and super leaders can access prayer requests.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Prayer Requests</h1>
        <p className="text-muted-foreground">
          View and manage prayer requests from church members
        </p>
      </div>

      {prayerRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No prayer requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prayerRequests.map((request) => (
            <Card key={request.id} className={request.is_urgent ? "border-destructive" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl">{request.title}</CardTitle>
                      {request.is_urgent && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                      {request.is_answered && (
                        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                          <CheckCircle className="h-3 w-3" />
                          Answered
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      From: {request.profiles?.full_name || "Unknown"} • {format(new Date(request.created_at), "PPp")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap">{request.content}</p>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={request.is_answered ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleAnswered(request.id, request.is_answered)}
                  >
                    {request.is_answered ? "Mark as Unanswered" : "Mark as Answered"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePrayerRequest(request.id)}
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
