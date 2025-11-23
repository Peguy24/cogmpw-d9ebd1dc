import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Calendar, DollarSign, Video, Users } from "lucide-react";
import churchBanner from "@/assets/church-banner-new.jpg";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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

  const heroSection = (
    <section className="container px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <img 
          src={churchBanner} 
          alt="Church of God - Ministry of Prayer and the Word" 
          className="w-full rounded-lg shadow-lg animate-fade-in"
        />
        <div className="flex flex-col md:flex-row gap-3 md:justify-center">
          <Button size="lg" onClick={() => navigate("/guest")} className="w-full md:w-auto">
            Continue as Guest
          </Button>
          <Button size="lg" onClick={() => navigate("/auth")} className="w-full md:w-auto">
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="w-full md:w-auto">
            Sign In
          </Button>
        </div>
      </div>
    </section>
  );

  const featuresSection = (
    <section className="container px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Everything You Need</h2>
        <p className="text-muted-foreground text-sm md:text-base">Stay connected with your church community</p>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <Card key={index} className="text-center hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <CardTitle className="text-lg md:text-xl">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );

  const ctaSection = (
    <section className="container px-4 py-12 pb-16">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-10 text-center px-4">
          <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Join Our Community</h2>
          <p className="text-base md:text-lg mb-6 opacity-90">
            Create your account today and be part of our growing church family
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="w-full md:w-auto">
            Create Account
          </Button>
        </CardContent>
      </Card>
    </section>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {isMobile ? (
        <div className="relative">
          <Carousel 
            setApi={setApi}
            opts={{ loop: false }}
            className="w-full"
          >
            <CarouselContent>
              <CarouselItem>{heroSection}</CarouselItem>
              <CarouselItem>{featuresSection}</CarouselItem>
              <CarouselItem>{ctaSection}</CarouselItem>
            </CarouselContent>
          </Carousel>
          
          <div className="flex justify-center gap-2 py-4">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all ${
                  current === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
                aria-label={`Go to section ${index + 1}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {heroSection}
          {featuresSection}
          {ctaSection}
        </>
      )}
    </div>
  );
};

export default Index;
