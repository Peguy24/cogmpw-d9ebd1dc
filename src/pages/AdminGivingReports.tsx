import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, DollarSign, TrendingUp, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";

interface DonationStats {
  totalAmount: number;
  donationCount: number;
  averageDonation: number;
}

interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

interface TopDonor {
  user_id: string;
  full_name: string;
  total: number;
  donation_count: number;
}

const AdminGivingReports = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("month");
  
  const [todayStats, setTodayStats] = useState<DonationStats>({ totalAmount: 0, donationCount: 0, averageDonation: 0 });
  const [weekStats, setWeekStats] = useState<DonationStats>({ totalAmount: 0, donationCount: 0, averageDonation: 0 });
  const [monthStats, setMonthStats] = useState<DonationStats>({ totalAmount: 0, donationCount: 0, averageDonation: 0 });
  
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        toast.error("Access denied: Admin only");
        navigate("/home");
        return;
      }

      setIsAdmin(true);
      await Promise.all([
        loadDailyStats(),
        loadWeeklyStats(),
        loadMonthlyStats(),
        loadCategoryBreakdown(),
        loadTopDonors()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load giving reports");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (donations: any[]): DonationStats => {
    const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const donationCount = donations.length;
    const averageDonation = donationCount > 0 ? totalAmount / donationCount : 0;
    
    return { totalAmount, donationCount, averageDonation };
  };

  const loadDailyStats = async () => {
    const now = new Date();
    const { data } = await supabase
      .from("donations")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", startOfDay(now).toISOString())
      .lte("created_at", endOfDay(now).toISOString());

    setTodayStats(calculateStats(data || []));
  };

  const loadWeeklyStats = async () => {
    const now = new Date();
    const { data } = await supabase
      .from("donations")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", startOfWeek(now).toISOString())
      .lte("created_at", endOfWeek(now).toISOString());

    setWeekStats(calculateStats(data || []));
  };

  const loadMonthlyStats = async () => {
    const now = new Date();
    const { data } = await supabase
      .from("donations")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", startOfMonth(now).toISOString())
      .lte("created_at", endOfMonth(now).toISOString());

    setMonthStats(calculateStats(data || []));
  };

  const loadCategoryBreakdown = async () => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now);
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
    }

    const { data } = await supabase
      .from("donations")
      .select("category, amount")
      .eq("status", "completed")
      .gte("created_at", startDate.toISOString());

    if (data) {
      const breakdown = data.reduce((acc: Record<string, { total: number; count: number }>, donation) => {
        const category = donation.category;
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 };
        }
        acc[category].total += Number(donation.amount);
        acc[category].count += 1;
        return acc;
      }, {});

      const categoryArray = Object.entries(breakdown).map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
      })).sort((a, b) => b.total - a.total);

      setCategoryBreakdown(categoryArray);
    }
  };

  const loadTopDonors = async () => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now);
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
    }

    const { data: donations } = await supabase
      .from("donations")
      .select("user_id, amount")
      .eq("status", "completed")
      .gte("created_at", startDate.toISOString());

    if (donations) {
      const donorMap = donations.reduce((acc: Record<string, { total: number; count: number }>, donation) => {
        const userId = donation.user_id;
        if (!acc[userId]) {
          acc[userId] = { total: 0, count: 0 };
        }
        acc[userId].total += Number(donation.amount);
        acc[userId].count += 1;
        return acc;
      }, {});

      const userIds = Object.keys(donorMap);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const topDonorsArray = userIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        return {
          user_id: userId,
          full_name: profile?.full_name || "Anonymous",
          total: donorMap[userId].total,
          donation_count: donorMap[userId].count,
        };
      }).sort((a, b) => b.total - a.total).slice(0, 10);

      setTopDonors(topDonorsArray);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadCategoryBreakdown();
      loadTopDonors();
    }
  }, [timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/home">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Giving Reports</h1>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Time Period Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayStats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {todayStats.donationCount} donations • Avg: {formatCurrency(todayStats.averageDonation)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(weekStats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {weekStats.donationCount} donations • Avg: {formatCurrency(weekStats.averageDonation)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthStats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {monthStats.donationCount} donations • Avg: {formatCurrency(monthStats.averageDonation)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value={timeRange} className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Donation Categories</CardTitle>
                  <CardDescription>Breakdown by category for selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No donations for this period
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {categoryBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{item.category}</p>
                            <p className="text-sm text-muted-foreground">{item.count} donations</p>
                          </div>
                          <div className="text-sm font-bold">{formatCurrency(item.total)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Donors */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Donors</CardTitle>
                  <CardDescription>Most generous givers for selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {topDonors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No donations for this period
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {topDonors.map((donor, index) => (
                        <div key={donor.user_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                              {index + 1}
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">{donor.full_name}</p>
                              <p className="text-sm text-muted-foreground">{donor.donation_count} donations</p>
                            </div>
                          </div>
                          <div className="text-sm font-bold">{formatCurrency(donor.total)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminGivingReports;
