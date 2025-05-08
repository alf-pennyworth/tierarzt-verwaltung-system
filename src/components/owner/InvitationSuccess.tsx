
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvitationSuccessProps {
  inviteLink: string;
  onCopyLink: () => void;
  onClose: () => void;
}

const InvitationSuccess = ({ inviteLink, onCopyLink, onClose }: InvitationSuccessProps) => {
  return (
    <div className="flex flex-col items-center py-4 space-y-4">
      <div className="rounded-full bg-green-100 p-3">
        <Send className="h-6 w-6 text-green-600" />
      </div>
      
      <div className="w-full">
        <div className="text-sm text-muted-foreground mb-2">Einladungslink:</div>
        <div className="flex gap-2">
          <Input 
            value={inviteLink} 
            readOnly 
            className="w-full font-mono text-xs"
          />
          <Button onClick={onCopyLink} size="sm">
            Kopieren
          </Button>
        </div>
      </div>
      
      <div className="w-full flex justify-end mt-4">
        <Button onClick={onClose}>Schließen</Button>
      </div>
    </div>
  );
};

export default InvitationSuccess;
