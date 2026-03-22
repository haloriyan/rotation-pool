import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

export function ShareModal({ open, onOpenChange, roomId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}/join/${roomId}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Rotation Pool room", url: joinUrl });
      } catch { /* user dismissed */ }
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gray-950 border-t border-gray-800">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className="text-white text-lg">Invite Players</DrawerTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DrawerHeader>

        <div className="px-4 pb-8 flex flex-col items-center gap-5">
          {/* QR code */}
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <QRCodeSVG value={joinUrl} size={200} />
          </div>

          <p className="text-xs text-gray-500 -mt-2">
            Scan with any camera app to join
          </p>

          {/* Link + copy */}
          <div className="w-full flex items-center gap-2">
            <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 overflow-hidden">
              <p className="text-gray-300 text-sm truncate font-mono">{joinUrl}</p>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 shrink-0 h-9 w-9"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Share button */}
          {!!navigator.share && (
            <Button
              className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 flex items-center gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share via…
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
