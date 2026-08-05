import { useEffect, useState } from 'react'
import type { PublicProfile, RoomSummary } from '@emote/contracts'
import { Check, MessageCircle, Plus, UserPlus, UsersRound, X } from 'lucide-react'
import { apiRequest } from '../../lib/api'

interface RoomsPanelProps {
  activeRoomId: string | null
  refreshKey: number
  onSelect: (room: RoomSummary) => void
}

export function RoomsPanel({ activeRoomId, refreshKey, onSelect }: RoomsPanelProps) {
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [friends, setFriends] = useState<PublicProfile[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([
      apiRequest<RoomSummary[]>('/rooms'),
      apiRequest<PublicProfile[]>('/friends'),
    ]).then(([nextRooms, nextFriends]) => {
      setRooms(nextRooms)
      setFriends(nextFriends)
    }).catch(() => setError('Could not load conversations.'))
  }, [refreshKey])

  async function createRoom(memberIds: string[], roomTitle?: string) {
    try {
      setError(null)
      const room = await apiRequest<RoomSummary>('/rooms', {
        method: 'POST',
        body: JSON.stringify({ memberIds, title: roomTitle || undefined }),
      })
      setRooms((current) => [room, ...current.filter((item) => item.id !== room.id)])
      setCreatingGroup(false)
      setSelectedIds([])
      setTitle('')
      onSelect(room)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create room.')
    }
  }

  async function addMember(userId: string) {
    if (!activeRoomId) return
    try {
      const room = await apiRequest<RoomSummary>(`/rooms/${activeRoomId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      })
      setRooms((current) => current.map((item) => item.id === room.id ? room : item))
      onSelect(room)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add friend.')
    }
  }

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? null
  const availableFriends = friends.filter((friend) => !activeRoom?.members.some((member) => member.id === friend.id))

  return (
    <section className="rooms-section" aria-labelledby="rooms-title">
      <div className="section-heading">
        <div><span className="eyebrow">Private spaces</span><h2 id="rooms-title">Conversations</h2></div>
        <button className="row-action" type="button" title="Create group" onClick={() => setCreatingGroup((open) => !open)}>{creatingGroup ? <X size={16} /> : <Plus size={16} />}</button>
      </div>
      {error && <p className="friend-error" role="alert">{error}</p>}
      {creatingGroup && <div className="group-builder">
        <label>Group name<input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} placeholder="Weekend circle" /></label>
        <span>Choose friends</span>
        {friends.map((friend) => <label className="member-choice" key={friend.id}>
          <input type="checkbox" checked={selectedIds.includes(friend.id)} onChange={() => setSelectedIds((ids) => ids.includes(friend.id) ? ids.filter((id) => id !== friend.id) : [...ids, friend.id])} />
          <span>{friend.displayName}</span>{selectedIds.includes(friend.id) && <Check size={14} />}
        </label>)}
        <button className="create-room-button" type="button" disabled={!title.trim() || selectedIds.length < 2} onClick={() => void createRoom(selectedIds, title)}><UsersRound size={16} />Create group</button>
      </div>}
      <div className="room-list">
        {rooms.map((room) => <button className={`room-row${room.id === activeRoomId ? ' room-row--active' : ''}`} type="button" key={room.id} onClick={() => onSelect(room)}>
          {room.kind === 'direct' ? <MessageCircle size={17} /> : <UsersRound size={17} />}
          <span><strong>{room.title}</strong><small>{room.members.length} {room.members.length === 1 ? 'member' : 'members'}</small></span>
        </button>)}
        {rooms.length === 0 && <p className="empty-copy">Start a private conversation with a friend.</p>}
      </div>
      {activeRoom && availableFriends.length > 0 && <div className="quick-start"><h3>Add to this room</h3>{availableFriends.map((friend) => <button type="button" key={friend.id} onClick={() => void addMember(friend.id)}><UserPlus size={15} /><span>{friend.displayName}</span></button>)}</div>}
    </section>
  )
}