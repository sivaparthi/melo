import { canonicalUserPair } from './friends.service';

describe('canonicalUserPair', () => {
  it('orders either direction into the same pair', () => {
    expect(canonicalUserPair('user-b', 'user-a')).toEqual(['user-a', 'user-b']);
    expect(canonicalUserPair('user-a', 'user-b')).toEqual(['user-a', 'user-b']);
  });
});
