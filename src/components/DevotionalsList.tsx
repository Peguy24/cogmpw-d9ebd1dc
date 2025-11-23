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
      .in("role", ["admin", "leader"]);

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

  return (
    <div className="space-y-6">
      {isLeaderOrAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
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

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {devotionals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No devotionals available yet
              </CardContent>
            </Card>
          ) : (
            devotionals.map((devotional) => (
              <Card key={devotional.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <CardTitle>{devotional.title}</CardTitle>
                        {isLeaderOrAdmin && (
                          <Badge 
                            variant={
                              devotional.visibility === "guest" ? "secondary" :
                              devotional.visibility === "member" ? "default" :
                              "outline"
                            }
                            className="gap-1"
                          >
                            {devotional.visibility === "guest" ? (
                              <>
                                <Eye className="h-3 w-3" />
                                Guests Only
                              </>
                            ) : devotional.visibility === "member" ? (
                              <>
                                <Lock className="h-3 w-3" />
                                Members Only
                              </>
                            ) : (
                              <>
                                <Globe className="h-3 w-3" />
                                Everyone
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {format(new Date(devotional.devotional_date), "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                    {isLeaderOrAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingDevotional(devotional)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(devotional.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {devotional.scripture_reference && (
                    <Badge variant="outline" className="font-mono">
                      {devotional.scripture_reference}
                    </Badge>
                  )}
                  <p className="text-foreground whitespace-pre-wrap">{devotional.content}</p>
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
  );
};

export default DevotionalsList;
