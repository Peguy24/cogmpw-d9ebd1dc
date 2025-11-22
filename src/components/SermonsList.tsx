import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Video, Music, FileText, Plus, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import SermonPostForm from "./SermonPostForm";
import SermonEditDialog from "./SermonEditDialog";

interface Sermon {
  id: string;
  title: string;
  description: string | null;
  sermon_date: string;
  speaker: string | null;
  media_type: string;
  media_url: string | null;
  created_at: string;
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
      .in("role", ["admin", "leader"]);

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
      setSermons(data || []);
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

  return (
    <div className="space-y-6">
      {isLeaderOrAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
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

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {sermons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No sermons available yet
              </CardContent>
            </Card>
          ) : (
            sermons.map((sermon) => (
              <Card key={sermon.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{sermon.title}</CardTitle>
                        <Badge variant="secondary" className="gap-1">
                          {getMediaIcon(sermon.media_type)}
                          {sermon.media_type}
                        </Badge>
                      </div>
                      <CardDescription>
                        {format(new Date(sermon.sermon_date), "MMMM d, yyyy")}
                        {sermon.speaker && ` • ${sermon.speaker}`}
                      </CardDescription>
                    </div>
                    {isLeaderOrAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSermon(sermon)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sermon.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {sermon.description && (
                    <p className="text-muted-foreground mb-4">{sermon.description}</p>
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
                          className="w-full gap-2"
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
  );
};

export default SermonsList;
