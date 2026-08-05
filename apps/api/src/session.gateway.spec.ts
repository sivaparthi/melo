import type { CurrentUser } from '@emote/contracts';
import { AuthService } from './auth/auth.service';
import { RoomsService } from './rooms/rooms.service';
import { SessionGateway } from './session.gateway';

const user: CurrentUser = {
  id: 'user-a',
  email: 'a@example.com',
  username: 'user_a',
  displayName: 'User A',
  avatarStyle: 'female',
  skinTone: 'medium',
  imageUrl: null,
};

function socketWithCookie(cookie?: string) {
  return {
    id: 'socket-a',
    handshake: { headers: { cookie } },
  } as unknown as Parameters<SessionGateway['joinRoom']>[1];
}

describe('SessionGateway private room joins', () => {
  const authenticate = jest.fn();
  const requireMembership = jest.fn();
  const gateway = new SessionGateway(
    { authenticate } as unknown as AuthService,
    { requireMembership } as unknown as RoomsService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects a join without an authenticated session', async () => {
    authenticate.mockResolvedValue(null);

    await expect(
      gateway.joinRoom({ roomId: 'private-room' }, socketWithCookie()),
    ).resolves.toEqual({
      ok: false,
      error: 'Sign in before joining a room.',
    });
    expect(requireMembership).not.toHaveBeenCalled();
  });

  it('rejects an authenticated user who is not a room member', async () => {
    authenticate.mockResolvedValue(user);
    requireMembership.mockRejectedValue(new Error('not a member'));

    await expect(
      gateway.joinRoom(
        { roomId: 'private-room' },
        socketWithCookie('melo_session=session-token'),
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'You are not a member of this room.',
    });
    expect(requireMembership).toHaveBeenCalledWith('private-room', user.id);
  });
});
