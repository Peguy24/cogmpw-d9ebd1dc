import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { Loader2, ImagePlus, Video } from "lucide-react";

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

interface NewsPostFormProps {
  onSuccess: () => void;
}

const NewsPostForm = ({ onSuccess }: NewsPostFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: "",
      content: "",
      is_pinned: false,
    },
  });

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 50MB",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: NewsFormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to post news",
          variant: "destructive",
        });
        return;
      }

      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop() || 'mp4';
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const contentType = mediaFile.type || (fileExt === 'mp4' ? 'video/mp4' : `image/${fileExt}`);
        
        console.log('Uploading media:', { name: fileName, size: mediaFile.size, type: contentType });
        
        const { error: uploadError } = await supabase.storage
          .from('news-media')
          .upload(fileName, mediaFile, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('news-media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const { error } = await supabase.from("news").insert({
        title: values.title,
        content: values.content,
        is_pinned: values.is_pinned,
        author_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
      });

      if (error) throw error;

      const { data: insertedNews } = await supabase
        .from("news")
        .select('id')
        .eq('title', values.title)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Create in-app notifications
      if (insertedNews) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.functions.invoke('create-notifications', {
            body: {
              title: 'New Announcement',
              message: values.title,
              type: 'news',
              relatedId: insertedNews.id
            },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });
        } catch (notifError) {
          console.error('Error creating notifications:', notifError);
        }
      }

      // Send push notification
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await supabase.functions.invoke('send-push-notification', {
          body: {
            title: '📰 New Church News',
            body: values.title,
            notificationType: 'news',
          },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
      } catch (notifError) {
        console.error('Error sending push notification:', notifError);
        // Don't fail the whole operation if notification fails
      }

      // Send email notifications to all members
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await supabase.functions.invoke("send-news-email", {
          body: {
            newsTitle: values.title,
            newsContent: values.content,
            isPinned: values.is_pinned,
          },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
      } catch (emailError) {
        console.error("Failed to send news emails:", emailError);
        // Don't show error to user - news post was created successfully
      }

      toast({
        title: "Success",
        description: "News post created successfully",
      });

      form.reset();
      setMediaFile(null);
      setMediaPreview(null);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating news post:", error?.message || error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create news post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Post News</CardTitle>
      </CardHeader>
      <CardContent>
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
                  {mediaPreview && (
                    <div className="relative">
                      {mediaFile?.type.startsWith('video/') ? (
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
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                        }}
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post News"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NewsPostForm;
