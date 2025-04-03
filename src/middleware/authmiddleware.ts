import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

interface AuthenticatedRequest extends Request {
  user?: { id: string }; // Define the shape of the user object attached to the request
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token not provided' });
    return;
  }
 console.log(authHeader)
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { id: string };
    console.log("decoded",decoded)

    if (!decoded) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    (req as any).user = { ...decoded, id: decoded.userId }; // Attach user ID to the request object
    next();
  } catch (err) {
    console.error('Token authentication error:', err);
    res.status(403).json({ error: 'Invalid token' });
  }
};
