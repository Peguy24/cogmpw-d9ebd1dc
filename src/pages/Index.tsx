import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Calendar, DollarSign, Video, Users, ArrowUp } from "lucide-react";
import churchBanner from "@/assets/church-banner-new.jpg";
import churchLogo from "@/assets/church-logo-official.webp";
import { useEffect, useRef, useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observerRef.current?.observe(section));

    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const heroSection = (
    <section 
      id="hero" 
      className={`container px-4 py-8 scroll-mt-4 transition-all duration-700 ${
        visibleSections.has('hero') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
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
    <section 
      id="features" 
      className={`container px-4 py-12 scroll-mt-4 transition-all duration-700 ${
        visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      <div className="text-center mb-8">
        <img 
          src={churchLogo} 
          alt="Church of God - Ministry of Prayer and the Word" 
          className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4"
        />
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
    <section 
      id="join" 
      className={`container px-4 py-12 pb-16 scroll-mt-4 transition-all duration-700 ${
        visibleSections.has('join') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
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
      {heroSection}
      {featuresSection}
      {ctaSection}
      
      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg transition-opacity hover:opacity-90"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default Index;
