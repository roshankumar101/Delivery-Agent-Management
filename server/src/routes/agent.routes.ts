import { Router } from 'express';
import {
  createAgentController,
  deleteAgentController,
  getAgentController,
  getAgentHistoryController,
  listDeletedAgentsController,
  listAgentsController,
  restoreAgentController,
  updateAgentController,
} from '../controllers/agent.controller';
import { authenticate } from '../middleware/authenticate';

export const agentRouter = Router();

agentRouter.use(authenticate);
agentRouter.post('/', createAgentController);
agentRouter.get('/trash', listDeletedAgentsController);
agentRouter.get('/', listAgentsController);
agentRouter.get('/:id/history', getAgentHistoryController);
agentRouter.post('/:id/restore', restoreAgentController);
agentRouter.get('/:id', getAgentController);
agentRouter.patch('/:id', updateAgentController);
agentRouter.delete('/:id', deleteAgentController);
