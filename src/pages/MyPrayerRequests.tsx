import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  is_urgent: boolean;
  is_answered: boolean;
  created_at: string;
}

export default function MyPrayerRequests() {
  const navigate = useNavigate();
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMyPrayerRequests();
  }, []);

  const loadMyPrayerRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: requests, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPrayerRequests(requests || []);
    } catch (error: any) {
      console.error("Error loading prayer requests:", error);
      toast.error("Failed to load your prayer requests");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center gap-2 md:gap-4 px-3 md:px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/home")} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-bold">My Prayer Requests</h1>
        </div>
      </header>

      <main className="container mx-auto py-4 md:py-6 px-3 md:px-4 max-w-4xl">
        <div className="mb-4 md:mb-6">
          <p className="text-sm md:text-base text-muted-foreground">
            View all your submitted prayer requests and their status. Church leadership prays over each request.
          </p>
        </div>

        {prayerRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 md:py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                <div>
                  <p className="text-base md:text-lg font-medium mb-1">No prayer requests yet</p>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Submit your first prayer request from the Prayer tab on the home page.
                  </p>
                </div>
                <Button onClick={() => navigate("/home")} className="mt-2 min-h-[44px] text-sm md:text-base">
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {prayerRequests.map((request) => (
              <Card 
                key={request.id} 
                className={request.is_urgent ? "border-destructive" : ""}
              >
                <CardHeader className="pb-3 md:pb-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <CardTitle className="text-lg md:text-xl flex-1 min-w-0 break-words">
                        {request.title}
                      </CardTitle>
                      <div className="flex gap-2 shrink-0">
                        {request.is_urgent && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span className="text-xs">Urgent</span>
                          </Badge>
                        )}
                        {request.is_answered && (
                          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                            <CheckCircle className="h-3 w-3" />
                            <span className="text-xs">Answered</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-xs md:text-sm">
                      Submitted on {format(new Date(request.created_at), "PPp")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm md:text-base break-words">
                    {request.content}
                  </p>
                  
                  {request.is_answered && (
                    <div className="mt-4 p-3 md:p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                      <p className="text-xs md:text-sm text-green-800 dark:text-green-200 font-medium">
                        ✓ This prayer request has been marked as answered by church leadership.
                      </p>
                    </div>
                  )}
                  
                  {!request.is_answered && (
                    <div className="mt-4 p-3 md:p-4 bg-muted rounded-lg">
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Church leadership is praying over this request. You will be notified when it's marked as answered.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
