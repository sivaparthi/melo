import { useState, type FormEvent } from 'react'
import type { AvatarStyle } from '@emote/contracts'
import { LogIn } from 'lucide-react'
import { API_URL } from '../../lib/api'

interface AuthScreenProps {
  error: string | null
  onDevelopmentLogin: (displayName: string, avatarStyle: AvatarStyle) => Promise<void>
}

export function AuthScreen({ error, onDevelopmentLogin }: AuthScreenProps) {
  const [displayName, setDisplayName] = useState('Alex')
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('female')

  function submit(event: FormEvent) {
    event.preventDefault()
    void onDevelopmentLogin(displayName, avatarStyle)
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand auth-brand"><span className="brand-mark" aria-hidden="true">m</span><span>Melo</span></div>
        <div><span className="eyebrow">Private by design</span><h1 id="auth-title">Meet your people where they are.</h1><p>Share how you feel with friends in a live, expressive circle.</p></div>
        {error && <div className="notice" role="alert">{error}</div>}
        <a className="google-button" href={`${API_URL}/auth/google`}><LogIn size={18} /> Continue with Google</a>
        <div className="auth-divider"><span>Local development</span></div>
        <form className="dev-login" onSubmit={submit}>
          <label className="name-field">Display name<input required maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <fieldset className="avatar-choice"><legend>Avatar</legend>
            <button className={avatarStyle === 'female' ? 'selected' : ''} type="button" aria-pressed={avatarStyle === 'female'} onClick={() => setAvatarStyle('female')}><span className="mini-avatar mini-avatar--female" aria-hidden="true" />Female</button>
            <button className={avatarStyle === 'male' ? 'selected' : ''} type="button" aria-pressed={avatarStyle === 'male'} onClick={() => setAvatarStyle('male')}><span className="mini-avatar mini-avatar--male" aria-hidden="true" />Male</button>
          </fieldset>
          <button className="primary-button" type="submit">Sign in for development</button>
        </form>
      </section>
    </main>
  )
}