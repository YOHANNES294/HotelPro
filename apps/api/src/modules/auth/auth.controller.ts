import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema, refreshTokenSchema } from '@hotelpro/shared';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated, req.ip, req.headers['user-agent']);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated, req.ip, req.headers['user-agent']);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const result = await AuthService.refreshToken(validated.refreshToken);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }
      return res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response) {
    return res.json({
      session: req.userSession,
    });
  }
}
