import {
  AudioLines,
  CodeXml,
  HelpCircle,
  LucideIcon,
  Mic,
  Monitor,
  History as HistoryIcon,
  PanelLeft,
  Settings,
  MonitorSmartphone,
} from "lucide-react";

import { TABS } from "@/App";
import React, { useState, useCallback, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import { NavUser } from "@/components/nav-user";
import { SupabaseClient } from "@supabase/supabase-js";
import CompanionModal from "@/components/companion-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Types
interface AppSidebarProps {
  setActiveTab: (tab: string) => void;
  activeTab: string;
  session: any;
  isNewVersionAvailable: boolean;
  supabase: SupabaseClient;
  hashedEmail: string;
  getDisplayMedia?: () => void;
  setScreenOpen?: (open: boolean) => void;
  selectedScreen?: { name: string };
  isSystemAudioRecording: boolean;
  isMicrophoneRecording: boolean;
  isMicrophoneRecordingLoading: boolean;
}

interface NavItem {
  title?: string;
  action?: () => void;
  icon?: LucideIcon;
  isActive?: boolean;
  divider?: boolean;
}

interface NavItemsProps {
  title?: string;
  items: NavItem[];
  className?: string;
}

// Component for navigation items
const NavItems = ({ title, items, className }: NavItemsProps) => (
  <SidebarGroup className={className}>
    {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
    <SidebarGroupContent>
      <SidebarMenu>
        {items.map((item, index) => {
          if (item.divider) {
            return (
              <SidebarSeparator key={`divider-${index}`} className="my-2" />
            );
          }

          // Special styling for Code Interview tab
          const isCodeInterview = item.title === "Interview Copilot";

          return (
            <SidebarMenuItem key={item.title || `item-${index}`}>
              <SidebarMenuButton
                isActive={item.isActive}
                asChild
                className={cn(
                  "rounded-lg",
                  isCodeInterview ? "h-10 text-base font-semibold" : ""
                )}
              >
                <button
                  type="button"
                  onClick={item.action}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isCodeInterview
                      ? item.isActive
                        ? "bg-primary text-primary-foreground shadow-lg dark:bg-white/10 dark:text-white"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:text-slate-200 dark:hover:bg-blue-600/10"
                      : item.isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn("h-5 w-5", isCodeInterview && "h-6 w-6")}
                  />
                  <span className={cn(isCodeInterview && "text-base font-semibold")}>
                    {item.title}
                  </span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);

// Component for a control button with tooltip
interface ControlButtonProps {
  icon: LucideIcon;
  label: string;
  tooltipText: string;
  isActive?: boolean;
  activeColor?: string;
  onClick?: () => void;
  hotkey?: string;
  isClickable?: boolean;
}

const ControlButton = ({
  icon: Icon,
  label,
  tooltipText,
  isActive = false,
  activeColor = "blue",
  onClick,
  hotkey,
  isClickable = true,
}: ControlButtonProps) => {
  const { open: isSidebarOpen, isCollapsedOnMobile } = useSidebar();
  // Determine styles based on active state and color
  const getStyles = useCallback(() => {
    const baseStyles =
      "flex w-full items-center gap-2 rounded-md text-muted-foreground transition-colors duration-200";

    if (!isClickable) {
      return `${baseStyles} cursor-default opacity-80 ${
        isActive
          ? `text-${activeColor}-500 font-medium bg-${activeColor}-50/10`
          : "text-muted-foreground"
      }`;
    }

    return `${baseStyles} ${
      isActive
        ? `text-${activeColor}-500 hover:text-${activeColor}-600 font-medium bg-${activeColor}-50/10`
        : `text-muted-foreground hover:text-${activeColor}-500 hover:bg-${activeColor}-50/5`
    }`;
  }, [isClickable, isActive, activeColor]);
  return (
    <SidebarMenuItem>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild>
              <div
                className={getStyles()}
                onClick={isClickable ? onClick : undefined}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`h-4 w-4 ${isActive ? `text-${activeColor}-500` : ""}`}
                  />
                  {isActive && (
                    <span className={`absolute -top-1 -right-1 flex h-2 w-2`}>
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${activeColor}-400 opacity-75`}
                      ></span>
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 bg-${activeColor}-500`}
                      ></span>
                    </span>
                  )}
                </div>
                {isSidebarOpen && !isCollapsedOnMobile && (
                  <span className="truncate">{label}</span>
                )}
                {hotkey && isSidebarOpen && !isCollapsedOnMobile && (
                  <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground dark:bg-gray-800 dark:text-gray-400">
                    {hotkey}
                  </kbd>
                )}
              </div>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </SidebarMenuItem>
  );
};

// Controls section component
interface ControlsSectionProps {
  getDisplayMedia?: () => void;
  setScreenOpen?: (open: boolean) => void;
  selectedScreen?: { name: string };
  isSystemAudioRecording: boolean;
  isMicrophoneRecording: boolean;
  setIsCompanionModalOpen: (open: boolean) => void;
  isMicrophoneRecordingLoading: boolean;
}

const ControlsSection = ({
  getDisplayMedia,
  setScreenOpen,
  selectedScreen,
  isSystemAudioRecording,
  isMicrophoneRecording,
  setIsCompanionModalOpen,
  isMicrophoneRecordingLoading,
}: ControlsSectionProps) => {
  const { open: isSidebarOpen, isCollapsedOnMobile } = useSidebar();

  return (
    <SidebarGroup className="mt-4">
      <SidebarGroupLabel>
        {isSidebarOpen && !isCollapsedOnMobile ? "Controls" : ""}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* Screen Share Button */}
          <ControlButton
            icon={Monitor}
            label={
              selectedScreen?.name
                ? `Screen: ${selectedScreen.name}`
                : "Screen Share"
            }
            tooltipText={
              selectedScreen?.name
                ? `Screen Share: ${selectedScreen.name}`
                : "Screen Share"
            }
            isActive={!!selectedScreen}
            activeColor="blue"
            onClick={() => {
              getDisplayMedia?.();
              setScreenOpen?.(true);
            }}
            isClickable={true}
          />

          {/* Companion Button */}
          <ControlButton
            icon={MonitorSmartphone}
            label="Companion"
            tooltipText="Companion"
            onClick={() => setIsCompanionModalOpen(true)}
            isClickable={true}
          />

          {/* System Audio Button */}
          <ControlButton
            icon={AudioLines}
            label="System Audio"
            tooltipText={
              isSystemAudioRecording
                ? "System Audio Recording (Use hotkey to stop)"
                : "System Audio (Use hotkey to start)"
            }
            isActive={isSystemAudioRecording}
            activeColor="red"
            hotkey="⌘⇧A"
            isClickable={false}
          />

          {/* Microphone Button */}
          <ControlButton
            icon={Mic}
            label={
              isMicrophoneRecordingLoading ? "Initializing..." : "Microphone"
            }
            tooltipText={
              isMicrophoneRecordingLoading
                ? "Microphone initializing..."
                : isMicrophoneRecording
                  ? "Microphone Recording (Use hotkey to stop)"
                  : "Microphone (Use hotkey to start)"
            }
            isActive={isMicrophoneRecording || isMicrophoneRecordingLoading}
            activeColor={isMicrophoneRecordingLoading ? "yellow" : "red"}
            hotkey="⌘⇧M"
            isClickable={false}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

// Main AppSidebar component
export function AppSidebar({
  setActiveTab,
  activeTab,
  session,
  isNewVersionAvailable,
  supabase,
  hashedEmail,
  getDisplayMedia,
  setScreenOpen,
  selectedScreen,
  isSystemAudioRecording,
  isMicrophoneRecording,
  isMicrophoneRecordingLoading,
}: AppSidebarProps) {
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    window.api.on("message", (message) => {
      if (message.type === "transparency.toggle") {
        toggleSidebar();
        console.log("toggleSidebar");
      }
    });
    return () => {
      console.log("unmount");
      window.api.off("message", () => {});
    };
  }, []);

  // Primary navigation items
  const primaryItems: NavItem[] = [
    {
      title: "Interview Copilot",
      action: () => setActiveTab(TABS.CHAT),
      icon: CodeXml,
      isActive: activeTab === TABS.CHAT,
    },
    {
      title: "History",
      action: () => setActiveTab(TABS.HISTORY),
      icon: HistoryIcon,
      isActive: activeTab === TABS.HISTORY,
    },
    {
      title: "Meetings",
      action: () => setActiveTab(TABS.MEETINGS),
      icon: Mic,
      isActive: activeTab === TABS.MEETINGS,
    },
  ];

  // Secondary navigation items
  const secondaryItems: NavItem[] = [
    {
      title: "Settings",
      icon: Settings,
      action: () => setActiveTab(TABS.SETTINGS),
      isActive: activeTab === TABS.SETTINGS,
    },
    {
      title: "Support",
      icon: HelpCircle,
      action: () => window.open("https://interviewsolver.com/docs", "_blank"),
      isActive: false,
    },
    {
      divider: true,
    },
    {
      title: "Hide Sidebar",
      icon: PanelLeft,
      action: toggleSidebar,
      isActive: false,
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContent className="my-4 overflow-x-hidden">
        {/* Primary Navigation - Code Interview Tab */}
        <NavItems items={primaryItems} className="my-4 " />

        <SidebarSeparator className="" />

        {/* Controls Section */}
        <ControlsSection
          getDisplayMedia={getDisplayMedia}
          setScreenOpen={setScreenOpen}
          selectedScreen={selectedScreen}
          isSystemAudioRecording={isSystemAudioRecording}
          isMicrophoneRecording={isMicrophoneRecording}
          isMicrophoneRecordingLoading={isMicrophoneRecordingLoading}
          setIsCompanionModalOpen={setIsCompanionModalOpen}
        />

        <SidebarSeparator className="" />

        {/* Secondary Navigation */}
        <NavItems items={secondaryItems} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          supabase={supabase}
          user={{
            email: session.user.email,
            avatar: session.user.user_metadata.avatar_url,
          }}
        />
      </SidebarFooter>

      {/* Companion Modal */}
      <CompanionModal
        isOpen={isCompanionModalOpen}
        handleOpenChange={setIsCompanionModalOpen}
        hashedEmail={hashedEmail}
      />
    </Sidebar>
  );
}
