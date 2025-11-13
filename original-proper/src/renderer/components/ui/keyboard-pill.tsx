import * as React from 'react'
import { cn } from '@/lib/utils'

export interface KeyboardPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  keys: string[]
  variant?: 'default' | 'glow' | 'minimal'
}

const KeyboardPill = React.forwardRef<HTMLSpanElement, KeyboardPillProps>(
  ({ keys, variant = 'default', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1',
          className
        )}
        {...props}
      >
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd
              className={cn(
                'inline-flex items-center justify-center rounded font-mono text-xs font-medium transition-all',
                {
                  // Default variant - subtle background
                  'bg-zinc-100 dark:bg-zinc-800 px-2 py-1 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300':
                    variant === 'default',
                  // Glow variant - blue accent with glow effect
                  'bg-blue-500/10 px-3 py-1.5 text-blue-500 dark:text-blue-400 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/10 rounded-full':
                    variant === 'glow',
                  // Minimal variant - just text
                  'bg-transparent text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5':
                    variant === 'minimal',
                }
              )}
            >
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-zinc-400 dark:text-zinc-500 text-xs">+</span>
            )}
          </React.Fragment>
        ))}
      </span>
    )
  }
)

KeyboardPill.displayName = 'KeyboardPill'

export { KeyboardPill }
