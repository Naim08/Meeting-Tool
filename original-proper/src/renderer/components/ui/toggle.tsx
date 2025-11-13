import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'sm' | 'default' | 'lg'
  label?: string
  description?: string
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, size = 'default', label, description, className, disabled, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled) {
        onChange(!checked)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleClick()
      }
    }

    const toggleId = React.useId()

    return (
      <div className={cn('flex items-center gap-3', className)}>
        <button
          ref={ref}
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={label ? `${toggleId}-label` : undefined}
          aria-describedby={description ? `${toggleId}-description` : undefined}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background',
            {
              // Size variants
              'h-5 w-9': size === 'sm',
              'h-6 w-11': size === 'default',
              'h-7 w-14': size === 'lg',
              // Checked state
              'bg-blue-500': checked,
              'bg-zinc-700': !checked,
              // Disabled state
              'cursor-not-allowed opacity-50': disabled,
            }
          )}
          {...props}
        >
          <span
            className={cn(
              'pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
              {
                // Size variants for thumb
                'h-3 w-3': size === 'sm',
                'h-4 w-4': size === 'default',
                'h-5 w-5': size === 'lg',
                // Position based on state and size
                'translate-x-5': checked && size === 'sm',
                'translate-x-6': checked && size === 'default',
                'translate-x-8': checked && size === 'lg',
                'translate-x-1': !checked,
              }
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                id={`${toggleId}-label`}
                htmlFor={toggleId}
                className={cn(
                  'text-sm font-medium cursor-pointer',
                  disabled ? 'text-muted-foreground cursor-not-allowed' : 'text-foreground'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                id={`${toggleId}-description`}
                className="text-xs text-muted-foreground"
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

Toggle.displayName = 'Toggle'

export { Toggle }
