import { useEffect, useState, type FormEvent } from 'react'
import type { FriendRequestView, PublicProfile } from '@emote/contracts'
import { Check, MessageCircle, Search, UserMinus, UserPlus, X } from 'lucide-react'
import { apiRequest } from '../../lib/api'

interface FriendsPanelProps {
  onOpenConversation: (friend: PublicProfile) => Promise<void>
}

export function FriendsPanel({ onOpenConversation }: FriendsPanelProps) {
  const [friends, setFriends] = useState<PublicProfile[]>([])
  const [requests, setRequests] = useState<FriendRequestView[]>([])
  const [username, setUsername] = useState('')
  const [foundUser, setFoundUser] = useState<PublicProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openingFriendId, setOpeningFriendId] = useState<string | null>(null)

  async function refresh() {
    const [nextFriends, nextRequests] = await Promise.all([
      apiRequest<PublicProfile[]>('/friends'), apiRequest<FriendRequestView[]>('/friends/requests'),
    ])
    setFriends(nextFriends)
    setRequests(nextRequests)
  }

  useEffect(() => {
    let active = true
    function loadFriends() {
      void Promise.all([
        apiRequest<PublicProfile[]>('/friends'),
        apiRequest<FriendRequestView[]>('/friends/requests'),
      ]).then(([nextFriends, nextRequests]) => {
        if (!active) return
        setFriends(nextFriends)
        setRequests(nextRequests)
      }).catch(() => {
        if (active) setError('Could not load friends.')
      })
    }
    loadFriends()
    const refreshTimer = window.setInterval(loadFriends, 5_000)
    window.addEventListener('focus', loadFriends)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', loadFriends)
    }
  }, [])

  async function search(event: FormEvent) {
    event.preventDefault(); setError(null); setFoundUser(null)
    try { setFoundUser(await apiRequest<PublicProfile>(`/friends/search?username=${encodeURIComponent(username)}`)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Search failed.') }
  }

  async function sendRequest() {
    if (!foundUser) return
    try {
      await apiRequest('/friends/requests', { method: 'POST', body: JSON.stringify({ username: foundUser.username }) })
      setFoundUser(null); setUsername(''); await refresh()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Request failed.') }
  }

  async function resolveRequest(requestId: string, action: 'accept' | 'decline') {
    await apiRequest(`/friends/requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    await refresh()
  }

  async function cancelRequest(requestId: string) {
    await apiRequest(`/friends/requests/${requestId}`, { method: 'DELETE' }); await refresh()
  }

  async function unfriend(friendId: string) {
    await apiRequest(`/friends/${friendId}`, { method: 'DELETE' }); await refresh()
  }

  async function openConversation(friend: PublicProfile) {
    setOpeningFriendId(friend.id)
    setError(null)
    try {
      await onOpenConversation(friend)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open conversation.')
    } finally {
      setOpeningFriendId(null)
    }
  }

  return (
    <section className="friends-section" aria-labelledby="friends-title">
      <div><span className="eyebrow">Your circle</span><h2 id="friends-title">Friends</h2></div>
      <form className="friend-search" onSubmit={search}>
        <label htmlFor="friend-username">Find by username</label>
        <div><input id="friend-username" placeholder="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} /><button type="submit" aria-label="Search"><Search size={16} /></button></div>
      </form>
      {error && <p className="friend-error" role="alert">{error}</p>}
      {foundUser && <div className="friend-row"><Profile user={foundUser} /><button className="row-action" type="button" title="Send friend request" onClick={() => void sendRequest()}><UserPlus size={16} /></button></div>}
      {requests.length > 0 && <div className="friend-list"><h3>Requests</h3>{requests.map((request) => <div className="friend-row" key={request.id}><Profile user={request.user} />
        <div className="row-actions">{request.direction === 'incoming' ? <><button className="row-action" type="button" title="Accept" onClick={() => void resolveRequest(request.id, 'accept')}><Check size={15} /></button><button className="row-action" type="button" title="Decline" onClick={() => void resolveRequest(request.id, 'decline')}><X size={15} /></button></> : <button className="row-action" type="button" title="Cancel request" onClick={() => void cancelRequest(request.id)}><X size={15} /></button>}</div>
      </div>)}</div>}
      <div className="friend-list"><h3>Friends ({friends.length})</h3>{friends.length === 0 ? <p className="empty-copy">Search for a username to build your circle.</p> : friends.map((friend) => <div className="friend-row friend-row--clickable" key={friend.id}>
        <button className="friend-chat-button" type="button" disabled={openingFriendId === friend.id} onClick={() => void openConversation(friend)}>
          <Profile user={friend} /><MessageCircle size={15} />
          <span className="sr-only">Open conversation with {friend.displayName}</span>
        </button>
        <button className="row-action" type="button" title={`Unfriend ${friend.displayName}`} aria-label={`Unfriend ${friend.displayName}`} onClick={() => void unfriend(friend.id)}><UserMinus size={15} /></button>
      </div>)}</div>
    </section>
  )
}

function Profile({ user }: { user: PublicProfile }) {
  return <div className="friend-profile"><span className={`friend-avatar friend-avatar--${user.avatarStyle}`}>{user.displayName.slice(0, 1)}</span><span><strong>{user.displayName}</strong><small>@{user.username}</small></span></div>
}