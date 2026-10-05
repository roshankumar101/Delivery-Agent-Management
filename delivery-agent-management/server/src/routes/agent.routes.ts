import { Router } from 'express';
import {
  createAgentController,
  deleteAgentController,
  getAgentController,
  listAgentsController,
  updateAgentController,
} from '../controllers/agent.controller';
import { authenticate } from '../middleware/authenticate';

export const agentRouter = Router();

agentRouter.use(authenticate);
agentRouter.post('/', createAgentController);
agentRouter.get('/', listAgentsController);
agentRouter.get('/:id', getAgentController);
agentRouter.patch('/:id', updateAgentController);
agentRouter.delete('/:id', deleteAgentController);
