import type { RequestHandler } from 'express';
import { getAgentAnalytics, getDashboardStats } from '../services/analytics.service';
import { sendSuccess } from '../utils/apiResponse';

export const dashboardStatsController: RequestHandler = async (_request, response) => {
  const cached = await getDashboardStats();
  response.setHeader('X-Cache', cached.status);
  sendSuccess(response, 'Dashboard statistics retrieved.', cached.value);
};

export const agentAnalyticsController: RequestHandler = async (_request, response) => {
  const cached = await getAgentAnalytics();
  response.setHeader('X-Cache', cached.status);
  sendSuccess(response, 'Agent analytics retrieved.', cached.value);
};
