import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Video, Music, FileText, Plus, Edit2, Trash2, Eye, Lock, Globe } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import SermonPostForm from "./SermonPostForm";
import SermonEditDialog from "./SermonEditDialog";
import PullToRefresh from "react-simple-pull-to-refresh";

interface Sermon {
  id: string;
  title: string;
  description: string | null;
  sermon_date: string;
  speaker: string | null;
  media_type: string;
  media_url: string | null;
  created_at: string;
  visibility: "guest" | "member" | "both";
}

const SermonsList = () => {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);

  useEffect(() => {
    checkRole();
    loadSermons();
  }, []);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "leader", "super_leader"]);

    setIsLeaderOrAdmin(roles && roles.length > 0);
  };

  const loadSermons = async () => {
    const { data, error } = await supabase
      .from("sermons")
      .select("*")
      .order("sermon_date", { ascending: false });

    if (error) {
      toast.error("Failed to load sermons");
      console.error(error);
    } else {
      setSermons((data as Sermon[]) || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sermon?")) return;

    const { error } = await supabase
      .from("sermons")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete sermon");
      console.error(error);
    } else {
      toast.success("Sermon deleted successfully");
      loadSermons();
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "audio":
        return <Music className="h-5 w-5" />;
      case "pdf":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading sermons...</div>;
  }

  const handleRefresh = async () => {
    await loadSermons();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="space-y-4 md:space-y-6">
      {isLeaderOrAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 text-sm md:text-base h-9 md:h-10">
            <Plus className="h-4 w-4" />
            Add Sermon
          </Button>
        </div>
      )}

      {showForm && (
        <SermonPostForm
          onSuccess={() => {
            setShowForm(false);
            loadSermons();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <ScrollArea className="h-[500px] md:h-[600px]">
        <div className="space-y-3 md:space-y-4 pr-3 md:pr-4">
          {sermons.length === 0 ? (
            <Card>
              <CardContent className="py-6 md:py-8 text-center text-sm md:text-base text-muted-foreground">
                No sermons available yet
              </CardContent>
            </Card>
          ) : (
            sermons.map((sermon) => (
              <Card key={sermon.id}>
                <CardHeader className="pb-3 md:pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base md:text-lg break-words">{sermon.title}</CardTitle>
                        <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                          {getMediaIcon(sermon.media_type)}
                          <span className="capitalize">{sermon.media_type}</span>
                        </Badge>
                        {isLeaderOrAdmin && (
                          <Badge 
                            variant={
                              sermon.visibility === "guest" ? "secondary" :
                              sermon.visibility === "member" ? "default" :
                              "outline"
                            }
                            className="gap-1 text-xs shrink-0"
                          >
                            {sermon.visibility === "guest" ? (
                              <>
                                <Eye className="h-3 w-3" />
                                Guests
                              </>
                            ) : sermon.visibility === "member" ? (
                              <>
                                <Lock className="h-3 w-3" />
                                Members
                              </>
                            ) : (
                              <>
                                <Globe className="h-3 w-3" />
                                All
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs md:text-sm break-words">
                        {format(new Date(sermon.sermon_date), "MMMM d, yyyy")}
                        {sermon.speaker && ` • ${sermon.speaker}`}
                      </CardDescription>
                    </div>
                    {isLeaderOrAdmin && (
                      <div className="flex gap-1 md:gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:h-9 md:w-9"
                          onClick={() => setEditingSermon(sermon)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:h-9 md:w-9"
                          onClick={() => handleDelete(sermon.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  {sermon.description && (
                    <p className="text-sm md:text-base text-muted-foreground break-words">{sermon.description}</p>
                  )}
                  {sermon.media_url && (
                    <div className="space-y-2">
                      {sermon.media_type === "video" && (
                        <video controls className="w-full rounded-lg">
                          <source src={sermon.media_url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {sermon.media_type === "audio" && (
                        <audio controls className="w-full">
                          <source src={sermon.media_url} type="audio/mpeg" />
                          Your browser does not support the audio tag.
                        </audio>
                      )}
                      {sermon.media_type === "pdf" && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-sm md:text-base h-10 md:h-11"
                          onClick={() => window.open(sermon.media_url!, "_blank")}
                        >
                          <FileText className="h-4 w-4" />
                          View PDF
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {editingSermon && (
        <SermonEditDialog
          sermon={editingSermon}
          open={!!editingSermon}
          onOpenChange={(open) => !open && setEditingSermon(null)}
          onSuccess={() => {
            setEditingSermon(null);
            loadSermons();
          }}
        />
      )}
      </div>
    </PullToRefresh>
  );
};

export default SermonsList;
