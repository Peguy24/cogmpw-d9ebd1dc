import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Bell, Calendar, Newspaper, Settings, UserCheck, Shield, Video, DollarSign, HandHeart, Target } from "lucide-react";
import { toast } from "sonner";
import NewsFeed from "@/components/NewsFeed";
import EventsCalendar from "@/components/EventsCalendar";
import ProfileSettings from "@/components/ProfileSettings";
import SermonsList from "@/components/SermonsList";
import DevotionalsList from "@/components/DevotionalsList";
import LivestreamSection from "@/components/LivestreamSection";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
      
      // Check if user is admin and load pending count
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (roles) {
        setIsAdmin(true);
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_approved", false);
        setPendingCount(count || 0);
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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">COGMPW</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/giving">
              <Button variant="ghost" size="icon">
                <HandHeart className="h-5 w-5" />
              </Button>
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin/approvals">
                  <Button variant="ghost" size="icon" className="relative">
                    <UserCheck className="h-5 w-5" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link to="/admin/users">
                  <Button variant="ghost" size="icon">
                    <Shield className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/admin/giving">
                  <Button variant="ghost" size="icon">
                    <DollarSign className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/admin/campaigns">
                  <Button variant="ghost" size="icon">
                    <Target className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Manage your profile and privacy settings
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  {user && <ProfileSettings user={user} />}
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs defaultValue="news" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Media
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="news">
            <NewsFeed />
          </TabsContent>
          
          <TabsContent value="events">
            <EventsCalendar />
          </TabsContent>
          
          <TabsContent value="media">
            <Tabs defaultValue="sermons" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="sermons">Sermons</TabsTrigger>
                <TabsTrigger value="devotionals">Devotionals</TabsTrigger>
                <TabsTrigger value="livestream">Livestream</TabsTrigger>
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
        </Tabs>
      </main>
    </div>
  );
};

export default Home;
