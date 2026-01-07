import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Send, Trash2, MessageCircle, Reply, X, ImagePlus, FileText, Loader2, Pin, PinOff } from "lucide-react";
import { format } from "date-fns";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { MessageReactions } from "@/components/MessageReactions";
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
  media_url?: string | null;
  media_type?: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: string | null;
  profiles?: {
    full_name: string;
    avatar_url?: string | null;
  };
}

interface TypingUser {
  user_id: string;
  full_name: string;
}

const CommunityChat = () => {
  const navigate = useNavigate();
  const { markAsRead, initialLastReadAt } = useUnreadMessages();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const SUPER_ADMIN_EMAIL = "labordepeguy2020@gmail.com";
  const isSuperAdmin = currentUserEmail === SUPER_ADMIN_EMAIL;

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
      setCurrentUserEmail(user.email || "");

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
              .select("full_name, avatar_url")
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

  const isInitialLoad = useRef(true);
  const unreadSeparatorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll behavior on initial load and when messages change
    if (scrollRef.current && messages.length > 0) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        if (isInitialLoad.current) {
          // On initial load, scroll to unread separator if it exists, otherwise scroll to bottom
          if (unreadSeparatorRef.current) {
            // Small delay to ensure the DOM is ready
            setTimeout(() => {
              unreadSeparatorRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
            }, 100);
          } else {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }
          isInitialLoad.current = false;
        } else {
          // Only auto-scroll if user is near the bottom (within 150px)
          const isNearBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 150;
          if (isNearBottom) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }
        }
      }
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
      .select("id, user_id, content, is_deleted, created_at, reply_to_id, media_url, media_type, is_pinned, pinned_at, pinned_by")
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
        .select("id, full_name, avatar_url")
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

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    if (!currentUserId) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload file');
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(fileName);

    const isImage = file.type.startsWith('image/');
    return { url: publicUrl, type: isImage ? 'image' : 'file' };
  };

  // Allowed file types for security
  const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Check file extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error('File type not allowed. Allowed: images, PDF, Word documents');
      return;
    }

    // Check MIME type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Invalid file type');
      return;
    }

    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentUserId || sending) return;

    setSending(true);
    setUploadingFile(!!selectedFile);

    let mediaData: { url: string; type: string } | null = null;
    
    if (selectedFile) {
      mediaData = await uploadFile(selectedFile);
      if (!mediaData && !newMessage.trim()) {
        setSending(false);
        setUploadingFile(false);
        return;
      }
    }

    const { error } = await supabase.from("chat_messages").insert({
      user_id: currentUserId,
      content: newMessage.trim() || (selectedFile ? selectedFile.name : ''),
      reply_to_id: replyingTo?.id || null,
      media_url: mediaData?.url || null,
      media_type: mediaData?.type || null,
    });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else {
      setNewMessage("");
      setReplyingTo(null);
      clearSelectedFile();
      inputRef.current?.focus();
    }
    setSending(false);
    setUploadingFile(false);
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

  const togglePinMessage = async (messageId: string, currentlyPinned: boolean) => {
    // Optimistically update UI first
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            is_pinned: !currentlyPinned,
            pinned_at: !currentlyPinned ? new Date().toISOString() : null,
            pinned_by: !currentlyPinned ? currentUserId : null,
          }
        : msg
    ));

    const { error } = await supabase
      .from("chat_messages")
      .update({
        is_pinned: !currentlyPinned,
        pinned_at: !currentlyPinned ? new Date().toISOString() : null,
        pinned_by: !currentlyPinned ? currentUserId : null,
      })
      .eq("id", messageId);

    if (error) {
      toast.error("Failed to update pin status");
      console.error(error);
      // Revert on error
      fetchMessages();
    } else {
      toast.success(currentlyPinned ? "Message unpinned" : "Message pinned");
    }
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

  const deleteAllMessages = async () => {
    if (!isSuperAdmin) return;
    
    setDeletingAll(true);
    try {
      // Hard delete all messages permanently
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

      if (error) {
        toast.error("Failed to delete messages");
        console.error(error);
      } else {
        toast.success("All messages have been permanently deleted");
        setMessages([]); // Clear local state immediately
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setDeletingAll(false);
      setShowDeleteAllDialog(false);
    }
  };

  if (!isApproved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top">
        <div className="flex h-12 sm:h-14 items-center gap-2 sm:gap-4 px-2 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-9 sm:w-9"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageCircle className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-semibold text-sm sm:text-base truncate">Community Chat</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isSuperAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteAllDialog(true)}
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline text-xs">Clear All</span>
              </Button>
            )}
            {isAdmin && (
              <span className="text-[10px] sm:text-xs bg-primary/10 text-primary px-2 py-1 rounded-full shrink-0">
                Mod
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Pinned Messages Section */}
      {messages.filter(m => m.is_pinned && !m.is_deleted).length > 0 && (
        <div className="sticky top-0 z-10 mx-2 sm:mx-4 mb-2 p-2 sm:p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
            <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">Pinned</span>
          </div>
          <div className="space-y-1.5 sm:space-y-2 max-h-32 overflow-y-auto">
            {messages.filter(m => m.is_pinned && !m.is_deleted).map((pinnedMsg) => (
              <button
                key={`pinned-${pinnedMsg.id}`}
                onClick={() => scrollToMessage(pinnedMsg.id)}
                className="w-full text-left p-2 bg-background/50 rounded-lg hover:bg-background/80 active:bg-background/90 transition-colors touch-manipulation"
              >
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{pinnedMsg.profiles?.full_name}</p>
                <p className="text-xs sm:text-sm line-clamp-3 whitespace-pre-wrap">{pinnedMsg.content}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-2 sm:px-4 py-3" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3 sm:mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">No messages yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Be the first to say hello!</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 pb-4">
            {(() => {
              // Find the first unread message index (messages from others after lastReadAt)
              const firstUnreadIndex = initialLastReadAt 
                ? messages.findIndex(m => 
                    !m.is_deleted && 
                    m.user_id !== currentUserId && 
                    new Date(m.created_at) > new Date(initialLastReadAt)
                  )
                : -1;
              
              // Count unread messages
              const unreadMessagesCount = firstUnreadIndex >= 0 
                ? messages.filter((m, idx) => 
                    idx >= firstUnreadIndex && 
                    !m.is_deleted && 
                    m.user_id !== currentUserId
                  ).length
                : 0;

              return messages.map((message, index) => {
                const isOwn = message.user_id === currentUserId;
                const canDelete = isOwn || isAdmin;
                const replyMessage = message.reply_to_id ? getReplyMessage(message.reply_to_id) : null;
                const showUnreadSeparator = index === firstUnreadIndex && unreadMessagesCount > 0;

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
                  <React.Fragment key={message.id}>
                    {showUnreadSeparator && (
                      <div ref={unreadSeparatorRef} className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-primary/50" />
                        <span className="text-xs font-medium text-primary px-2">
                          {unreadMessagesCount} new message{unreadMessagesCount > 1 ? 's' : ''}
                        </span>
                        <div className="flex-1 h-px bg-primary/50" />
                      </div>
                    )}
                    <div
                      id={`message-${message.id}`}
                      className={`flex items-start gap-1.5 sm:gap-2 transition-colors duration-300 rounded-lg ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                        <AvatarImage src={message.profiles?.avatar_url || undefined} alt={message.profiles?.full_name} />
                        <AvatarFallback className="text-[10px] sm:text-xs bg-primary/10 text-primary">
                          {getInitials(message.profiles?.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`group max-w-[80%] sm:max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                            {message.profiles?.full_name || "Unknown"}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground/60">
                            {format(new Date(message.created_at), "h:mm a")}
                          </span>
                        </div>
                        
                        {/* Reply Preview */}
                        {replyMessage && (
                          <button
                            onClick={() => scrollToMessage(replyMessage.id)}
                            className={`flex items-start gap-1.5 mb-1 px-2 py-1 rounded-lg text-left transition-colors hover:bg-muted/50 active:bg-muted/70 touch-manipulation ${
                              isOwn ? "bg-primary/20" : "bg-muted/80"
                            }`}
                          >
                            <Reply className="h-2.5 w-2.5 sm:h-3 sm:w-3 mt-0.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                                {replyMessage.profiles?.full_name || "Unknown"}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground/80 truncate max-w-[150px] sm:max-w-[200px]">
                                {replyMessage.is_deleted ? "Message deleted" : replyMessage.content}
                              </p>
                            </div>
                          </button>
                        )}
                        
                        <div className={`flex items-start gap-0.5 sm:gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                          <div
                            className={`rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 max-w-full ${
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {/* Media content */}
                            {message.media_url && message.media_type === 'image' && (
                              <a href={message.media_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={message.media_url} 
                                  alt="Shared image" 
                                  className="max-w-[180px] sm:max-w-[250px] max-h-[150px] sm:max-h-[200px] rounded-lg mb-1.5 sm:mb-2 object-cover cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity"
                                />
                              </a>
                            )}
                            {message.media_url && message.media_type === 'file' && (
                              <a 
                                href={message.media_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-lg mb-1.5 sm:mb-2 ${
                                  isOwn ? "bg-primary-foreground/10" : "bg-background/50"
                                }`}
                              >
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[180px]">
                                  {message.content || "File"}
                                </span>
                              </a>
                            )}
                            {/* Text content (only show if no file or has additional text) */}
                            {(!message.media_url || (message.media_url && message.content && message.content !== message.media_url.split('/').pop())) && (
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-0 sm:gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-6 sm:w-6 touch-manipulation"
                              onClick={() => handleReply(message)}
                            >
                              <Reply className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-6 sm:w-6 touch-manipulation"
                                onClick={() => togglePinMessage(message.id, !!message.is_pinned)}
                              >
                                {message.is_pinned ? (
                                  <PinOff className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-amber-500" />
                                ) : (
                                  <Pin className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                                )}
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-6 sm:w-6 touch-manipulation"
                                onClick={() => setDeleteMessageId(message.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {/* Message Reactions */}
                        {currentUserId && (
                          <MessageReactions
                            messageId={message.id}
                            currentUserId={currentUserId}
                            isOwnMessage={isOwn}
                          />
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        )}
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-t bg-muted/50 px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-primary">
                  Replying to {replyingTo.profiles?.full_name || "Unknown"}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-6 sm:w-6 shrink-0 touch-manipulation"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {typingUsers.length === 1
                ? `${typingUsers[0].full_name} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].full_name} and ${typingUsers[1].full_name} are typing...`
                : `${typingUsers[0].full_name} and ${typingUsers.length - 1} others are typing...`}
            </p>
          </div>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="border-t bg-muted/50 px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {selectedFile.type.startsWith('image/') ? (
                <img 
                  src={URL.createObjectURL(selectedFile)} 
                  alt="Preview" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded"
                />
              ) : (
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-muted rounded flex items-center justify-center">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-none">{selectedFile.name}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-6 sm:w-6 shrink-0 touch-manipulation"
              onClick={clearSelectedFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 border-t bg-background px-2 sm:px-4 py-2 sm:py-3 safe-area-bottom">
        <form onSubmit={(e) => { sendMessage(e); stopTyping(); }} className="flex gap-1.5 sm:gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-9 sm:w-9 shrink-0 touch-manipulation"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadingFile}
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
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
            placeholder={replyingTo ? "Reply..." : "Message..."}
            className="flex-1 h-10 sm:h-9 text-sm"
            disabled={sending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-10 w-10 sm:h-9 sm:w-9 shrink-0 touch-manipulation"
            disabled={(!newMessage.trim() && !selectedFile) || sending}
          >
            {uploadingFile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
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

      {/* Delete All Messages Dialog - Super Admin Only */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Messages</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL messages in the community chat? This action cannot be undone and will remove all conversation history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAllMessages}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommunityChat;
