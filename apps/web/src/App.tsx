import { LogOut, Settings, UserRound, UsersRound, Wifi, WifiOff, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AvatarStyle, CurrentUser, PublicProfile, RoomSummary, SkinTone, UpdateProfile } from '@emote/contracts'
import './App.css'
import { EmotionAvatar } from './components/EmotionAvatar'
import { AuthScreen } from './features/auth/AuthScreen'
import { useAuth } from './features/auth/useAuth'
import { FriendsPanel } from './features/friends/FriendsPanel'
import { RoomsPanel } from './features/rooms/RoomsPanel'
import { EmotionPalette } from './features/session/EmotionPalette'
import { useSessionSocket } from './features/session/useSessionSocket'
import { apiRequest } from './lib/api'

const skinTones: readonly { id: SkinTone; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'mediumLight', label: 'Medium light' },
  { id: 'medium', label: 'Medium' },
  { id: 'mediumDark', label: 'Medium dark' },
  { id: 'dark', label: 'Dark' },
]

function App() {
  const auth = useAuth()

  if (auth.loading) return <div className="auth-loading"><span className="joining-pulse" />Loading Melo...</div>
  if (!auth.user) return <AuthScreen error={auth.error} onDevelopmentLogin={auth.developmentLogin} />

  return <SessionApp user={auth.user} authError={auth.error} onUpdateProfile={auth.updateProfile} onLogout={auth.logout} />
}

interface SessionAppProps {
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  authError: string | null
  onUpdateProfile: ReturnType<typeof useAuth>['updateProfile']
  onLogout: ReturnType<typeof useAuth>['logout']
}

function SessionApp({ user, authError, onUpdateProfile, onLogout }: SessionAppProps) {
  const [activeRoom, setActiveRoom] = useState<RoomSummary | null>(null)
  const [roomsRefreshKey, setRoomsRefreshKey] = useState(0)
  const [profileOpen, setProfileOpen] = useState(!user.profileCompleted)
  const accountMenuRef = useRef<HTMLDetailsElement>(null)
  const { participants, connectionState, error, setEmotion } = useSessionSocket(activeRoom?.id ?? null)
  const ownEmotion = participants.find((participant) => participant.id === user.id)?.emotion ?? 'neutral'

  function openProfileSettings() {
    accountMenuRef.current?.removeAttribute('open')
    setProfileOpen(true)
  }

  async function openFriendConversation(friend: PublicProfile) {
    const room = await apiRequest<RoomSummary>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ memberIds: [friend.id] }),
    })
    setActiveRoom(room)
    setRoomsRefreshKey((current) => current + 1)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#session" aria-label="Melo session home">
          <span className="brand-mark" aria-hidden="true">m</span><span>Melo</span>
        </a>
        <div className="room-title"><span className="eyebrow">Private conversation</span><strong>{activeRoom?.title ?? 'Choose a room'}</strong></div>
        <div className="topbar-actions">
          <span className={`connection-pill connection-pill--${connectionState}`}>
            {connectionState === 'connected' ? <Wifi size={15} /> : <WifiOff size={15} />}
            {connectionState === 'connected' ? 'Live' : connectionState}
          </span>
          <button className="icon-button" type="button" title="Profile settings" aria-label="Open profile settings" onClick={openProfileSettings}><Settings size={19} /></button>
          <details className="account-menu" ref={accountMenuRef}>
            <summary className="profile-button" title="Open account menu" aria-label="Open account menu">{user.displayName.slice(0, 1)}</summary>
            <div className="account-popover">
              <div className="account-identity">
                <span className="account-avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</span>
                <span><strong>{user.displayName}</strong><small>@{user.username}</small></span>
              </div>
              <span className="account-email">{user.email}</span>
              <button type="button" onClick={openProfileSettings}><UserRound size={16} />Profile settings</button>
              <button className="account-signout" type="button" onClick={() => void onLogout()}><LogOut size={16} />Sign out</button>
            </div>
          </details>
        </div>
      </header>

      <main id="session" className="session-layout">
        <section className="session-stage" aria-labelledby="stage-title">
          <div className="stage-heading">
            <div><span className="eyebrow">{activeRoom ? 'In the room' : 'Your conversations'}</span><h1 id="stage-title">{activeRoom ? 'How is everyone feeling?' : 'Choose who to be with'}</h1></div>
            <span className="participant-count"><UsersRound size={17} />{participants.length} / 12</span>
          </div>
          {(error || authError) && <div className="notice" role="alert">{error ?? authError}</div>}
          {!activeRoom ? <div className="no-room-state"><MessageCircleIcon /><strong>No room selected</strong><span>Open a private conversation from the panel.</span></div> : <div className="avatar-grid" aria-live="polite">
            {participants.length > 0 ? participants.map((participant) => (
              <article className="participant" key={participant.id}>
                <EmotionAvatar participant={participant.id === user.id ? { ...participant, avatarStyle: user.avatarStyle, skinTone: user.skinTone } : participant} />
                <div className="participant-meta">
                  <strong>{participant.id === user.id ? `${participant.displayName} (you)` : participant.displayName}</strong>
                  <span>{participant.connected ? 'Present' : 'Reconnecting'}</span>
                </div>
              </article>
            )) : <div className="joining-state"><span className="joining-pulse" aria-hidden="true" />Joining the circle...</div>}
          </div>}
        </section>

        <aside className="profile-panel" aria-label="Conversations and friends">
          <RoomsPanel activeRoomId={activeRoom?.id ?? null} refreshKey={roomsRefreshKey} onSelect={setActiveRoom} />
          <FriendsPanel onOpenConversation={openFriendConversation} />
          <div className="privacy-note"><strong>Your feelings stay yours.</strong><span>Only you can see your recap after this session.</span></div>
          <button className="leave-button" type="button" onClick={() => void onLogout()}><LogOut size={17} /> Sign out</button>
        </aside>
      </main>

      <EmotionPalette selectedEmotion={ownEmotion} disabled={!activeRoom || connectionState !== 'connected'} onSelect={setEmotion} />
      {profileOpen && (
        <ProfileSettings
          user={user}
          required={!user.profileCompleted}
          error={authError}
          onClose={() => setProfileOpen(false)}
          onSave={onUpdateProfile}
        />
      )}
    </div>
  )
}

