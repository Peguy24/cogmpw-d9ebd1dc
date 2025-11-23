import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Calendar, DollarSign, Video, Users } from "lucide-react";
import churchBanner from "@/assets/church-banner.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Church className="h-8 w-8" />,
      title: "News & Announcements",
      description: "Stay updated with the latest church news and important announcements",
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Events & Calendar",
      description: "View upcoming events and RSVP to church activities",
    },
    {
      icon: <DollarSign className="h-8 w-8" />,
      title: "Online Giving",
      description: "Support the church with tithes, offerings, and special donations",
    },
    {
      icon: <Video className="h-8 w-8" />,
      title: "Media Library",
      description: "Access sermons, devotionals, and teaching materials",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Hero Section */}
      <section className="container py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <img 
            src={churchBanner} 
            alt="Church of God - Ministry of Prayer and the Word" 
            className="w-full rounded-lg shadow-lg animate-fade-in"
          />
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/guest")}>
              Continue as Guest
            </Button>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground">Stay connected with your church community</p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
            <p className="text-lg mb-6 opacity-90">
              Create your account today and be part of our growing church family
            </p>
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>
              Create Account
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
