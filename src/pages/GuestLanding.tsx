import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Calendar, DollarSign, Video, LogIn, BookOpen } from "lucide-react";
import LivestreamSection from "@/components/LivestreamSection";
import pastorPhoto from "@/assets/pastor-photo.jpg";

const GuestLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container py-4 md:py-8 px-3 md:px-4 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden shadow-lg">
            <img 
              src={pastorPhoto} 
              alt="Pastor Jean Elie Turlias - Church of God - Ministry of Prayer and the Word" 
              className="w-full h-full object-cover animate-fade-in"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
              <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">Welcome to COGMPW</h1>
              <p className="text-base md:text-xl mb-0.5 md:mb-1">Pastor Jean Elie Turlias</p>
              <p className="text-xs md:text-base opacity-90">Church of God - Ministry of Prayer and the Word</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/auth")} 
            size="lg"
            className="mt-4 w-full md:w-auto md:ml-auto md:block"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In / Sign Up
          </Button>
        </div>

        {/* Livestream Section */}
        <LivestreamSection isGuestView />

        {/* Quick Actions */}
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/giving")}>
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-full">
                  <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Give Online</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Support our ministry</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/guest/events")}>
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-full">
                  <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">View Events</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Upcoming events</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/guest/sermons")}>
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-full">
                  <Video className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Watch Sermons</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Latest messages</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/guest/devotionals")}>
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-full">
                  <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Daily Devotionals</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Spiritual insights</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Join Our Community</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Sign in or create an account to access exclusive features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              <div className="flex gap-3 md:gap-4">
                <Church className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm md:text-base">News & Announcements</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Stay updated with church news and important announcements
                  </p>
                </div>
              </div>
              <div className="flex gap-3 md:gap-4">
                <Video className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm md:text-base">Media Library</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Access sermons, devotionals, and teaching materials
                  </p>
                </div>
              </div>
              <div className="flex gap-3 md:gap-4">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm md:text-base">RSVP to Events</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Register for events and stay connected with church activities
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full mt-4 md:mt-6" size="lg">
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestLanding;
