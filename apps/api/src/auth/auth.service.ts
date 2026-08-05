import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import {
  type AvatarStyle as AvatarStyleValue,
  type CurrentUser,
  updateProfileSchema,
} from '@emote/contracts';
import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { GoogleIdentity } from './auth.types';

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? 'melo_session';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveGoogleUser(identity: GoogleIdentity): Promise<CurrentUser> {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: identity.providerAccountId,
        },
      },
      include: { user: true },
    });
    if (account) {
      const user = await this.prisma.user.update({
        where: { id: account.userId },
        data: {
          displayName: identity.displayName,
          imageUrl: identity.imageUrl,
        },
      });
      return this.toCurrentUser(user);
    }

    let user = await this.prisma.user.findUnique({
      where: { email: identity.email },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: identity.email,
          username: await this.availableUsername(
            identity.email.split('@')[0] ?? identity.displayName,
          ),
          displayName: identity.displayName,
          imageUrl: identity.imageUrl,
        },
      });
    }
    await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerAccountId: identity.providerAccountId,
      },
    });
    return this.toCurrentUser(user);
  }

  async createDevelopmentUser(
    displayName: string,
    avatarStyle: AvatarStyleValue,
  ): Promise<CurrentUser> {
    if (process.env.NODE_ENV === 'production')
      throw new ForbiddenException('Development sign-in is disabled.');
    const slug =
      displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 16) || 'developer';
    const email = `${slug}@dev.melo.local`;
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { displayName, avatarStyle: avatarStyle },
      create: {
        email,
        username: await this.availableUsername(slug),
        displayName,
        avatarStyle: avatarStyle,
      },
    });
    return this.toCurrentUser(user);
  }

  async createSession(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const ttlDays = Number(process.env.SESSION_TTL_DAYS ?? 30);
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
    await this.prisma.authSession.create({
      data: { userId, tokenHash: this.hashToken(token), expiresAt },
    });
    return { token, expiresAt };
  }

  async authenticate(token: string): Promise<CurrentUser | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session)
        await this.prisma.authSession.delete({ where: { id: session.id } });
      return null;
    }
    return this.toCurrentUser(session.user);
  }

  async revokeSession(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.authSession.deleteMany({
      where: { tokenHash: this.hashToken(token) },
    });
  }

  async updateProfile(userId: string, input: unknown): Promise<CurrentUser> {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success)
      throw new ConflictException(
        parsed.error.issues[0]?.message ?? 'Invalid profile.',
      );
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...parsed.data,
          avatarStyle: parsed.data.avatarStyle,
        },
      });
      return this.toCurrentUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('That username is already taken.');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Profile not found.');
      }
      throw error;
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  readSessionCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[SESSION_COOKIE_NAME];
  }

  private async availableUsername(seed: string): Promise<string> {
    const base = seed
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 18)
      .padEnd(3, '0');
    for (let suffix = 0; suffix < 100; suffix += 1) {
      const username = suffix === 0 ? base : `${base}_${suffix}`;
      const exists = await this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (!exists) return username;
    }
    return `user_${randomBytes(5).toString('hex')}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toCurrentUser(user: User): CurrentUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarStyle: user.avatarStyle,
      imageUrl: user.imageUrl,
    };
  }
}
