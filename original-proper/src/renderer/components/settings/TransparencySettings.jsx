import { useState, useEffect } from "react";
import { Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { SectionHeader } from "./shared";

const TransparencySettings = () => {
  const [transparencyValue, setTransparencyValue] = useState(50);

  useEffect(() => {
    const loadTransparencyValue = async () => {
      const value = await window.api.getTransparencyValue();
      setTransparencyValue(value);
    };

    loadTransparencyValue();
  }, []);

  const handleTransparencyChange = async (value) => {
    const newValue = value[0];
    setTransparencyValue(newValue);
    await window.api.updateTransparencyValue(newValue);
  };

  return (
    <section>
      <SectionHeader
        icon={Sliders}
        title="Transparency"
        description="Adjust the transparency level when toggling transparency with hotkey"
      />

      <div className="rounded-lg border border-border/60 bg-card/95 p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-800/50">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Opacity: {transparencyValue}%
          </span>
        </div>
        <div className="py-4">
          <Slider
            defaultValue={[transparencyValue]}
            value={[transparencyValue]}
            max={90}
            step={1}
            onValueChange={handleTransparencyChange}
            className="w-full"
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Transparent</span>
          <span>Opaque</span>
        </div>
      </div>
    </section>
  );
};

export default TransparencySettings;
