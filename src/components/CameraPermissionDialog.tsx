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
      // On iOS/Android, this opens the app's settings page
      if (Capacitor.getPlatform() === 'ios') {
        window.open('app-settings:', '_system');
      } else {
        // Android - open app settings via intent
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
          <DialogTitle className="text-center">Accès à la caméra requis</DialogTitle>
          <DialogDescription className="text-center">
            COGMPW a besoin d'accéder à votre caméra et à votre galerie photo pour mettre à jour votre photo de profil. Veuillez autoriser l'accès dans les réglages de votre appareil.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Comment faire :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Ouvrez <strong>Réglages</strong> sur votre appareil</li>
            <li>Recherchez <strong>COGMPW</strong></li>
            <li>Activez <strong>Caméra</strong> et <strong>Photos</strong></li>
            <li>Revenez dans l'application</li>
          </ol>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button onClick={handleOpenSettings} className="w-full gap-2">
            <Settings className="h-4 w-4" />
            Ouvrir les Réglages
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
