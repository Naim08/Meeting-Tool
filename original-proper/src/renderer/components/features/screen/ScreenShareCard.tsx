import * as React from 'react'
import { Monitor, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ScreenShareCardProps {
  className?: string
  selectedScreen?: { name: string } | null
  onSelectScreen?: () => void
}

const ScreenShareCard: React.FC<ScreenShareCardProps> = ({
  className,
  selectedScreen,
  onSelectScreen,
}) => {
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
            <Monitor className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Screen Sharing</h3>
        </div>
        {selectedScreen && (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {/* Current Selection */}
        <div className="space-y-2">
          <span className="text-sm text-zinc-400">Selected Source</span>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 border border-white/5">
            {selectedScreen ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-sm font-medium text-zinc-300 truncate">
                  {selectedScreen.name}
                </span>
              </>
            ) : (
              <span className="text-sm text-zinc-500">No screen selected</span>
            )}
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs text-zinc-500">
          Select a screen or window to capture. Screenshots will be taken from
          this source when you use the screengrab hotkey.
        </p>

        {/* Action Button */}
        <Button
          onClick={onSelectScreen}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Monitor className="h-4 w-4 mr-2" />
          {selectedScreen ? 'Change Screen Source' : 'Select Screen Share'}
        </Button>
      </div>
    </div>
  )
}

export { ScreenShareCard }
