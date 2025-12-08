import { Loader2, CreditCard } from "lucide-react";

interface PaymentLoadingOverlayProps {
  isVisible: boolean;
}

export const PaymentLoadingOverlay = ({ isVisible }: PaymentLoadingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <CreditCard className="h-16 w-16 text-primary/30" />
          </div>
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Processing Payment
          </h2>
          <p className="text-muted-foreground max-w-xs">
            Please complete your payment in the browser. You'll be redirected back automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Waiting for confirmation...</span>
        </div>
      </div>
    </div>
  );
};
