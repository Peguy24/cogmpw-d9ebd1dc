import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, HandHeart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
}

interface MessageReactionsProps {
  messageId: string;
  currentUserId: string;
  isOwnMessage: boolean;
}

const REACTION_CONFIG = {
  like: { icon: Heart, label: "Like", color: "text-red-500" },
  prayer: { icon: HandHeart, label: "Prayer", color: "text-blue-500" },
  amen: { icon: Sparkles, label: "Amen", color: "text-amber-500" },
} as const;

type ReactionType = keyof typeof REACTION_CONFIG;

export const MessageReactions = ({ messageId, currentUserId, isOwnMessage }: MessageReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("message_id", messageId);
    
    if (data) {
      setReactions(data);
    }
  };

  const toggleReaction = async (reactionType: ReactionType) => {
    if (loading) return;
    setLoading(true);

    try {
      const existingReaction = reactions.find(
        (r) => r.user_id === currentUserId && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Optimistically update UI first
        setReactions(prev => prev.filter(r => r.id !== existingReaction.id));
        
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);
        
        if (error) {
          console.error("Error removing reaction:", error);
          // Revert on error
          await fetchReactions();
        }
      } else {
        // Optimistically add reaction
        const tempId = `temp-${Date.now()}`;
        const newReaction: Reaction = {
          id: tempId,
          message_id: messageId,
          user_id: currentUserId,
          reaction_type: reactionType,
        };
        setReactions(prev => [...prev, newReaction]);

        const { error } = await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction_type: reactionType,
        });

        if (error) {
          console.error("Error adding reaction:", error);
          // Revert on error
          setReactions(prev => prev.filter(r => r.id !== tempId));
        } else {
          // Fetch to get real ID
          await fetchReactions();
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
      await fetchReactions();
    } finally {
      setLoading(false);
    }
  };

  const getReactionCounts = () => {
    const counts: Record<ReactionType, { count: number; hasUserReacted: boolean }> = {
      like: { count: 0, hasUserReacted: false },
      prayer: { count: 0, hasUserReacted: false },
      amen: { count: 0, hasUserReacted: false },
    };

    reactions.forEach((r) => {
      const type = r.reaction_type as ReactionType;
      if (counts[type]) {
        counts[type].count++;
        if (r.user_id === currentUserId) {
          counts[type].hasUserReacted = true;
        }
      }
    });

    return counts;
  };

  const counts = getReactionCounts();
  const hasAnyReactions = Object.values(counts).some((c) => c.count > 0);

  return (
    <div className={cn("flex items-center gap-1 mt-1", isOwnMessage ? "justify-end" : "justify-start")}>
      {(Object.keys(REACTION_CONFIG) as ReactionType[]).map((type) => {
        const config = REACTION_CONFIG[type];
        const Icon = config.icon;
        const { count, hasUserReacted } = counts[type];

        if (!hasAnyReactions && !hasUserReacted) {
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => toggleReaction(type)}
              disabled={loading}
            >
              <Icon className={cn("h-3.5 w-3.5", config.color)} />
            </Button>
          );
        }

        if (count > 0 || hasUserReacted) {
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-1.5 gap-1",
                hasUserReacted && "bg-muted"
              )}
              onClick={() => toggleReaction(type)}
              disabled={loading}
            >
              <Icon className={cn("h-3.5 w-3.5", hasUserReacted ? config.color : "text-muted-foreground")} />
              {count > 0 && <span className="text-xs">{count}</span>}
            </Button>
          );
        }

        return (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => toggleReaction(type)}
            disabled={loading}
          >
            <Icon className={cn("h-3.5 w-3.5 text-muted-foreground")} />
          </Button>
        );
      })}
    </div>
  );
};
