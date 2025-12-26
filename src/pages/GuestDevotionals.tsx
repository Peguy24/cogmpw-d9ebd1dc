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
      <div className="container py-4 md:py-8 px-3 md:px-4 space-y-4 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">Daily Devotionals</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Spiritual insights and biblical wisdom for daily reflection
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/guest")}
            className="self-start sm:self-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Devotionals List */}
        <div className="space-y-4 md:space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="p-4 md:p-6">
                  <Skeleton className="h-5 md:h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : devotionals.length === 0 ? (
            <Card>
              <CardContent className="py-8 md:py-12 text-center">
                <BookOpen className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">
                  No devotionals available at the moment
                </p>
              </CardContent>
            </Card>
          ) : (
            devotionals.map((devotional) => (
              <Card key={devotional.id}>
                <CardHeader className="p-4 md:p-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <CardTitle className="text-base md:text-xl">{devotional.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    {format(new Date(devotional.devotional_date), "MMMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
                  {devotional.scripture_reference && (
                    <Badge variant="secondary" className="gap-1 text-xs md:text-sm">
                      <BookMarked className="h-3 w-3" />
                      {devotional.scripture_reference}
                    </Badge>
                  )}
                  
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-sm md:text-base text-foreground whitespace-pre-wrap leading-relaxed">
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
          <p className="text-xs md:text-sm text-muted-foreground">
            Already a church member?{" "}
            <Button variant="link" className="p-0 h-auto text-xs md:text-sm" onClick={() => navigate("/auth")}>
              Sign in here
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestDevotionals;
