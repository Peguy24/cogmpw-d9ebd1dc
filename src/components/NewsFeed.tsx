import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author: {
    full_name: string;
  } | null;
}

const NewsFeed = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select(`
          id,
          title,
          content,
          is_pinned,
          created_at,
          author_id
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch author profiles separately
      const newsWithAuthors = await Promise.all(
        (data || []).map(async (item) => {
          if (item.author_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", item.author_id)
              .single();
            
            return {
              ...item,
              author: profile,
            };
          }
          return {
            ...item,
            author: null,
          };
        })
      );

      setNews(newsWithAuthors);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No announcements yet. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((item) => (
        <Card key={item.id} className={item.is_pinned ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="flex items-center gap-2">
                  {item.is_pinned && (
                    <Pin className="h-4 w-4 text-primary fill-primary" />
                  )}
                  {item.title}
                </CardTitle>
                <CardDescription>
                  {item.author?.full_name || "Church Admin"} •{" "}
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </CardDescription>
              </div>
              {item.is_pinned && (
                <Badge variant="default">Pinned</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{item.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NewsFeed;
