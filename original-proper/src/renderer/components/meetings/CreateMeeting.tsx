import * as React from 'react'
import { useState } from 'react'
import { Plus, Mic, Volume2, Monitor, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { startMeeting } from './meetings-api'
import { cn } from '@/lib/utils'

interface CreateMeetingProps {
  onMeetingStarted?: (meetingId: string) => void
  className?: string
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
]

const CreateMeeting: React.FC<CreateMeetingProps> = ({
  onMeetingStarted,
  className,
}) => {
  const [title, setTitle] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(30)
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true)
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form validation
  const titleError = title.length > 0 && title.length < 3
  const isFormValid = !titleError && (microphoneEnabled || systemAudioEnabled)

  const handleStartMeeting = async () => {
    if (!isFormValid) return

    setIsCreating(true)
    setError(null)

    try {
      const meetingId = await startMeeting({
        microphone: microphoneEnabled,
        system: systemAudioEnabled,
      })

      if (meetingId) {
        onMeetingStarted?.(meetingId)
        // Reset form
        setTitle('')
        setSelectedDuration(30)
        setMicrophoneEnabled(true)
        setSystemAudioEnabled(true)
      } else {
        setError('Failed to start meeting. Please try again.')
      }
    } catch (err) {
      console.error('[CreateMeeting] Error starting meeting:', err)
      setError('An unexpected error occurred.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-zinc-900 p-6',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <Plus className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Start New Meeting
          </h3>
          <p className="text-sm text-zinc-400">
            Configure your recording preferences
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <label
            htmlFor="meeting-title"
            className="text-sm font-medium text-zinc-300"
          >
            Meeting Title
            <span className="text-zinc-500 ml-1">(optional)</span>
          </label>
          <input
            id="meeting-title"
            type="text"
            placeholder="e.g., Technical Interview with Company X"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(
              'w-full rounded-lg border bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              titleError
                ? 'border-red-500 focus:border-red-500'
                : 'border-white/10 focus:border-blue-500'
            )}
          />
          {titleError && (
            <p className="text-xs text-red-400">
              Title must be at least 3 characters
            </p>
          )}
        </div>

        {/* Duration Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Expected Duration
          </label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedDuration(option.value)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                  selectedDuration === option.value
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 text-zinc-400 hover:border-blue-500/50 hover:text-white'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Sources */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-zinc-300">
            Audio Sources
          </label>

          <div className="space-y-3">
            {/* Microphone Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-800/50 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    microphoneEnabled ? 'bg-blue-500/10' : 'bg-zinc-700'
                  )}
                >
                  <Mic
                    className={cn(
                      'h-4 w-4',
                      microphoneEnabled ? 'text-blue-400' : 'text-zinc-500'
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Microphone</p>
                  <p className="text-xs text-zinc-500">
                    Record your voice and responses
                  </p>
                </div>
              </div>
              <Toggle
                checked={microphoneEnabled}
                onChange={setMicrophoneEnabled}
              />
            </div>

            {/* System Audio Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-800/50 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    systemAudioEnabled ? 'bg-blue-500/10' : 'bg-zinc-700'
                  )}
                >
                  <Volume2
                    className={cn(
                      'h-4 w-4',
                      systemAudioEnabled ? 'text-blue-400' : 'text-zinc-500'
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">System Audio</p>
                  <p className="text-xs text-zinc-500">
                    Capture interviewer's audio from computer
                  </p>
                </div>
              </div>
              <Toggle
                checked={systemAudioEnabled}
                onChange={setSystemAudioEnabled}
              />
            </div>
          </div>

          {!microphoneEnabled && !systemAudioEnabled && (
            <p className="text-xs text-amber-400">
              At least one audio source must be enabled
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-4">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">
            Meeting Configuration
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="blue-subtle" size="sm">
              <Clock className="h-3 w-3 mr-1" />
              {selectedDuration} min
            </Badge>
            {microphoneEnabled && (
              <Badge variant="blue" size="sm">
                <Mic className="h-3 w-3 mr-1" />
                Microphone
              </Badge>
            )}
            {systemAudioEnabled && (
              <Badge variant="blue" size="sm">
                <Volume2 className="h-3 w-3 mr-1" />
                System Audio
              </Badge>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleStartMeeting}
          disabled={!isFormValid || isCreating}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
        >
          {isCreating ? (
            'Starting Meeting...'
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export { CreateMeeting }
