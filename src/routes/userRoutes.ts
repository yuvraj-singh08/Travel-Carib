import { Router } from 'express';
import {
  updateUserProfile,
  getAllUsers,
  getUserById,
  // updateUser,
  deleteUser,
  registerUser,
  loginUser,
} from '../controllers/userController';
import {authenticateToken}  from '../middleware/authmiddleware';
import { addPassenger, deletePassenger, updatePassenger } from '../controllers/passengerController';
import { addCoTraveller, UpdatePassportDetail } from '../controllers/CoTravellerController';

const router = Router();
router.post('/register', registerUser);  
router.post('/login', loginUser);        

// Protected Routes
router.get('/profile', authenticateToken,updateUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.post('/traveller',authenticateToken,addCoTraveller);
router.put('/passport', authenticateToken,UpdatePassportDetail);
router.get('/',  getAllUsers);
router.get('/:id', authenticateToken, getUserById);

// router.put('/:id', authenticateToken, updateUser);
router.delete('/:id', authenticateToken, deleteUser);
router.post('/addPassenger', authenticateToken,addPassenger);
router.delete('/deletePassenger/:id',authenticateToken, deletePassenger);
router.put('/updatePassenger/:id',authenticateToken, updatePassenger);

export default router;
