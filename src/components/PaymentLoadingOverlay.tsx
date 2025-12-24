import { useState, useEffect } from "react";
import { Loader2, CreditCard, Home } from "lucide-react";
import { Button } from "./ui/button";
import { setPaymentLoading } from "@/hooks/usePaymentLoading";
import { useNavigate } from "react-router-dom";

interface PaymentLoadingOverlayProps {
  isVisible: boolean;
}

const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export const PaymentLoadingOverlay = ({ isVisible }: PaymentLoadingOverlayProps) => {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isVisible) {
      setHasTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setHasTimedOut(true);
    }, TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isVisible]);

  const handleDismiss = () => {
    setPaymentLoading(false);
  };

  const handleReturnToApp = () => {
    setPaymentLoading(false);
    navigate("/home");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        <div className="relative">
          {!hasTimedOut && (
            <div className="absolute inset-0 animate-ping">
              <CreditCard className="h-16 w-16 text-primary/30" />
            </div>
          )}
          <CreditCard className={`h-16 w-16 ${hasTimedOut ? 'text-muted-foreground' : 'text-primary'}`} />
        </div>
        
        {hasTimedOut ? (
          <>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Payment Timeout
              </h2>
              <p className="text-muted-foreground max-w-xs">
                We haven't received confirmation yet. Your payment may still be processing, or you can return to the app and try again.
              </p>
            </div>

            <Button onClick={handleReturnToApp} className="gap-2">
              <Home className="h-4 w-4" />
              Return to App
            </Button>
          </>
        ) : (
          <>
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

            <Button variant="outline" onClick={handleDismiss}>
              Continue in App
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
