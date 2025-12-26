import { Reply, Pin, PinOff, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReply: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  isPinned: boolean;
  canPin: boolean;
  canDelete: boolean;
}

export const MessageActionSheet = ({
  isOpen,
  onClose,
  onReply,
  onPin,
  onDelete,
  isPinned,
  canPin,
  canDelete,
}: MessageActionSheetProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Action Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl p-4 pb-8 animate-slide-up safe-area-bottom">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-base"
            onClick={() => {
              onReply();
              onClose();
            }}
          >
            <Reply className="h-5 w-5" />
            Reply
          </Button>
          
          {canPin && onPin && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-base"
              onClick={() => {
                onPin();
                onClose();
              }}
            >
              {isPinned ? (
                <>
                  <PinOff className="h-5 w-5 text-amber-500" />
                  Unpin Message
                </>
              ) : (
                <>
                  <Pin className="h-5 w-5" />
                  Pin Message
                </>
              )}
            </Button>
          )}
          
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-base text-destructive hover:text-destructive"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              <Trash2 className="h-5 w-5" />
              Delete Message
            </Button>
          )}
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-base text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
};
