import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { checkPermission } from '../utils/permission';

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

    if (!decoded) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    (req as any).user = { ...decoded, id: decoded.userId,roleId:decoded?.roleId }; // Attach user ID to the request object
    next();
  } catch (err) {
    console.error('Token authentication error:', err);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// New permission middleware that checks role and permission
export const checkRolePermission = (resource: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roleId = (req as any).user?.roleId;
      
      // if (!roleId) {
      //   res.status(401).json({
      //     success: false,
      //     message: "Role ID not found. User may not be authenticated properly."
      //   });
      //   return;
      // }

      const permission = await checkPermission(roleId || "", resource, action);
      
      if (!permission) {
        res.status(401).json({
          success: false,
          message: `Insufficient permissions to ${action.toLowerCase()} ${resource.toLowerCase()}`
        });
        return;
      }

      // Permission granted, proceed to next middleware/controller
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: "Error checking permissions"
      });
    }
  };
};
