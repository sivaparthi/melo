import { useEffect, useState } from 'react'
import type { AvatarStyle, CurrentUser, UpdateProfile } from '@emote/contracts'
import { apiRequest } from '../../lib/api'

export function useAuth() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<CurrentUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function developmentLogin(displayName: string, avatarStyle: AvatarStyle) {
    setError(null)
    try {
      setUser(await apiRequest<CurrentUser>('/auth/dev-login', {
        method: 'POST', body: JSON.stringify({ displayName, avatarStyle }),
      }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.')
    }
  }

  async function updateProfile(changes: UpdateProfile) {
    setError(null)
    try {
      const updated = await apiRequest<CurrentUser>('/auth/me', {
        method: 'PATCH', body: JSON.stringify(changes),
      })
      setUser(updated)
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Profile update failed.')
      return false
    }
  }

  async function logout() {
    await apiRequest<void>('/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return { user, loading, error, developmentLogin, updateProfile, logout }
}