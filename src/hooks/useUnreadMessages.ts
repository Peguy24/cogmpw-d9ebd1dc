import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  // Store the initial lastReadAt before marking as read (for showing the separator)
  const initialLastReadAt = useRef<string | null>(null);

  // Fetch or create read status from database
  const getLastReadTimestamp = useCallback(async (userId: string): Promise<string> => {
    const { data, error } = await supabase
      .from("chat_read_status")
      .select("last_read_at")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // If no record exists, return epoch (all messages are unread)
      return new Date(0).toISOString();
    }

    return data.last_read_at;
  }, []);

  const markAsRead = useCallback(async () => {
    if (!currentUserId) return;

    const now = new Date().toISOString();

    // Upsert the read status in database
    const { error } = await supabase
      .from("chat_read_status")
      .upsert(
        { 
          user_id: currentUserId, 
          last_read_at: now,
          updated_at: now
        },
        { onConflict: "user_id" }
      );

    if (!error) {
      setLastReadAt(now);
      setUnreadCount(0);
    }
  }, [currentUserId]);

  const fetchUnreadCount = useCallback(async (userId: string | null, lastRead?: string) => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    // Use provided lastRead or fetch from database
    const timestamp = lastRead || await getLastReadTimestamp(userId);
    
    // Count messages that are:
    // 1. Not deleted
    // 2. Created after the last read timestamp
    // 3. NOT sent by the current user
    const { count, error } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .gt("created_at", timestamp)
      .neq("user_id", userId);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [getLastReadTimestamp]);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      setCurrentUserId(userId);
      
      if (userId) {
        const timestamp = await getLastReadTimestamp(userId);
        setLastReadAt(timestamp);
        // Store initial timestamp for separator display
        if (!initialLastReadAt.current) {
          initialLastReadAt.current = timestamp;
        }
        fetchUnreadCount(userId, timestamp);
      }
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
  }, [currentUserId, fetchUnreadCount, getLastReadTimestamp]);

  return { 
    unreadCount, 
    markAsRead, 
    lastReadAt,
    initialLastReadAt: initialLastReadAt.current,
    fetchUnreadCount: () => fetchUnreadCount(currentUserId, lastReadAt) 
  };
};
