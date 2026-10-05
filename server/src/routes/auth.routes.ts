import { Router } from 'express';
import { currentUserController, loginController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.get('/me', authenticate, currentUserController);
