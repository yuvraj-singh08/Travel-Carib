import { Router } from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUser,
  loginUser,
} from '../controllers/userController';
import { authenticateToken } from '../middleware/authmiddleware';

const router = Router();
router.post('/register', registerUser);  
router.post('/login', loginUser);        

// Protected Routes
router.get('/', authenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);
router.post('/', authenticateToken, createUser);
router.put('/:id', authenticateToken, updateUser);
router.delete('/:id', authenticateToken, deleteUser);

export default router;
