import { z } from 'zod';
import { Role } from '../types/auth.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  organizationSlug: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  organizationName: z.string().min(2),
  phone: z.string().optional(),
  branchName: z.string().min(2).default('Main Branch'),
  currency: z.string().default('ETB'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.nativeEnum(Role),
  branchId: z.string().uuid().optional().nullable(),
  phone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
