'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { User as UserIcon } from 'lucide-react'

interface ProfileButtonProps {
  onClick: () => void
}

export function ProfileButton({ onClick }: ProfileButtonProps) {
  const [profile, setProfile] = useState<{ name: string; avatarColor: string } | null>(null)

  useEffect(() => {
    // Fetch profile on mount to populate the avatar
    fetch('/api/profile/init', { method: 'POST' })
      .then(() => fetch('/api/me'))
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setProfile({ name: d.user.name, avatarColor: d.user.avatarColor })
      })
      .catch(() => {})
  }, [])

  const initials = profile?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full hover:bg-muted/60 p-1 pr-2 transition-colors"
      aria-label="Open profile"
    >
      <span
        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
        style={{ backgroundColor: profile?.avatarColor || '#10b981' }}
      >
        {profile ? initials : <UserIcon className="h-4 w-4" />}
      </span>
    </button>
  )
}
