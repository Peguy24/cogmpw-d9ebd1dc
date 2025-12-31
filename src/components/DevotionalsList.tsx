import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, BookOpen, Eye, Lock, Globe } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import DevotionalPostForm from "./DevotionalPostForm";
import DevotionalEditDialog from "./DevotionalEditDialog";
import PullToRefresh from "react-simple-pull-to-refresh";

interface Devotional {
  id: string;
  title: string;
  content: string;
  devotional_date: string;
  scripture_reference: string | null;
  created_at: string;
  visibility: "guest" | "member" | "both";
}

const DevotionalsList = () => {
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDevotional, setEditingDevotional] = useState<Devotional | null>(null);

  useEffect(() => {
    checkRole();
    loadDevotionals();
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

  const loadDevotionals = async () => {
    const { data, error } = await supabase
      .from("devotionals")
      .select("*")
      .order("devotional_date", { ascending: false });

    if (error) {
      toast.error("Failed to load devotionals");
      console.error(error);
    } else {
      setDevotionals((data as Devotional[]) || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this devotional?")) return;

    const { error } = await supabase
      .from("devotionals")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete devotional");
      console.error(error);
    } else {
      toast.success("Devotional deleted successfully");
      loadDevotionals();
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading devotionals...</div>;
  }

  const handleRefresh = async () => {
    await loadDevotionals();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="space-y-4 md:space-y-6">
      {isLeaderOrAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 text-sm md:text-base h-9 md:h-10">
            <Plus className="h-4 w-4" />
            Add Devotional
          </Button>
        </div>
      )}

      {showForm && (
        <DevotionalPostForm
          onSuccess={() => {
            setShowForm(false);
            loadDevotionals();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <ScrollArea className="h-[500px] md:h-[600px]">
        <div className="space-y-3 md:space-y-4 pr-3 md:pr-4">
          {devotionals.length === 0 ? (
            <Card>
              <CardContent className="py-6 md:py-8 text-center text-sm md:text-base text-muted-foreground">
                No devotionals available yet
              </CardContent>
            </Card>
          ) : (
            devotionals.map((devotional) => (
              <Card key={devotional.id}>
                <CardHeader className="pb-3 md:pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <BookOpen className="h-4 w-4 md:h-5 md:w-5 shrink-0 text-primary" />
                        <CardTitle className="text-base md:text-lg break-words">{devotional.title}</CardTitle>
                        {isLeaderOrAdmin && (
                          <Badge 
                            variant={
                              devotional.visibility === "guest" ? "secondary" :
                              devotional.visibility === "member" ? "default" :
                              "outline"
                            }
                            className="gap-1 text-xs shrink-0"
                          >
                            {devotional.visibility === "guest" ? (
                              <>
                                <Eye className="h-3 w-3" />
                                Guests
                              </>
                            ) : devotional.visibility === "member" ? (
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
                      <CardDescription className="text-xs md:text-sm">
                        {format(new Date(devotional.devotional_date), "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                    {isLeaderOrAdmin && (
                      <div className="flex gap-1 md:gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:h-9 md:w-9"
                          onClick={() => setEditingDevotional(devotional)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:h-9 md:w-9"
                          onClick={() => handleDelete(devotional.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  {devotional.scripture_reference && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {devotional.scripture_reference}
                    </Badge>
                  )}
                  <p className="text-sm md:text-base text-foreground whitespace-pre-wrap break-words">{devotional.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {editingDevotional && (
        <DevotionalEditDialog
          devotional={editingDevotional}
          open={!!editingDevotional}
          onOpenChange={(open) => !open && setEditingDevotional(null)}
          onSuccess={() => {
            setEditingDevotional(null);
            loadDevotionals();
          }}
        />
      )}
      </div>
    </PullToRefresh>
  );
};

export default DevotionalsList;
