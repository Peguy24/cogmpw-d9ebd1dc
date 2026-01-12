import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface DonationReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donation: {
    id: string;
    amount: number;
    category: string;
    created_at: string;
    stripe_payment_intent_id: string | null;
    notes: string | null;
  };
  donorName: string;
}

export const DonationReceiptDialog = ({
  open,
  onOpenChange,
  donation,
  donorName,
}: DonationReceiptDialogProps) => {
  const formattedDate = new Date(donation.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.text("COGMPW", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text("Donation Receipt", pageWidth / 2, 28, { align: "center" });

    // Greeting
    doc.setFontSize(10);
    doc.text(`Dear ${donorName},`, 20, 45);
    doc.text("Thank you for your generous donation to COGMPW.", 20, 52);
    doc.text("Your support helps us continue our mission and ministry.", 20, 58);

    // Transaction Details Box
    doc.setFontSize(12);
    doc.text("Transaction Details", 20, 75);
    
    doc.setFontSize(10);
    let yPos = 85;
    
    doc.text("Amount:", 20, yPos);
    doc.text(`$${donation.amount.toFixed(2)}`, 80, yPos);
    yPos += 8;
    
    doc.text("Category:", 20, yPos);
    doc.text(donation.category, 80, yPos);
    yPos += 8;
    
    doc.text("Date:", 20, yPos);
    doc.text(formattedDate, 80, yPos);
    yPos += 8;
    
    if (donation.stripe_payment_intent_id) {
      doc.text("Transaction ID:", 20, yPos);
      doc.setFontSize(8);
      doc.text(donation.stripe_payment_intent_id, 80, yPos);
      doc.setFontSize(10);
      yPos += 8;
    }
    
    if (donation.notes) {
      doc.text("Notes:", 20, yPos);
      doc.text(donation.notes, 80, yPos);
      yPos += 8;
    }

    // Tax Information
    yPos += 10;
    doc.setFontSize(12);
    doc.text("Tax Information", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.text("COGMPW is a 501(c)(3) tax-exempt organization. This receipt serves as", 20, yPos);
    yPos += 5;
    doc.text("documentation of your charitable contribution for tax purposes.", 20, yPos);
    yPos += 5;
    doc.text("No goods or services were provided in exchange for this donation.", 20, yPos);
    yPos += 8;
    doc.text("Please retain this receipt for your tax records.", 20, yPos);

    // Footer
    yPos += 20;
    doc.setFontSize(10);
    doc.text("God bless you,", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
    doc.text("COGMPW Ministry Team", pageWidth / 2, yPos, { align: "center" });

    return doc;
  };

  const handlePrintOrShare = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const doc = generatePDF();
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `COGMPW-Receipt-${donation.id.slice(0, 8)}.pdf`;

        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Donation Receipt',
          text: `COGMPW Donation Receipt - $${donation.amount.toFixed(2)}`,
          url: result.uri,
          dialogTitle: 'Share your receipt',
        });

        toast.success("Receipt ready to share!");
      } catch (error) {
        console.error("Error saving/sharing receipt:", error);
        toast.error("Failed to create receipt. Please try again.");
      }
    } else {
      window.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Donation Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 print:text-black">
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">COGMPW</h1>
            <p className="text-sm text-muted-foreground">Donation Receipt</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm">Dear {donorName},</p>
            <p className="text-sm">
              Thank you for your generous donation to COGMPW. Your support helps us continue our mission and ministry.
            </p>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h2 className="font-semibold text-lg">Transaction Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Amount:</span>
                <span className="text-sm font-semibold">${donation.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Category:</span>
                <span className="text-sm">{donation.category}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Date:</span>
                <span className="text-sm">{formattedDate}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Transaction ID:</span>
                <span className="text-sm break-all">{donation.stripe_payment_intent_id}</span>
              </div>
              {donation.notes && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                  <span className="text-sm">{donation.notes}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-lg space-y-2 print:bg-gray-100">
            <h2 className="font-semibold text-lg">Tax Information</h2>
            <p className="text-sm">
              COGMPW is a 501(c)(3) tax-exempt organization. This receipt serves as documentation of your charitable contribution for tax purposes. No goods or services were provided in exchange for this donation.
            </p>
            <p className="text-sm font-medium">
              Please retain this receipt for your tax records.
            </p>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>God bless you,</p>
            <p className="font-medium">COGMPW Ministry Team</p>
          </div>

          <div className="flex justify-end print:hidden">
            <Button onClick={handlePrintOrShare} variant="outline" size="sm">
              {Capacitor.isNativePlatform() ? (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Receipt
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
