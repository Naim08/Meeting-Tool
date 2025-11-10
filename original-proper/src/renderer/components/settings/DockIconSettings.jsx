import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./shared";

const DockIconSettings = () => {
  const [isDockIconVisible, setIsDockIconVisible] = useState(true);

  const toggleDockIcon = async () => {
    const isVisible = await window.api.toggleDockIcon();
    setIsDockIconVisible(isVisible);
  };

  return (
    <section>
      <SectionHeader
        icon={isDockIconVisible ? Eye : EyeOff}
        title="Dock Icon"
        description="Toggle the visibility of the dock icon (macOS only)"
      />

      <div className="rounded-lg border border-border/60 bg-card/95 p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-center">
          <Button
            onClick={toggleDockIcon}
            variant={isDockIconVisible ? "default" : "secondary"}
            className="flex items-center gap-2"
          >
            {isDockIconVisible ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Dock Icon
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show Dock Icon
              </>
            )}
          </Button>
          <p className="ml-4 text-xs text-muted-foreground">
            {isDockIconVisible
              ? "The app icon is currently visible in your dock"
              : "The app icon is currently hidden from your dock"}
          </p>
        </div>
      </div>
    </section>
  );
};

export default DockIconSettings;