interface ProfileSettingsProps {
  user: CurrentUser
  required: boolean
  error: string | null
  onClose: () => void
  onSave: (changes: UpdateProfile) => Promise<boolean>
}

function ProfileSettings({ user, required, error, onClose, onSave }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [username, setUsername] = useState(user.username)
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(user.avatarStyle)
  const [skinTone, setSkinTone] = useState<SkinTone>(user.skinTone)
  const [saving, setSaving] = useState(false)

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const saved = await onSave({ displayName, username, avatarStyle, skinTone })
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <div className="profile-dialog-backdrop" role="presentation">
      <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-settings-title">
        <div className="profile-dialog-heading">
          <div><span className="eyebrow">{required ? 'Welcome to Melo' : 'Your profile'}</span><h2 id="profile-settings-title">{required ? 'Set up your profile' : 'Profile settings'}</h2></div>
          {!required && <button className="icon-button" type="button" title="Close" aria-label="Close profile settings" onClick={onClose}><X size={18} /></button>}
        </div>
        {required && <p className="profile-intro">Choose how your name and avatar appear before continuing.</p>}
        {error && <div className="notice profile-dialog-error" role="alert">{error}</div>}
        <form className="profile-settings-form" onSubmit={saveProfile}>
          <div className="profile-name-fields">
            <label className="name-field">Display name
              <input autoFocus value={displayName} required maxLength={40} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label className="name-field">Username
              <input value={username} required minLength={3} maxLength={24} pattern="[a-z0-9_]+" title="Use only lowercase letters, numbers, and underscores." onChange={(event) => setUsername(event.target.value.toLowerCase())} />
            </label>
          </div>
          <fieldset className="avatar-choice">
            <legend>Avatar</legend>
            <button className={avatarStyle === 'female' ? 'selected' : ''} type="button" aria-pressed={avatarStyle === 'female'} onClick={() => setAvatarStyle('female')}><span className="mini-avatar mini-avatar--female" aria-hidden="true" />Female</button>
            <button className={avatarStyle === 'male' ? 'selected' : ''} type="button" aria-pressed={avatarStyle === 'male'} onClick={() => setAvatarStyle('male')}><span className="mini-avatar mini-avatar--male" aria-hidden="true" />Male</button>
          </fieldset>
          <fieldset className="skin-tone-choice">
            <legend>Skin tone</legend>
            {skinTones.map((tone) => (
              <button className={skinTone === tone.id ? 'selected' : ''} data-tone={tone.id} key={tone.id} type="button" aria-label={tone.label} aria-pressed={skinTone === tone.id} title={tone.label} onClick={() => setSkinTone(tone.id)}>
                <span aria-hidden="true" />
              </button>
            ))}
          </fieldset>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
        </form>
      </section>
    </div>
  )
}

function MessageCircleIcon() {
  return <span className="no-room-mark" aria-hidden="true">m</span>
}

export default App