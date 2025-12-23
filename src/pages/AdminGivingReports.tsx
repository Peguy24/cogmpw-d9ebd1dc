import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, DollarSign, TrendingUp, Users, Calendar, Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { jsPDF } from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface TrendData {
  date: string;
  amount: number;
}

interface TopDonor {
  user_id: string;
  full_name: string;
  total: number;
  donation_count: number;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(30 80% 55%)",
];

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
  const [trendData, setTrendData] = useState<TrendData[]>([]);

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
        loadTopDonors(),
        loadTrendData()
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
      // Separate donations by user_id (null = anonymous)
      const donorMap = donations.reduce((acc: Record<string, { total: number; count: number }>, donation) => {
        const userId = donation.user_id || "anonymous";
        if (!acc[userId]) {
          acc[userId] = { total: 0, count: 0 };
        }
        acc[userId].total += Number(donation.amount);
        acc[userId].count += 1;
        return acc;
      }, {});

      // Get only real user IDs (not "anonymous")
      const userIds = Object.keys(donorMap).filter(id => id !== "anonymous");
      
      let profiles: { id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profiles = profilesData || [];
      }

      const topDonorsArray = Object.keys(donorMap).map(userId => {
        if (userId === "anonymous") {
          return {
            user_id: "anonymous",
            full_name: "Anonymous Donors",
            total: donorMap[userId].total,
            donation_count: donorMap[userId].count,
          };
        }
        const profile = profiles.find(p => p.id === userId);
        return {
          user_id: userId,
          full_name: profile?.full_name || "Unknown User",
          total: donorMap[userId].total,
          donation_count: donorMap[userId].count,
        };
      }).sort((a, b) => b.total - a.total).slice(0, 10);

      setTopDonors(topDonorsArray);
    }
  };

  const loadTrendData = async () => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 29);
    
    const { data } = await supabase
      .from("donations")
      .select("amount, created_at")
      .eq("status", "completed")
      .gte("created_at", startOfDay(thirtyDaysAgo).toISOString())
      .order("created_at", { ascending: true });

    if (data) {
      // Group by date
      const dailyTotals: Record<string, number> = {};
      
      // Initialize all 30 days with 0
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(now, 29 - i), "MMM dd");
        dailyTotals[date] = 0;
      }
      
      // Sum donations by date
      data.forEach(donation => {
        const date = format(new Date(donation.created_at), "MMM dd");
        dailyTotals[date] = (dailyTotals[date] || 0) + Number(donation.amount);
      });

      const trendArray = Object.entries(dailyTotals).map(([date, amount]) => ({
        date,
        amount,
      }));

      setTrendData(trendArray);
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

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "today": return "Today";
      case "week": return "This Week";
      case "month": return "This Month";
    }
  };

  const exportToCSV = () => {
    const reportDate = format(new Date(), "yyyy-MM-dd");
    let csvContent = "Giving Report - " + getTimeRangeLabel() + "\n";
    csvContent += "Generated: " + format(new Date(), "PPP p") + "\n\n";

    // Summary stats
    csvContent += "SUMMARY STATISTICS\n";
    csvContent += "Period,Total Amount,Donations,Average\n";
    csvContent += `Today,${todayStats.totalAmount},${todayStats.donationCount},${todayStats.averageDonation}\n`;
    csvContent += `This Week,${weekStats.totalAmount},${weekStats.donationCount},${weekStats.averageDonation}\n`;
    csvContent += `This Month,${monthStats.totalAmount},${monthStats.donationCount},${monthStats.averageDonation}\n\n`;

    // Category breakdown
    csvContent += "CATEGORY BREAKDOWN (" + getTimeRangeLabel() + ")\n";
    csvContent += "Category,Total Amount,Donation Count\n";
    categoryBreakdown.forEach(cat => {
      csvContent += `${cat.category},${cat.total},${cat.count}\n`;
    });
    csvContent += "\n";

    // Top donors
    csvContent += "TOP DONORS (" + getTimeRangeLabel() + ")\n";
    csvContent += "Rank,Name,Total Amount,Donation Count\n";
    topDonors.forEach((donor, index) => {
      csvContent += `${index + 1},${donor.full_name},${donor.total},${donor.donation_count}\n`;
    });
    csvContent += "\n";

    // Trend data
    csvContent += "DAILY TRENDS (Last 30 Days)\n";
    csvContent += "Date,Amount\n";
    trendData.forEach(day => {
      csvContent += `${day.date},${day.amount}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `giving-report-${reportDate}.csv`;
    link.click();
    toast.success("CSV report downloaded");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const reportDate = format(new Date(), "yyyy-MM-dd");
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.text("Giving Report", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(12);
    doc.text(`Generated: ${format(new Date(), "PPP p")}`, 105, y, { align: "center" });
    y += 15;

    // Summary stats
    doc.setFontSize(14);
    doc.text("Summary Statistics", 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Today: ${formatCurrency(todayStats.totalAmount)} (${todayStats.donationCount} donations)`, 25, y);
    y += 7;
    doc.text(`This Week: ${formatCurrency(weekStats.totalAmount)} (${weekStats.donationCount} donations)`, 25, y);
    y += 7;
    doc.text(`This Month: ${formatCurrency(monthStats.totalAmount)} (${monthStats.donationCount} donations)`, 25, y);
    y += 15;

    // Category breakdown
    doc.setFontSize(14);
    doc.text(`Category Breakdown (${getTimeRangeLabel()})`, 20, y);
    y += 10;
    doc.setFontSize(10);
    if (categoryBreakdown.length === 0) {
      doc.text("No donations for this period", 25, y);
      y += 7;
    } else {
      categoryBreakdown.forEach(cat => {
        doc.text(`${cat.category}: ${formatCurrency(cat.total)} (${cat.count} donations)`, 25, y);
        y += 7;
      });
    }
    y += 8;

    // Top donors
    doc.setFontSize(14);
    doc.text(`Top Donors (${getTimeRangeLabel()})`, 20, y);
    y += 10;
    doc.setFontSize(10);
    if (topDonors.length === 0) {
      doc.text("No donations for this period", 25, y);
    } else {
      topDonors.slice(0, 10).forEach((donor, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${index + 1}. ${donor.full_name}: ${formatCurrency(donor.total)} (${donor.donation_count} donations)`, 25, y);
        y += 7;
      });
    }

    doc.save(`giving-report-${reportDate}.pdf`);
    toast.success("PDF report downloaded");
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
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-8">

        <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <Link to="/home">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <h1 className="text-lg md:text-xl font-bold truncate">Giving Reports</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF} className="gap-2">
                <FileText className="h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container py-4 md:py-6 px-3 md:px-4 space-y-4 md:space-y-6">
        {/* Time Period Stats */}
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(todayStats.totalAmount)}</div>
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
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(weekStats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {weekStats.donationCount} donations • Avg: {formatCurrency(weekStats.averageDonation)}
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(monthStats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {monthStats.donationCount} donations • Avg: {formatCurrency(monthStats.averageDonation)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Donation Trends Chart */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Donation Trends</CardTitle>
            <CardDescription className="text-xs md:text-sm">Daily giving over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
                No donation data available
              </p>
            ) : (
              <ChartContainer
                config={{
                  amount: {
                    label: "Amount",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[200px] md:h-[300px] w-full"
              >
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${value}`}
                    width={50}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    fill="url(#fillAmount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="today" className="text-xs md:text-sm py-2">Today</TabsTrigger>
            <TabsTrigger value="week" className="text-xs md:text-sm py-2">This Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs md:text-sm py-2">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value={timeRange} className="space-y-4 mt-4 md:mt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Category Breakdown with Pie Chart */}
              <Card>
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-base md:text-lg">Donation Categories</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Breakdown by category for selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryBreakdown.length === 0 ? (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-4">
                      No donations for this period
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Pie Chart */}
                      <ChartContainer
                        config={categoryBreakdown.reduce((acc, cat, index) => {
                          acc[cat.category] = {
                            label: cat.category,
                            color: CHART_COLORS[index % CHART_COLORS.length],
                          };
                          return acc;
                        }, {} as Record<string, { label: string; color: string }>)}
                        className="h-[180px] md:h-[220px] w-full"
                      >
                        <PieChart>
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => formatCurrency(Number(value))}
                              />
                            }
                          />
                          <Pie
                            data={categoryBreakdown}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                          >
                            {categoryBreakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      
                      {/* Legend */}
                      <div className="space-y-2">
                        {categoryBreakdown.map((item, index) => (
                          <div key={item.category} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div 
                                className="h-3 w-3 rounded-full shrink-0" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <p className="text-xs md:text-sm font-medium leading-none truncate">{item.category}</p>
                            </div>
                            <div className="text-xs md:text-sm font-bold shrink-0">{formatCurrency(item.total)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Donors */}
              <Card>
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-base md:text-lg">Top Donors</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Most generous givers for selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {topDonors.length === 0 ? (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-4">
                      No donations for this period
                    </p>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {topDonors.map((donor, index) => (
                        <div key={donor.user_id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-bold shrink-0">
                              {index + 1}
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <p className="text-xs md:text-sm font-medium leading-none truncate">{donor.full_name}</p>
                              <p className="text-xs text-muted-foreground">{donor.donation_count} donations</p>
                            </div>
                          </div>
                          <div className="text-xs md:text-sm font-bold shrink-0">{formatCurrency(donor.total)}</div>
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
