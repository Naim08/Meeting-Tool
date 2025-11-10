import { Settings as SettingsIcon, Download } from "lucide-react";

// Tab navigation component
export const SettingsTabs = ({ tabs, activeTab, setActiveTab }) => (
  <div className="mb-8 flex overflow-x-auto space-x-1 border-b border-border/60 dark:border-gray-800">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`flex items-center rounded-t-lg px-4 pb-3 text-sm font-medium transition-colors focus-visible:outline-none ${
          activeTab === tab.id
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);

// Header component with update notification
export const SettingsHeader = ({ updateLink }) => (
  <div className="mb-8 flex items-center justify-between">
    <div className="flex items-center">
      <SettingsIcon className="mr-2 h-6 w-6 text-primary" />
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
    </div>

    {updateLink && (
      <a
        target="_blank"
        href={updateLink}
        className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <Download className="mr-2 h-4 w-4" />
        Download update
        <span className="relative flex h-3 w-3 ml-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-300"></span>
        </span>
      </a>
    )}
  </div>
);

// Section header component
export const SectionHeader = ({ icon: Icon, title, description }) => (
  <>
    <div className="mb-4 flex items-center">
      <Icon className="mr-2 h-5 w-5 text-primary" />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    </div>
    {description && (
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
    )}
  </>
);
