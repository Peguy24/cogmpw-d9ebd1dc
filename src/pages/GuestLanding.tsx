import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Calendar, DollarSign, Video, LogIn, BookOpen } from "lucide-react";
import LivestreamSection from "@/components/LivestreamSection";

const GuestLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Welcome to COGMPW Church</h1>
            <p className="text-muted-foreground">Connect with our community</p>
          </div>
          <Button onClick={() => navigate("/auth")} size="lg">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In / Sign Up
          </Button>
        </div>

        {/* Livestream Section */}
        <LivestreamSection />

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/giving")}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>Give Online</CardTitle>
                  <CardDescription>Support our ministry</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/guest/events")}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>View Events</CardTitle>
                  <CardDescription>Upcoming events</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/guest/sermons")}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>Watch Sermons</CardTitle>
                  <CardDescription>Latest messages</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/guest/devotionals")}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>Daily Devotionals</CardTitle>
                  <CardDescription>Spiritual insights</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Join Our Community</CardTitle>
            <CardDescription>
              Sign in or create an account to access exclusive features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Church className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold">News & Announcements</h3>
                  <p className="text-sm text-muted-foreground">
                    Stay updated with church news and important announcements
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Video className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold">Media Library</h3>
                  <p className="text-sm text-muted-foreground">
                    Access sermons, devotionals, and teaching materials
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Calendar className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold">RSVP to Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Register for events and stay connected with church activities
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full mt-6" size="lg">
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestLanding;
