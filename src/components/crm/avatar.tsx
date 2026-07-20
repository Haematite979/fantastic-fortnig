'use client'

import { cn } from '@/lib/utils'
import { initials } from '@/lib/crm-store'

interface AvatarProps {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CustomerAvatar({ name, color = '#10b981', size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'h-7 w-7 text-[11px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold text-white shadow-sm shrink-0',
        sizes[size],
        className
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
