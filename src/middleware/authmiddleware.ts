// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt, { VerifyErrors } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): Response | void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    (req as any).user = user;

    next(); 
    return user;
  });
  return;
};
