import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Receipt, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DonationReceiptDialog } from "@/components/DonationReceiptDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";

export default function GivingHistory() {
  const navigate = useNavigate();
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: donations, isLoading } = useQuery({
    queryKey: ["donations-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleViewReceipt = (donation: any) => {
    setSelectedDonation(donation);
    setReceiptDialogOpen(true);
  };

  const handleDownloadPDF = () => {
    if (!donations || !profile) return;

    const yearDonations = donations.filter(d => 
      new Date(d.created_at).getFullYear().toString() === selectedYear
    );

    if (yearDonations.length === 0) {
      alert(`No donations found for ${selectedYear}`);
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.text("COGMPW", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.text("Annual Giving Statement", pageWidth / 2, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Tax Year: ${selectedYear}`, pageWidth / 2, 38, { align: "center" });
    
    // Donor info
    doc.setFontSize(12);
    doc.text("Donor Information", 20, 50);
    doc.setFontSize(10);
    doc.text(`Name: ${profile.full_name}`, 20, 58);
    doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 20, 66);
    
    // Donations table
    doc.setFontSize(12);
    doc.text("Donation Summary", 20, 80);
    
    let yPos = 90;
    doc.setFontSize(9);
    doc.text("Date", 20, yPos);
    doc.text("Category", 70, yPos);
    doc.text("Amount", 150, yPos);
    
    yPos += 3;
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    yearDonations.forEach((donation) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const date = new Date(donation.created_at).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      
      doc.text(date, 20, yPos);
      doc.text(donation.category, 70, yPos);
      doc.text(`$${Number(donation.amount).toFixed(2)}`, 150, yPos);
      yPos += 6;
    });
    
    // Total
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    doc.setFontSize(12);
    const total = yearDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    doc.text(`Total Contributions: $${total.toFixed(2)}`, 20, yPos);
    
    // Tax statement
    yPos += 15;
    doc.setFontSize(9);
    doc.text("This statement confirms that no goods or services were provided in exchange for", 20, yPos);
    yPos += 5;
    doc.text("these contributions. Please retain this document for your tax records.", 20, yPos);
    yPos += 10;
    doc.text("COGMPW is a tax-exempt organization under section 501(c)(3) of the Internal Revenue Code.", 20, yPos);
    
    // Save
    doc.save(`COGMPW-Donations-${selectedYear}.pdf`);
  };

  const totalDonated = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const donationCount = donations?.length || 0;

  const availableYears = donations 
    ? Array.from(new Set(donations.map(d => new Date(d.created_at).getFullYear())))
        .sort((a, b) => b - a)
    : [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/giving")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Giving History</h1>
              <p className="text-muted-foreground">View your past donations and receipts</p>
            </div>
          </div>
          
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Tax Summary
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Donated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalDonated.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{donationCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Donations</CardTitle>
            <CardDescription>All your past donations to COGMPW</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-9 w-32" />
                  </div>
                ))}
              </div>
            ) : donations && donations.length > 0 ? (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">${Number(donation.amount).toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-medium">{donation.category}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(donation.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      {donation.notes && (
                        <div className="text-xs text-muted-foreground italic">
                          {donation.notes}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt(donation)}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No donations yet</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/giving")}
                  className="mt-2"
                >
                  Make your first donation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedDonation && (
        <DonationReceiptDialog
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          donation={selectedDonation}
          donorName={profile?.full_name || "Donor"}
        />
      )}
    </div>
  );
}
