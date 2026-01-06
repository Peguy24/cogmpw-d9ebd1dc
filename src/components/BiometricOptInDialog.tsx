import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Fingerprint } from "lucide-react";

interface BiometricOptInDialogProps {
  open: boolean;
  biometryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BiometricOptInDialog = ({
  open,
  biometryName,
  onConfirm,
  onCancel,
}: BiometricOptInDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">
            Enable {biometryName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Sign in faster next time using {biometryName}. Your credentials will be stored securely on this device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction onClick={onConfirm} className="w-full">
            Enable {biometryName}
          </AlertDialogAction>
          <AlertDialogCancel onClick={onCancel} className="w-full mt-0">
            Not Now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
