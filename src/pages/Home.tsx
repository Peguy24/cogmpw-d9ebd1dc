import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Calendar, Newspaper, Settings, UserCheck, Shield, Video, DollarSign, HandHeart, Target, Menu, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import NewsFeed from "@/components/NewsFeed";
import EventsCalendar from "@/components/EventsCalendar";
import ProfileSettings from "@/components/ProfileSettings";
import SermonsList from "@/components/SermonsList";
import DevotionalsList from "@/components/DevotionalsList";
import LivestreamSection from "@/components/LivestreamSection";
import PrayerRequestForm from "@/components/PrayerRequestForm";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import churchLogo from "@/assets/church-logo.webp";
import pastorPhoto from "@/assets/pastor-photo.jpg";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnlyAdmin, setIsOnlyAdmin] = useState(false); // true admin, not just super_leader
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState("news");
  const isMobile = useIsMobile();
  const { unreadCount } = useUnreadMessages();

  useEffect(() => {
    const checkAuthAndApproval = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Check if user is approved
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", session.user.id)
        .single();

      if (profile && !profile.is_approved) {
        navigate("/pending-approval");
        setLoading(false);
        return;
      }

      setUser(session.user);
      
      // Check if user is admin or super_leader and load pending count
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const userIsAdmin = roles?.some(r => r.role === "admin") || false;
      const userIsSuperLeader = roles?.some(r => (r.role as string) === "super_leader") || false;
      
      if (userIsAdmin || userIsSuperLeader) {
        setIsAdmin(true);
        setIsOnlyAdmin(userIsAdmin);
        if (userIsAdmin) {
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("is_approved", false);
          setPendingCount(count || 0);
        }
      }

      setLoading(false);
    };

    checkAuthAndApproval();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Re-check approval status
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("is_approved")
            .eq("id", session.user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile && !profile.is_approved) {
                navigate("/pending-approval");
              } else {
                setUser(session.user);
              }
            });
        }, 0);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-8">

        <div className="container flex h-14 items-center justify-between px-4">
          <img src={churchLogo} alt="COGMPW Church Logo" className="h-10 w-10 object-contain" />
          
          <div className="flex items-center gap-1">
            <Link to="/community-chat">
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/giving">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <HandHeart className="h-5 w-5" />
              </Button>
            </Link>
            
            {isAdmin && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Menu className="h-5 w-5" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 pt-14">

                  <SheetHeader>
                    <SheetTitle>Admin Menu</SheetTitle>
                    <SheetDescription>
                      Manage church operations
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    <Link to="/admin/approvals" className="block">
                      <Button variant="ghost" className="w-full justify-start relative">
                        <UserCheck className="h-5 w-5 mr-3" />
                        Approvals
                        {pendingCount > 0 && (
                          <span className="ml-auto h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                            {pendingCount}
                          </span>
                        )}
                      </Button>
                    </Link>
                    {isOnlyAdmin && (
                      <Link to="/admin/users" className="block">
                        <Button variant="ghost" className="w-full justify-start">
                          <Shield className="h-5 w-5 mr-3" />
                          User Management
                        </Button>
                      </Link>
                    )}
                    <Link to="/admin/giving" className="block">
                      <Button variant="ghost" className="w-full justify-start">
                        <DollarSign className="h-5 w-5 mr-3" />
                        Giving Reports
                      </Button>
                    </Link>
                    <Link to="/admin/campaigns" className="block">
                      <Button variant="ghost" className="w-full justify-start">
                        <Target className="h-5 w-5 mr-3" />
                        Campaigns
                      </Button>
                    </Link>
                    <Link to="/admin/prayer-requests" className="block">
                      <Button variant="ghost" className="w-full justify-start">
                        <Heart className="h-5 w-5 mr-3" />
                        Prayer Requests
                      </Button>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <NotificationBell />
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 sm:max-w-md flex flex-col">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Manage your profile and privacy settings
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="mt-6">
                    {user && <ProfileSettings user={user} />}
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Pastor Banner */}
      <section className="relative w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container px-3 md:px-4 py-4 md:py-6">
          <div className="mx-auto max-w-4xl">
            <img 
              src={pastorPhoto} 
              alt="Church Pastor" 
              className="w-full h-40 md:h-64 object-cover rounded-lg shadow-lg animate-fade-in"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className={`container py-3 md:py-4 px-3 md:px-4 ${isMobile ? 'pb-20' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-4 mb-4 h-auto">
              <TabsTrigger value="news" className="flex flex-col items-center gap-1 py-2">
                <Newspaper className="h-4 w-4" />
                <span className="text-xs">News</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex flex-col items-center gap-1 py-2">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Events</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="flex flex-col items-center gap-1 py-2">
                <Video className="h-4 w-4" />
                <span className="text-xs">Media</span>
              </TabsTrigger>
              <TabsTrigger value="prayer" className="flex flex-col items-center gap-1 py-2">
                <Heart className="h-4 w-4" />
                <span className="text-xs">Prayer</span>
              </TabsTrigger>
            </TabsList>
          )}
          
          <TabsContent value="news">
            <NewsFeed />
          </TabsContent>
          
          <TabsContent value="events">
            <EventsCalendar />
          </TabsContent>
          
          <TabsContent value="media">
            <Tabs defaultValue="sermons" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
                <TabsTrigger value="sermons" className="text-xs py-2">Sermons</TabsTrigger>
                <TabsTrigger value="devotionals" className="text-xs py-2">Devotionals</TabsTrigger>
                <TabsTrigger value="livestream" className="text-xs py-2">Live</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sermons">
                <SermonsList />
              </TabsContent>
              
              <TabsContent value="devotionals">
                <DevotionalsList />
              </TabsContent>
              
              <TabsContent value="livestream">
                <LivestreamSection />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="prayer">
            <div className="max-w-2xl mx-auto">
              <div className="mb-4 md:mb-6">
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2">Prayer Requests</h2>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Share your prayer needs with our church leadership. Your request will be kept confidential.
                    </p>
                  </div>
                  <Link to="/my-prayer-requests" className="w-full md:w-auto">
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                      <Heart className="h-4 w-4 mr-2" />
                      View My Prayer Requests
                    </Button>
                  </Link>
                </div>
              </div>
              <PrayerRequestForm />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Navigation Bar - Mobile Only */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
          <div className="grid grid-cols-6 h-16">
            <button
              onClick={() => setActiveTab("news")}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeTab === "news" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Newspaper className="h-5 w-5" />
              <span className="text-[11px] font-medium">News</span>
            </button>

            <button
              onClick={() => setActiveTab("events")}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeTab === "events" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-[11px] font-medium">Events</span>
            </button>

            <button
              onClick={() => setActiveTab("media")}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeTab === "media" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Video className="h-5 w-5" />
              <span className="text-[11px] font-medium">Media</span>
            </button>

            <button
              onClick={() => setActiveTab("prayer")}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeTab === "prayer" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Heart className="h-5 w-5" />
              <span className="text-[11px] font-medium">Prayer</span>
            </button>

            <Link
              to="/community-chat"
              className="relative flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              aria-label="Open community chat"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-4 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <span className="text-[11px] font-medium">Chat</span>
            </Link>

            <Link
              to="/giving"
              className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              aria-label="Open giving"
            >
              <HandHeart className="h-5 w-5" />
              <span className="text-[11px] font-medium">Giving</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
};

export default Home;
