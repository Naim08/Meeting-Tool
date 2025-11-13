import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border border-input',
        // Blue accent variants
        blue: 'bg-blue-500 text-white',
        'blue-outline': 'border border-blue-500 text-blue-500 dark:text-blue-400',
        'blue-subtle': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        // Status variants
        active: 'bg-blue-500 text-white animate-pulse-blue',
        inactive: 'bg-zinc-700 text-zinc-400',
        success: 'bg-green-500 text-white',
        warning: 'bg-yellow-500 text-white',
        error: 'bg-red-500 text-white',
        // Premium/Free variants
        premium: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
        free: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
      },
      size: {
        default: 'px-2.5 py-0.5',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
