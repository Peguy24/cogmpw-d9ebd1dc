import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Target, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CampaignForm } from "@/components/CampaignForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("giving_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("giving_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Campaign deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setDeletingCampaign(null);
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const handleEdit = (campaign: any) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCampaign(null);
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCampaign(null);
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/home")}
              className="min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold">Manage Campaigns</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Create and manage giving campaigns</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin/campaigns/analytics")}
              className="min-h-[44px] text-sm md:text-base w-full sm:w-auto"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="min-h-[44px] text-sm md:text-base w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {showForm && (
          <CampaignForm
            campaign={editingCampaign}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>View and manage all giving campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const progress = (campaign.current_amount / campaign.target_amount) * 100;
                  const isExpired = new Date(campaign.end_date) < new Date();
                  const isComplete = progress >= 100;

                  return (
                    <div
                      key={campaign.id}
                      className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 md:p-6 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base md:text-lg break-words">{campaign.title}</h3>
                          {campaign.is_active ? (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                          {isComplete && (
                            <Badge variant="default" className="bg-green-500 text-xs">
                              <Target className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                          {isExpired && !isComplete && (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 break-words">
                          {campaign.description}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs md:text-sm">
                          <div>
                            <span className="text-muted-foreground">Raised: </span>
                            <span className="font-semibold text-primary">
                              ${campaign.current_amount.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}/ ${campaign.target_amount.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Progress: </span>
                            <span className="font-semibold">{progress.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ends: </span>
                            <span className="font-medium">
                              {new Date(campaign.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end md:self-center">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(campaign)}
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeletingCampaign(campaign.id)}
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 md:py-12">
                <Target className="h-10 md:h-12 w-10 md:w-12 mx-auto text-muted-foreground mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">No campaigns created yet</p>
                <Button onClick={() => setShowForm(true)} className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Campaign
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCampaign && handleDelete(deletingCampaign)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
