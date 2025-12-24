import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const LAST_READ_KEY = "chat_last_read_at";

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const getLastReadTimestamp = () => {
    return localStorage.getItem(LAST_READ_KEY) || new Date(0).toISOString();
  };

  const markAsRead = () => {
    localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
    setUnreadCount(0);
  };

  const fetchUnreadCount = async (userId: string | null) => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    const lastRead = getLastReadTimestamp();
    
    // Count messages that are:
    // 1. Not deleted
    // 2. Created after the last read timestamp
    // 3. NOT sent by the current user (so your own messages don't count as unread)
    const { count, error } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .gt("created_at", lastRead)
      .neq("user_id", userId);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      setCurrentUserId(userId);
      fetchUnreadCount(userId);
    };

    getCurrentUser();

    // Subscribe to new messages
    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          // Only increment if the message is from someone else
          if (currentUserId && payload.new.user_id !== currentUserId) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return { unreadCount, markAsRead, fetchUnreadCount: () => fetchUnreadCount(currentUserId) };
};
