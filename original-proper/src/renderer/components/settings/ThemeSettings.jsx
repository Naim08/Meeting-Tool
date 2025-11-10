import { Monitor, Moon, Sun } from "lucide-react";
import { SectionHeader } from "./shared";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const themeOptions = [
  {
    id: "light",
    label: "Light",
    description: "Bright, high-contrast interface inspired by Cluely.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Current Interview Solver dark appearance.",
    icon: Moon,
  },
  {
    id: "system",
    label: "System",
    description: "Follow your operating system appearance settings.",
    icon: Monitor,
  },
];

const ThemeSettings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <section>
      <SectionHeader
        icon={Sun}
        title="Appearance"
        description="Switch between light, dark, or system themes."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={cn(
                "flex h-full flex-col items-start rounded-xl border p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "bg-card hover:border-primary/40 hover:bg-muted",
                isActive
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border",
                "dark:bg-gray-900/60"
              )}
              aria-pressed={isActive}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {option.label}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ThemeSettings;
