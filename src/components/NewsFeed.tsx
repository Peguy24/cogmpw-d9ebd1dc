import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pin, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import NewsPostForm from "./NewsPostForm";
import NewsEditDialog from "./NewsEditDialog";
import { toast } from "@/hooks/use-toast";
import PullToRefresh from "react-simple-pull-to-refresh";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  author: {
    full_name: string;
  } | null;
}

const NewsFeed = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [deletingNewsId, setDeletingNewsId] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCheckingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "leader", "super_leader"]);

      if (error) throw error;

      if (data && data.length > 0) {
        setUserRole(data[0].role);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    } finally {
      setCheckingRole(false);
    }
  };

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
          author_id,
          media_url,
          media_type
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const newsWithAuthors = await Promise.all(
        (data || []).map(async (item) => {
          if (item.author_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", item.author_id)
              .maybeSingle();

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

      setNews(newsWithAuthors as NewsItem[]);
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
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const handleDelete = async (newsId: string, mediaUrl: string | null) => {
    try {
      // Delete media from storage if exists
      if (mediaUrl) {
        const fileName = mediaUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('news-media')
            .remove([fileName]);
        }
      }

      // Delete news post
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", newsId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "News post deleted successfully",
      });

      fetchNews();
    } catch (error) {
      console.error("Error deleting news post:", error);
      toast({
        title: "Error",
        description: "Failed to delete news post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingNewsId(null);
    }
  };

  const canPostNews = userRole === "admin" || userRole === "leader" || userRole === "super_leader";

  const handleRefresh = async () => {
    await fetchNews();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="space-y-3 md:space-y-4">
      {!checkingRole && canPostNews && (
        <NewsPostForm onSuccess={fetchNews} />
      )}

      {news.length === 0 ? (
        <Card>
          <CardContent className="pt-4 md:pt-6 py-6 md:py-8">
            <p className="text-center text-sm md:text-base text-muted-foreground">
              No announcements yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        news.map((item) => (
          <Card key={item.id} className={item.is_pinned ? "border-primary" : ""}>
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-start justify-between gap-3 md:gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg break-words">
                    {item.is_pinned && (
                      <Pin className="h-4 w-4 shrink-0 text-primary fill-primary" />
                    )}
                    <span className="break-words">{item.title}</span>
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm break-words">
                    {item.author?.full_name || "Church Admin"} • {" "}
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  {item.is_pinned && (
                    <Badge variant="default" className="text-xs">Pinned</Badge>
                  )}
                  {canPostNews && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                        onClick={() => setEditingNews(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                        onClick={() => setDeletingNewsId(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {item.media_url && (
                <div className="mb-3 md:mb-4">
                  {item.media_type === 'video' ? (
                    <video 
                      src={item.media_url} 
                      controls 
                      className="w-full rounded-lg max-h-64 md:max-h-96 object-cover"
                    />
                  ) : (
                    <img 
                      src={item.media_url} 
                      alt={item.title}
                      className="w-full rounded-lg max-h-64 md:max-h-96 object-cover"
                    />
                  )}
                </div>
              )}
              <p className="text-sm md:text-base text-foreground whitespace-pre-wrap break-words">{item.content}</p>
            </CardContent>
          </Card>
        ))
      )}

      {editingNews && (
        <NewsEditDialog
          news={editingNews}
          open={!!editingNews}
          onOpenChange={(open) => !open && setEditingNews(null)}
          onSuccess={fetchNews}
        />
      )}

      <AlertDialog open={!!deletingNewsId} onOpenChange={(open) => !open && setDeletingNewsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete News Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this news post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const newsItem = news.find(n => n.id === deletingNewsId);
                if (newsItem) {
                  handleDelete(newsItem.id, newsItem.media_url);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PullToRefresh>
  );
};

export default NewsFeed;
