import * as React from 'react'
import { Home as HomeIcon, Keyboard, Activity } from 'lucide-react'
import { AudioSetupCard } from '@/components/features/audio/AudioSetupCard'
import { ScreenShareCard } from '@/components/features/screen/ScreenShareCard'
import { ShortcutsTable } from '@/components/features/shortcuts/ShortcutsTable'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface HomePageProps {
  className?: string
  selectedScreen?: { name: string } | null
  onSelectScreen?: () => void
  isMicrophoneRecording?: boolean
  isSystemAudioRecording?: boolean
}

const HomePage: React.FC<HomePageProps> = ({
  className,
  selectedScreen,
  onSelectScreen,
  isMicrophoneRecording = false,
  isSystemAudioRecording = false,
}) => {
  return (
    <div className={cn('flex flex-col min-h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <HomeIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Control Center</h1>
            <p className="text-sm text-zinc-400">
              Configure your interview assistant settings
            </p>
          </div>
        </div>
        <Badge variant="blue-subtle" size="lg">
          <Activity className="h-3 w-3 mr-1.5" />
          System Ready
        </Badge>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <AudioSetupCard
            isMicrophoneRecording={isMicrophoneRecording}
            isSystemAudioRecording={isSystemAudioRecording}
          />
          <ScreenShareCard
            selectedScreen={selectedScreen}
            onSelectScreen={onSelectScreen}
          />
        </div>

        {/* Status Overview Card */}
        <div className="rounded-xl border border-white/10 bg-zinc-900 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Status Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusItem
              label="Microphone"
              status={isMicrophoneRecording ? 'active' : 'inactive'}
              value={isMicrophoneRecording ? 'Recording' : 'Ready'}
            />
            <StatusItem
              label="System Audio"
              status={isSystemAudioRecording ? 'active' : 'inactive'}
              value={isSystemAudioRecording ? 'Recording' : 'Ready'}
            />
            <StatusItem
              label="Screen Share"
              status={selectedScreen ? 'active' : 'inactive'}
              value={selectedScreen ? 'Selected' : 'Not Set'}
            />
            <StatusItem
              label="AI Model"
              status="active"
              value="Connected"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Keyboard className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Keyboard Shortcuts
              </h3>
              <p className="text-sm text-zinc-400">
                Global hotkeys that work even when the app is not focused
              </p>
            </div>
          </div>
          <ShortcutsTable />
        </div>
      </div>
    </div>
  )
}

interface StatusItemProps {
  label: string
  status: 'active' | 'inactive' | 'warning' | 'error'
  value: string
}

const StatusItem: React.FC<StatusItemProps> = ({ label, status, value }) => {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-zinc-800/50 border border-white/5">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div
          className={cn('h-2 w-2 rounded-full', {
            'bg-blue-500 animate-pulse': status === 'active',
            'bg-zinc-600': status === 'inactive',
            'bg-yellow-500': status === 'warning',
            'bg-red-500': status === 'error',
          })}
        />
        <span
          className={cn('text-sm font-medium', {
            'text-blue-400': status === 'active',
            'text-zinc-400': status === 'inactive',
            'text-yellow-400': status === 'warning',
            'text-red-400': status === 'error',
          })}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

export { HomePage }
