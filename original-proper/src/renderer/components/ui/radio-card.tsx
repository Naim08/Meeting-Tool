import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { Lock } from 'lucide-react'

export interface RadioCardOption {
  id: string
  label: string
  description?: string
  badge?: {
    text: string
    variant?: 'free' | 'premium' | 'blue' | 'default'
  }
  disabled?: boolean
  locked?: boolean
}

export interface RadioCardGroupProps {
  options: RadioCardOption[]
  value: string
  onChange: (value: string) => void
  name: string
  className?: string
}

const RadioCardGroup = React.forwardRef<HTMLDivElement, RadioCardGroupProps>(
  ({ options, value, onChange, name, className }, ref) => {
    return (
      <div ref={ref} className={cn('grid gap-3', className)} role="radiogroup">
        {options.map((option) => (
          <RadioCard
            key={option.id}
            option={option}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            name={name}
          />
        ))}
      </div>
    )
  }
)

RadioCardGroup.displayName = 'RadioCardGroup'

interface RadioCardProps {
  option: RadioCardOption
  checked: boolean
  onChange: () => void
  name: string
}

const RadioCard = React.forwardRef<HTMLLabelElement, RadioCardProps>(
  ({ option, checked, onChange, name }, ref) => {
    const { id, label, description, badge, disabled, locked } = option

    const isDisabled = disabled || locked

    return (
      <label
        ref={ref}
        htmlFor={`${name}-${id}`}
        className={cn(
          'relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all duration-200',
          {
            // Checked state - blue accent
            'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10':
              checked && !isDisabled,
            // Unchecked state
            'border-white/10 hover:border-blue-500/50 hover:bg-white/5':
              !checked && !isDisabled,
            // Disabled/locked state
            'cursor-not-allowed opacity-60 border-white/10': isDisabled,
          }
        )}
      >
        <input
          type="radio"
          id={`${name}-${id}`}
          name={name}
          value={id}
          checked={checked}
          onChange={onChange}
          disabled={isDisabled}
          className="sr-only"
        />
        {/* Custom radio indicator */}
        <div
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-all duration-200',
            {
              'border-blue-500 bg-blue-500': checked && !isDisabled,
              'border-zinc-600': !checked,
            }
          )}
        >
          {checked && !isDisabled && (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn('font-medium', {
                'text-blue-400': checked && !isDisabled,
                'text-foreground': !checked && !isDisabled,
                'text-muted-foreground': isDisabled,
              })}
            >
              {label}
            </span>
            {badge && (
              <Badge variant={badge.variant || 'default'} size="sm">
                {badge.text}
              </Badge>
            )}
            {locked && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </label>
    )
  }
)

RadioCard.displayName = 'RadioCard'

export { RadioCardGroup, RadioCard }
