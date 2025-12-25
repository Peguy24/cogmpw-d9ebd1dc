import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Users, Target, Download, FileText, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function AdminCampaignAnalytics() {
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(false);
  const [recentDonation, setRecentDonation] = useState<any>(null);

  // Fetch all donations for analytics
  const { data: donations, isLoading: donationsLoading, refetch: refetchDonations } = useQuery({
    queryKey: ["analytics-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch campaigns for analytics
  const { data: campaigns, isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ["analytics-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("giving_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Set up realtime subscriptions for live updates
  useEffect(() => {
    setIsLive(true);
    
    // Subscribe to donations
    const donationsChannel = supabase
      .channel('analytics-donations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: 'status=eq.completed'
        },
        async (payload) => {
          console.log('New donation received:', payload);
          
          // Fetch donor name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.user_id)
            .single();
          
          const donationAmount = Number(payload.new.amount);
          const donorName = profile?.full_name || 'Anonymous';
          
          setRecentDonation({
            amount: donationAmount,
            donor: donorName,
            timestamp: new Date()
          });
          
          toast.success(
            `New donation: $${donationAmount.toFixed(2)} from ${donorName}`,
            {
              duration: 5000,
              icon: '🎉'
            }
          );
          
          // Refetch data
          refetchDonations();
          refetchCampaigns();
          
          // Clear recent donation after animation
          setTimeout(() => setRecentDonation(null), 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'giving_campaigns'
        },
        (payload) => {
          console.log('Campaign updated:', payload);
          
          const oldAmount = Number(payload.old.current_amount);
          const newAmount = Number(payload.new.current_amount);
          
          if (newAmount > oldAmount) {
            const increase = newAmount - oldAmount;
            toast.info(
              `Campaign "${payload.new.title}" increased by $${increase.toFixed(2)}`,
              {
                duration: 4000,
                icon: '📈'
              }
            );
          }
          
          refetchCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donationsChannel);
      setIsLive(false);
    };
  }, [refetchDonations, refetchCampaigns]);

  // Calculate statistics
  const totalDonations = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const averageDonation = donations?.length ? totalDonations / donations.length : 0;
  const uniqueDonors = new Set(donations?.map(d => d.user_id)).size;
  const activeCampaigns = campaigns?.filter(c => c.is_active).length || 0;

  // Prepare donation trend data (last 6 months)
  const donationTrendData = () => {
    if (!donations || donations.length === 0) return [];

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, "MMM yyyy"),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    });

    return last6Months.map(({ month, start, end }) => {
      const monthDonations = donations.filter(d => {
        const donationDate = new Date(d.created_at);
        return donationDate >= start && donationDate <= end;
      });

      return {
        month,
        amount: monthDonations.reduce((sum, d) => sum + Number(d.amount), 0),
        count: monthDonations.length,
      };
    });
  };

  // Prepare campaign performance data
  const campaignPerformanceData = () => {
    if (!campaigns) return [];

    return campaigns
      .filter(c => c.current_amount > 0)
      .slice(0, 10)
      .map(c => ({
        name: c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title,
        raised: Number(c.current_amount),
        goal: Number(c.target_amount),
        percentage: (Number(c.current_amount) / Number(c.target_amount)) * 100,
      }));
  };

  // Prepare donation category distribution
  const categoryDistributionData = () => {
    if (!donations) return [];

    const categoryTotals = donations.reduce((acc, d) => {
      const category = d.campaign_id ? 'Campaign' : d.category || 'General';
      acc[category] = (acc[category] || 0) + Number(d.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Prepare donor frequency data
  const donorFrequencyData = () => {
    if (!donations) return [];

    const donorCounts = donations.reduce((acc, d) => {
      acc[d.user_id] = (acc[d.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const frequency = {
      'One-time': 0,
      '2-5 times': 0,
      '6-10 times': 0,
      '11+ times': 0,
    };

    Object.values(donorCounts).forEach(count => {
      if (count === 1) frequency['One-time']++;
      else if (count <= 5) frequency['2-5 times']++;
      else if (count <= 10) frequency['6-10 times']++;
      else frequency['11+ times']++;
    });

    return Object.entries(frequency).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!donations || !campaigns) {
      toast.error("No data to export");
      return;
    }

    try {
      // Prepare CSV data
      const csvRows = [];
      
      // Header
      csvRows.push([
        "Campaign Analytics Report",
        `Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`
      ].join(","));
      csvRows.push([]);
      
      // Summary Stats
      csvRows.push(["Summary Statistics"]);
      csvRows.push(["Total Raised", `$${totalDonations.toFixed(2)}`]);
      csvRows.push(["Average Donation", `$${averageDonation.toFixed(2)}`]);
      csvRows.push(["Unique Donors", uniqueDonors]);
      csvRows.push(["Active Campaigns", activeCampaigns]);
      csvRows.push([]);
      
      // Donation Trends
      csvRows.push(["Monthly Donation Trends"]);
      csvRows.push(["Month", "Amount", "Count"]);
      donationTrendData().forEach(row => {
        csvRows.push([row.month, row.amount.toFixed(2), row.count]);
      });
      csvRows.push([]);
      
      // Campaign Performance
      csvRows.push(["Campaign Performance"]);
      csvRows.push(["Campaign", "Raised", "Goal", "Percentage"]);
      campaignPerformanceData().forEach(row => {
        csvRows.push([
          row.name,
          row.raised.toFixed(2),
          row.goal.toFixed(2),
          row.percentage.toFixed(1) + "%"
        ]);
      });
      csvRows.push([]);
      
      // Category Distribution
      csvRows.push(["Donation Categories"]);
      csvRows.push(["Category", "Amount"]);
      categoryDistributionData().forEach(row => {
        csvRows.push([row.name, row.value.toFixed(2)]);
      });
      csvRows.push([]);
      
      // Donor Frequency
      csvRows.push(["Donor Engagement"]);
      csvRows.push(["Frequency", "Count"]);
      donorFrequencyData().forEach(row => {
        csvRows.push([row.name, row.value]);
      });
      
      // Create CSV content
      const csvContent = csvRows.map(row => row.join(",")).join("\n");
      
      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `campaign-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV report exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV");
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!donations || !campaigns) {
      toast.error("No data to export");
      return;
    }

    try {
      toast.info("Generating PDF report...");
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Campaign Analytics Report", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${format(new Date(), "MMMM dd, yyyy HH:mm")}`, pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 15;
      
      // Summary Statistics
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary Statistics", 15, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      const stats = [
        [`Total Raised: $${totalDonations.toFixed(2)}`, `Average Donation: $${averageDonation.toFixed(2)}`],
        [`Unique Donors: ${uniqueDonors}`, `Active Campaigns: ${activeCampaigns}`]
      ];
      
      stats.forEach(row => {
        pdf.text(row[0], 15, yPosition);
        pdf.text(row[1], pageWidth / 2 + 5, yPosition);
        yPosition += 6;
      });
      
      yPosition += 10;
      
      // Monthly Trends Table
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Monthly Donation Trends", 15, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(9);
      
      const trendData = donationTrendData();
      pdf.setFont("helvetica", "bold");
      pdf.text("Month", 15, yPosition);
      pdf.text("Amount", 70, yPosition);
      pdf.text("Count", 120, yPosition);
      
      yPosition += 6;
      pdf.setFont("helvetica", "normal");
      
      trendData.forEach(row => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(row.month, 15, yPosition);
        pdf.text(`$${row.amount.toFixed(2)}`, 70, yPosition);
        pdf.text(row.count.toString(), 120, yPosition);
        yPosition += 6;
      });
      
      yPosition += 10;
      
      // Campaign Performance
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Top Campaigns", 15, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(9);
      
      const perfData = campaignPerformanceData().slice(0, 8);
      pdf.setFont("helvetica", "bold");
      pdf.text("Campaign", 15, yPosition);
      pdf.text("Raised", 100, yPosition);
      pdf.text("Goal", 140, yPosition);
      pdf.text("%", 180, yPosition);
      
      yPosition += 6;
      pdf.setFont("helvetica", "normal");
      
      perfData.forEach(row => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(row.name, 15, yPosition);
        pdf.text(`$${row.raised.toFixed(0)}`, 100, yPosition);
        pdf.text(`$${row.goal.toFixed(0)}`, 140, yPosition);
        pdf.text(`${row.percentage.toFixed(1)}%`, 180, yPosition);
        yPosition += 6;
      });
      
      // Save PDF
      pdf.save(`campaign-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const isLoading = donationsLoading || campaignsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/campaigns")}
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-3xl font-bold">Campaign Analytics</h1>
                {isLive && (
                  <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-full text-xs md:text-sm font-medium animate-pulse">
                    <Radio className="h-3 w-3 md:h-4 md:w-4" />
                    Live
                  </div>
                )}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Insights and trends for giving campaigns</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={exportToCSV} className="flex-1 sm:flex-none">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export </span>CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export </span>PDF
            </Button>
          </div>
        </div>

        {/* Live Donation Alert */}
        {recentDonation && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-3 md:p-4 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-500 flex items-center justify-center text-white text-lg md:text-xl animate-scale-in shrink-0">
                  🎉
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm md:text-lg text-foreground truncate">New Donation Received!</h3>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">
                    ${recentDonation.amount.toFixed(2)} from {recentDonation.donor}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                Just now
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Total Raised</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-primary">
                ${totalDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Avg Donation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                ${averageDonation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Unique Donors</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                {uniqueDonors}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <Target className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Active</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                {activeCampaigns}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donation Trends */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Donation Trends</CardTitle>
            <CardDescription className="text-xs md:text-sm">Monthly donation amounts over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
              <LineChart data={donationTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))" 
                  style={{ fontSize: '0.75rem' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '0.75rem' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Amount ($)"
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  name="Donations Count"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Campaign Performance */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-base md:text-lg">Campaign Performance</CardTitle>
              <CardDescription className="text-xs md:text-sm">Top campaigns by amount raised</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                <BarChart data={campaignPerformanceData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '0.65rem' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '0.75rem' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="raised" fill="hsl(var(--primary))" name="Raised ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Donation breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryDistributionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistributionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Donor Frequency */}
          <Card>
            <CardHeader>
              <CardTitle>Donor Engagement</CardTitle>
              <CardDescription>Distribution of donor frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={donorFrequencyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--accent))" name="Donors" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Average Donation by Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Average Gift Size</CardTitle>
              <CardDescription>Average donation amount per campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={campaigns?.filter(c => c.current_amount > 0).slice(0, 10).map(c => {
                    const campaignDonations = donations?.filter(d => d.campaign_id === c.id) || [];
                    const avgAmount = campaignDonations.length
                      ? campaignDonations.reduce((sum, d) => sum + Number(d.amount), 0) / campaignDonations.length
                      : 0;
                    return {
                      name: c.title.length > 15 ? c.title.substring(0, 15) + '...' : c.title,
                      average: avgAmount,
                    };
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="average" fill="hsl(var(--secondary))" name="Average ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
