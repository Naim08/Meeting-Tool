import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  ScanLine,
  Wifi,
  WifiOff,
  MonitorSmartphone,
} from "lucide-react";

const CompanionModal = ({ isOpen, handleOpenChange, hashedEmail }) => {
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const companionUrl = `https://interviewsolver.com/web?code=${hashedEmail}`;

  // Simulate connection status check
  useEffect(() => {
    if (isOpen) {
      // This would be replaced with actual connection check logic
      const checkConnectionStatus = () => {
        // Simulate random connection status for demo purposes
        // In a real app, this would check if a companion is connected
        setIsConnected(Math.random() > 0.5);
      };

      checkConnectionStatus();
      const interval = setInterval(checkConnectionStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(hashedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openCompanionInBrowser = () => {
    window.open(companionUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-blue-500" />
            Connect Companion Device
          </DialogTitle>
          <DialogDescription className="text-base">
            Use your phone or tablet as a companion device. Companion devices
            see the responses mirrored on their screen.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <ScanLine className="h-4 w-4" />
              <span>Scan QR Code with your device</span>
            </div>
            <div
              className={`bg-white p-4 rounded-lg shadow-md ${isConnected ? "ring-2 ring-green-500/50" : ""}`}
            >
              <QRCode size={180} value={companionUrl} className="h-44 w-44" />
            </div>
            <p className="max-w-xs text-center text-xs text-muted-foreground">
              Point your camera at the QR code to open the companion app
              automatically
            </p>
          </div>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-900 px-2 text-sm text-gray-500 dark:text-gray-400">
                OR
              </span>
            </div>
          </div>

          {/* Manual Code Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="companion-code"
                className="text-sm font-medium flex items-center gap-2"
              >
                <span>Your Companion Code</span>
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  id="companion-code"
                  value={hashedEmail}
                  readOnly
                  className="font-mono text-lg tracking-wider text-center bg-white dark:bg-slate-800"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                  title={copied ? "Copied!" : "Copy to clipboard"}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <p className="text-sm font-medium">Instructions:</p>
              <ol className="text-sm space-y-2 list-decimal pl-5">
                <li>
                  Go to{" "}
                  <span className="font-semibold">interviewsolver.com/web</span>{" "}
                  on your companion device
                </li>
                <li>Enter the code shown above when prompted</li>
                <li>Your devices will connect automatically</li>
              </ol>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanionModal;
