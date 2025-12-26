import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Clock, Church } from "lucide-react";
import { toast } from "sonner";

interface ChurchInfo {
  id: string;
  key: string;
  value: string;
  label: string | null;
  category: string;
  sort_order: number;
}

const AdminChurchInfo = () => {
  const navigate = useNavigate();
  const [serviceTimes, setServiceTimes] = useState<ChurchInfo[]>([]);
  const [contactInfo, setContactInfo] = useState<ChurchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/home");
      return;
    }

    setIsAdmin(true);
    await loadChurchInfo();
    setLoading(false);
  };

  const loadChurchInfo = async () => {
    const { data, error } = await supabase
      .from("church_info")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Failed to load church info");
      return;
    }

    const services = (data || []).filter(item => item.category === "service_times");
    const contact = (data || []).filter(item => item.category === "contact");
    
    setServiceTimes(services);
    setContactInfo(contact);
  };

  const updateValue = (id: string, newValue: string, category: "service_times" | "contact") => {
    if (category === "service_times") {
      setServiceTimes(prev => prev.map(item => 
        item.id === id ? { ...item, value: newValue } : item
      ));
    } else {
      setContactInfo(prev => prev.map(item => 
        item.id === id ? { ...item, value: newValue } : item
      ));
    }
  };

  const updateLabel = (id: string, newLabel: string, category: "service_times" | "contact") => {
    if (category === "service_times") {
      setServiceTimes(prev => prev.map(item => 
        item.id === id ? { ...item, label: newLabel } : item
      ));
    } else {
      setContactInfo(prev => prev.map(item => 
        item.id === id ? { ...item, label: newLabel } : item
      ));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    const allItems = [...serviceTimes, ...contactInfo];
    
    for (const item of allItems) {
      const { error } = await supabase
        .from("church_info")
        .update({ value: item.value, label: item.label })
        .eq("id", item.id);

      if (error) {
        toast.error(`Failed to update ${item.label}`);
        setSaving(false);
        return;
      }
    }

    toast.success("Church information updated successfully");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-8">
        <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-bold">Church Information</h1>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </header>

      <main className="container py-4 md:py-6 px-3 md:px-4 space-y-6">
        {/* Service Times */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Service Times
            </CardTitle>
            <CardDescription>
              Update your church service schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceTimes.map((item) => (
              <div key={item.id} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    value={item.label || ""}
                    onChange={(e) => updateLabel(item.id, e.target.value, "service_times")}
                    placeholder="e.g., Sunday Worship"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    value={item.value}
                    onChange={(e) => updateValue(item.id, e.target.value, "service_times")}
                    placeholder="e.g., 10:00 AM"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Church className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Update your church contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contactInfo.map((item) => (
              <div key={item.id} className="space-y-2">
                <Label>{item.label}</Label>
                <Input
                  value={item.value}
                  onChange={(e) => updateValue(item.id, e.target.value, "contact")}
                  placeholder={`Enter ${item.label?.toLowerCase()}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminChurchInfo;
