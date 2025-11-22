import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Users, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function AdminCampaignAnalytics() {
  const navigate = useNavigate();

  // Fetch all donations for analytics
  const { data: donations, isLoading: donationsLoading } = useQuery({
    queryKey: ["analytics-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch campaigns for analytics
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/campaigns")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Campaign Analytics</h1>
            <p className="text-muted-foreground">Insights and trends for giving campaigns</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Raised
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${totalDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Average Donation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${averageDonation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Unique Donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {uniqueDonors}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Active Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeCampaigns}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donation Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Trends</CardTitle>
            <CardDescription>Monthly donation amounts over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={donationTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
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

        <div className="grid gap-6 md:grid-cols-2">
          {/* Campaign Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Top campaigns by amount raised</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={campaignPerformanceData()}>
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
                  <Legend />
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
