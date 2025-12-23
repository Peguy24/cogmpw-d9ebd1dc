import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const LAST_READ_KEY = "chat_last_read_at";

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const getLastReadTimestamp = () => {
    return localStorage.getItem(LAST_READ_KEY) || new Date(0).toISOString();
  };

  const markAsRead = () => {
    localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
    setUnreadCount(0);
  };

  const fetchUnreadCount = async () => {
    const lastRead = getLastReadTimestamp();
    
    const { count, error } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .gt("created_at", lastRead);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

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
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadCount, markAsRead, fetchUnreadCount };
};
