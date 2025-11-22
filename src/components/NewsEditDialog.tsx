import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const newsSchema = z.object({
  title: z.string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must be less than 200 characters" }),
  content: z.string()
    .trim()
    .min(1, { message: "Content is required" })
    .max(5000, { message: "Content must be less than 5000 characters" }),
  is_pinned: z.boolean().default(false),
});

type NewsFormValues = z.infer<typeof newsSchema>;

interface NewsItem {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  media_url: string | null;
  media_type: string | null;
}

interface NewsEditDialogProps {
  news: NewsItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const NewsEditDialog = ({ news, open, onOpenChange, onSuccess }: NewsEditDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(news.media_url);
  const [removeMedia, setRemoveMedia] = useState(false);

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: news.title,
      content: news.content,
      is_pinned: news.is_pinned,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: news.title,
        content: news.content,
        is_pinned: news.is_pinned,
      });
      setMediaPreview(news.media_url);
      setMediaFile(null);
      setRemoveMedia(false);
    }
  }, [open, news, form]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 50MB",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    setRemoveMedia(false);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setRemoveMedia(true);
  };

  const onSubmit = async (values: NewsFormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to edit news",
          variant: "destructive",
        });
        return;
      }

      let mediaUrl: string | null = news.media_url;
      let mediaType: string | null = news.media_type;

      // Handle media changes
      if (removeMedia && news.media_url) {
        // Delete old media from storage
        const oldFileName = news.media_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('news-media')
            .remove([oldFileName]);
        }
        mediaUrl = null;
        mediaType = null;
      } else if (mediaFile) {
        // Delete old media if exists
        if (news.media_url) {
          const oldFileName = news.media_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('news-media')
              .remove([oldFileName]);
          }
        }

        // Upload new media
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('news-media')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('news-media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const { error } = await supabase
        .from("news")
        .update({
          title: values.title,
          content: values.content,
          is_pinned: values.is_pinned,
          media_url: mediaUrl,
          media_type: mediaType,
        })
        .eq("id", news.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "News post updated successfully",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating news post:", error);
      toast({
        title: "Error",
        description: "Failed to update news post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit News Post</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter news title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter news content" 
                      className="min-h-[120px] resize-y"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Image or Video (Optional)</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    disabled={isSubmitting}
                  />
                  {mediaPreview && !removeMedia && (
                    <div className="relative">
                      {(mediaFile?.type.startsWith('video/') || news.media_type === 'video') ? (
                        <video 
                          src={mediaPreview} 
                          controls 
                          className="w-full rounded-lg max-h-64 object-cover"
                        />
                      ) : (
                        <img 
                          src={mediaPreview} 
                          alt="Preview" 
                          className="w-full rounded-lg max-h-64 object-cover"
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveMedia}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload an image or video (max 50MB). Supported formats: JPG, PNG, WEBP, GIF, MP4, WEBM
              </FormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="is_pinned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Pin Post</FormLabel>
                    <FormDescription>
                      Pinned posts appear at the top of the news feed
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Post"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewsEditDialog;
