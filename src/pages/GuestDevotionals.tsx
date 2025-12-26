import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowLeft, LogIn, BookMarked } from "lucide-react";
import { format } from "date-fns";

interface Devotional {
  id: string;
  title: string;
  content: string;
  devotional_date: string;
  scripture_reference: string | null;
  visibility: string;
}

const GuestDevotionals = () => {
  const navigate = useNavigate();
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGuestDevotionals();
  }, []);

  const fetchGuestDevotionals = async () => {
    try {
      const { data, error } = await supabase
        .from("devotionals")
        .select("*")
        .in("visibility", ["guest", "both"])
        .order("devotional_date", { ascending: false });

      if (error) throw error;
      setDevotionals(data || []);
    } catch (error) {
      console.error("Error fetching guest devotionals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Daily Devotionals</h1>
            <p className="text-muted-foreground">
              Spiritual insights and biblical wisdom for daily reflection
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Devotionals List */}
        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : devotionals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No devotionals available at the moment
                </p>
              </CardContent>
            </Card>
          ) : (
            devotionals.map((devotional) => (
              <Card key={devotional.id}>
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle>{devotional.title}</CardTitle>
                  </div>
                  <CardDescription>
                    {format(new Date(devotional.devotional_date), "MMMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {devotional.scripture_reference && (
                    <Badge variant="secondary" className="gap-1">
                      <BookMarked className="h-3 w-3" />
                      {devotional.scripture_reference}
                    </Badge>
                  )}
                  
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {devotional.content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Subtle member link at bottom */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Already a church member?{" "}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate("/auth")}>
              Sign in here
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestDevotionals;
