import * as React from 'react'
import { useEffect, useState } from 'react'
import { Mic, Settings2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LevelBar } from '@/components/ui/level-bar'
import { cn } from '@/lib/utils'

export interface AudioSetupCardProps {
  className?: string
  isMicrophoneRecording?: boolean
  isSystemAudioRecording?: boolean
}

const AudioSetupCard: React.FC<AudioSetupCardProps> = ({
  className,
  isMicrophoneRecording = false,
  isSystemAudioRecording = false,
}) => {
  const [currentDevice, setCurrentDevice] = useState<string>('Default Microphone')
  const [micLevel, setMicLevel] = useState(0)
  const [systemLevel, setSystemLevel] = useState(0)

  useEffect(() => {
    // Get current audio device
    const loadAudioDevice = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter((d) => d.kind === 'audioinput')
        if (audioInputs.length > 0) {
          setCurrentDevice(audioInputs[0].label || 'Default Microphone')
        }
      } catch (error) {
        console.error('[AudioSetupCard] Failed to enumerate devices:', error)
      }
    }

    loadAudioDevice()
  }, [])

  // Simulate audio levels for demo purposes
  useEffect(() => {
    if (!isMicrophoneRecording && !isSystemAudioRecording) {
      setMicLevel(0)
      setSystemLevel(0)
      return
    }

    const interval = setInterval(() => {
      if (isMicrophoneRecording) {
        setMicLevel(Math.random() * 60 + 20)
      }
      if (isSystemAudioRecording) {
        setSystemLevel(Math.random() * 50 + 30)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isMicrophoneRecording, isSystemAudioRecording])

  const openSystemAudioPrefs = () => {
    // This would ideally call an IPC handler to open system preferences
    // For now, we can use shell.openExternal on macOS
    window.api?.openScreenSecurity?.()
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-zinc-900 p-6 transition-all duration-200 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Mic className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Audio Setup</h3>
        </div>
        {(isMicrophoneRecording || isSystemAudioRecording) && (
          <Badge variant="active" size="sm">
            Recording
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {/* Current Microphone */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Microphone</span>
            {isMicrophoneRecording && (
              <Badge variant="blue" size="sm">
                Active
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium text-zinc-300 truncate">
            {currentDevice}
          </p>
          <LevelBar
            level={micLevel}
            variant="gradient"
            size="default"
            animated={isMicrophoneRecording}
          />
        </div>

        {/* System Audio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">System Audio</span>
            {isSystemAudioRecording && (
              <Badge variant="blue" size="sm">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-zinc-500" />
            <LevelBar
              level={systemLevel}
              variant="blue"
              size="default"
              animated={isSystemAudioRecording}
            />
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={openSystemAudioPrefs}
          variant="outline"
          size="sm"
          className="w-full mt-4 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Open Audio Preferences
        </Button>
      </div>
    </div>
  )
}

export { AudioSetupCard }
