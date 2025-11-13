import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LevelBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Level value between 0 and 100 */
  level: number
  /** Show animated pulse when active */
  animated?: boolean
  /** Orientation of the bar */
  orientation?: 'horizontal' | 'vertical'
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Color variant */
  variant?: 'blue' | 'gradient' | 'green' | 'red'
}

const LevelBar = React.forwardRef<HTMLDivElement, LevelBarProps>(
  (
    {
      level,
      animated = false,
      orientation = 'horizontal',
      size = 'default',
      variant = 'blue',
      className,
      ...props
    },
    ref
  ) => {
    // Clamp level between 0 and 100
    const clampedLevel = Math.min(100, Math.max(0, level))

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-full bg-zinc-800',
          {
            // Size variants for horizontal
            'h-1 w-full': orientation === 'horizontal' && size === 'sm',
            'h-2 w-full': orientation === 'horizontal' && size === 'default',
            'h-3 w-full': orientation === 'horizontal' && size === 'lg',
            // Size variants for vertical
            'w-1 h-full': orientation === 'vertical' && size === 'sm',
            'w-2 h-full': orientation === 'vertical' && size === 'default',
            'w-3 h-full': orientation === 'vertical' && size === 'lg',
          },
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'rounded-full transition-all duration-100 ease-out',
            {
              // Color variants
              'bg-blue-500': variant === 'blue',
              'bg-gradient-to-r from-blue-500 to-blue-400': variant === 'gradient',
              'bg-green-500': variant === 'green',
              'bg-red-500': variant === 'red',
              // Animated pulse effect
              'animate-pulse': animated && clampedLevel > 0,
            },
            orientation === 'horizontal' ? 'h-full' : 'w-full'
          )}
          style={
            orientation === 'horizontal'
              ? { width: `${clampedLevel}%` }
              : { height: `${clampedLevel}%` }
          }
        />
        {/* Glow effect for active state */}
        {animated && clampedLevel > 20 && (
          <div
            className={cn(
              'absolute inset-0 rounded-full opacity-50',
              {
                'bg-blue-500/30': variant === 'blue' || variant === 'gradient',
                'bg-green-500/30': variant === 'green',
                'bg-red-500/30': variant === 'red',
              }
            )}
            style={
              orientation === 'horizontal'
                ? { width: `${clampedLevel}%` }
                : { height: `${clampedLevel}%` }
            }
          />
        )}
      </div>
    )
  }
)

LevelBar.displayName = 'LevelBar'

export { LevelBar }
