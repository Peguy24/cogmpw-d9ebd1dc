import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Send, Trash2, MessageCircle, Reply, X } from "lucide-react";
import { format } from "date-fns";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
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

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  reply_to_id?: string | null;
  profiles?: {
    full_name: string;
  };
}

interface TypingUser {
  user_id: string;
  full_name: string;
}

const CommunityChat = () => {
  const navigate = useNavigate();
  const { markAsRead } = useUnreadMessages();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark messages as read when component mounts
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  useEffect(() => {
    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(user.id);

      // Check if user is approved and get name
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved, full_name")
        .eq("id", user.id)
        .single();

      if (!profile?.is_approved) {
        toast.error("You must be approved to access the chat");
        navigate("/home");
        return;
      }
      setIsApproved(true);
      setCurrentUserName(profile.full_name || "Unknown");

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setIsAdmin(roles?.some(r => r.role === "admin") || false);

      await fetchMessages();
    };

    checkUserAndFetch();
  }, [navigate]);

  // Set up typing presence channel
  useEffect(() => {
    if (!isApproved || !currentUserId || !currentUserName) return;

    const typingChannel = supabase.channel("chat-typing", {
      config: { presence: { key: currentUserId } },
    });

    typingChannel
      .on("presence", { event: "sync" }, () => {
        const state = typingChannel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== currentUserId && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as unknown as { user_id: string; full_name: string; is_typing: boolean };
            if (presence.is_typing) {
              typing.push({ user_id: presence.user_id, full_name: presence.full_name });
            }
          }
        });
        
        setTypingUsers(typing);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(typingChannel);
    };
  }, [isApproved, currentUserId, currentUserName]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!isApproved) return;

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the profile for the new message
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", (payload.new as ChatMessage).user_id)
              .single();

            const newMsg = {
              ...(payload.new as ChatMessage),
              profiles: profile,
            };
            setMessages(prev => [...prev, newMsg]);
          } else if (payload.eventType === "UPDATE") {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === (payload.new as ChatMessage).id
                  ? { ...msg, ...(payload.new as ChatMessage) }
                  : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isApproved]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTyping = useCallback(() => {
    if (!typingChannelRef.current || !currentUserId || !currentUserName) return;

    // Track typing state
    typingChannelRef.current.track({
      user_id: currentUserId,
      full_name: currentUserName,
      is_typing: true,
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.track({
        user_id: currentUserId,
        full_name: currentUserName,
        is_typing: false,
      });
    }, 2000);
  }, [currentUserId, currentUserName]);

  const stopTyping = useCallback(() => {
    if (!typingChannelRef.current || !currentUserId || !currentUserName) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingChannelRef.current.track({
      user_id: currentUserId,
      full_name: currentUserName,
      is_typing: false,
    });
  }, [currentUserId, currentUserName]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, user_id, content, is_deleted, created_at, reply_to_id")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      toast.error("Failed to load messages");
      console.error(error);
    } else if (data) {
      // Fetch profiles for all unique user IDs
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const messagesWithProfiles = data.map(m => ({
        ...m,
        profiles: profileMap.get(m.user_id) || { full_name: "Unknown" },
      }));
      setMessages(messagesWithProfiles);
    }
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || sending) return;

    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: currentUserId,
      content: newMessage.trim(),
      reply_to_id: replyingTo?.id || null,
    });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else {
      setNewMessage("");
      setReplyingTo(null);
      inputRef.current?.focus();
    }
    setSending(false);
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("chat_messages")
      .update({ is_deleted: true, deleted_by: currentUserId })
      .eq("id", messageId);

    if (error) {
      toast.error("Failed to delete message");
      console.error(error);
    } else {
      toast.success("Message deleted");
    }
    setDeleteMessageId(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getReplyMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-primary/10");
      setTimeout(() => element.classList.remove("bg-primary/10"), 1500);
    }
  };

  if (!isApproved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Community Chat</h1>
          </div>
          {isAdmin && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Moderator
            </span>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Be the first to say hello!</p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map((message) => {
              const isOwn = message.user_id === currentUserId;
              const canDelete = isOwn || isAdmin;
              const replyMessage = message.reply_to_id ? getReplyMessage(message.reply_to_id) : null;

              if (message.is_deleted) {
                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={`flex items-center gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <p className="text-sm text-muted-foreground italic">
                      Message deleted
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  id={`message-${message.id}`}
                  className={`flex items-start gap-2 transition-colors duration-300 rounded-lg ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(message.profiles?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`group max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {message.profiles?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        {format(new Date(message.created_at), "h:mm a")}
                      </span>
                    </div>
                    
                    {/* Reply Preview */}
                    {replyMessage && (
                      <button
                        onClick={() => scrollToMessage(replyMessage.id)}
                        className={`flex items-start gap-1.5 mb-1 px-2 py-1 rounded-lg text-left transition-colors hover:bg-muted/50 ${
                          isOwn ? "bg-primary/20" : "bg-muted/80"
                        }`}
                      >
                        <Reply className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">
                            {replyMessage.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground/80 truncate max-w-[200px]">
                            {replyMessage.is_deleted ? "Message deleted" : replyMessage.content}
                          </p>
                        </div>
                      </button>
                    )}
                    
                    <div className={`flex items-center gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleReply(message)}
                        >
                          <Reply className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setDeleteMessageId(message.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-t bg-muted/50 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary">
                  Replying to {replyingTo.profiles?.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {typingUsers.length === 1
                ? `${typingUsers[0].full_name} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].full_name} and ${typingUsers[1].full_name} are typing...`
                : `${typingUsers[0].full_name} and ${typingUsers.length - 1} others are typing...`}
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 border-t bg-background p-4 safe-area-bottom">
        <form onSubmit={(e) => { sendMessage(e); stopTyping(); }} className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (e.target.value) {
                handleTyping();
              } else {
                stopTyping();
              }
            }}
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={() => setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMessageId && deleteMessage(deleteMessageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommunityChat;
