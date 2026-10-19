import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserSession, AuthTokens } from '@hotelpro/shared';
import { config } from '../config/index.js';

export function generateAccessToken(session: UserSession): string {
  return jwt.sign({ ...session }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
}

export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.refreshExpiresInDays);

  return { token, hash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string): UserSession {
  return jwt.verify(token, config.jwtSecret) as UserSession;
}
