import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, Camera } from "lucide-react";
import { Capacitor } from "@capacitor/core";

interface CameraPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CameraPermissionDialog = ({ open, onOpenChange }: CameraPermissionDialogProps) => {
  const handleOpenSettings = () => {
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'ios') {
        window.open('app-settings:', '_system');
      } else {
        window.open('intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:com.peguy24.cogmpw;end', '_system');
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Camera Access Required</DialogTitle>
          <DialogDescription className="text-center">
            COGMPW needs access to your camera and photo library to update your profile photo. Please enable access in your device settings.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How to enable:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open <strong>Settings</strong> on your device</li>
            <li>Find <strong>COGMPW</strong></li>
            <li>Turn on <strong>Camera</strong> and <strong>Photos</strong></li>
            <li>Come back to the app</li>
          </ol>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button onClick={handleOpenSettings} className="w-full gap-2">
            <Settings className="h-4 w-4" />
            Open Settings
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
