'use client'

import { useEffect } from 'react'

export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `user-tz=${tz};path=/;max-age=31536000;samesite=lax`
  }, [])
  return null
}
