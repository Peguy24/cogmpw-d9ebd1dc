import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

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
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(donation.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
