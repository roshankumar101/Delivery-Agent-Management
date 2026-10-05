import { Router } from 'express';
import {
  agentAnalyticsController,
  dashboardStatsController,
} from '../controllers/analytics.controller';
import {
  createAgentController,
  deleteAgentController,
  exportAgentsController,
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
agentRouter.get('/stats', dashboardStatsController);
agentRouter.get('/analytics', agentAnalyticsController);
agentRouter.get('/export', exportAgentsController);
agentRouter.get('/trash', listDeletedAgentsController);
agentRouter.get('/', listAgentsController);
agentRouter.get('/:id/history', getAgentHistoryController);
agentRouter.post('/:id/restore', restoreAgentController);
agentRouter.get('/:id', getAgentController);
agentRouter.patch('/:id', updateAgentController);
agentRouter.delete('/:id', deleteAgentController);
