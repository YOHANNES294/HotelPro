import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const session = verifyAccessToken(token);
    req.userSession = session;
    req.tenantId = session.organizationId;
    if (session.branchId) {
      req.branchId = session.branchId;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired access token.' });
  }
}
