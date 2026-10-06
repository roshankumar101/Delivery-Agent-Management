import { AgentStatus } from '@prisma/client';
import type { RequestHandler } from 'express';
import {
  createAgent,
  deleteAgent,
  exportAgents,
  getAgent,
  getAgentHistory,
  listDeletedAgents,
  listAgents,
  restoreAgent,
  updateAgent,
  type CreateAgentInput,
  type UpdateAgentInput,
} from '../services/agent.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';

const allowedFields = new Set(['fullName', 'phone', 'email', 'serviceArea', 'status']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAgentInput(body: unknown, partial: false): CreateAgentInput;
function normalizeAgentInput(body: unknown, partial: true): UpdateAgentInput;
function normalizeAgentInput(body: unknown, partial: boolean): CreateAgentInput | UpdateAgentInput {
  if (!isRecord(body)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.');
  }

  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) {
    throw new AppError(400, 'VALIDATION_ERROR', `Unsupported field: ${unknownFields.join(', ')}.`);
  }

  const normalized: UpdateAgentInput = {};
  for (const field of ['fullName', 'phone', 'email', 'serviceArea'] as const) {
    const value = body[field];
    if (value === undefined) {
      if (!partial) {
        throw new AppError(400, 'VALIDATION_ERROR', `${field} is required.`);
      }
      continue;
    }
    if (typeof value !== 'string' || !value.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a non-empty string.`);
    }
    normalized[field] = value.trim();
  }

  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email must be a valid email address.');
    }
  }

  if (normalized.phone && !/^[+()\d.\-\s]{7,24}$/.test(normalized.phone)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'phone must be a valid phone number.');
  }

  if (body.status !== undefined) {
    if (body.status !== AgentStatus.ACTIVE && body.status !== AgentStatus.INACTIVE) {
      throw new AppError(400, 'VALIDATION_ERROR', 'status must be ACTIVE or INACTIVE.');
    }
    normalized.status = body.status;
  }

  if (partial && Object.keys(normalized).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Provide at least one agent field to update.');
  }

  return normalized;
}

function parseAgentId(id: unknown): string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A delivery agent ID is required.');
  }
  return id.trim();
}

export const createAgentController: RequestHandler = async (request, response) => {
  const input = normalizeAgentInput(request.body, false);
  const agent = await createAgent(input);
  sendSuccess(response, 'Delivery agent created.', agent, 201);
};

export const listAgentsController: RequestHandler = async (_request, response) => {
  const query = _request.query;
  const page = parsePositiveIntegerQuery(query.page, 'page', 1);
  const limit = parsePositiveIntegerQuery(query.limit, 'limit', 10, 100);
  const filters = parseAgentFilters(query);

  const cached = await listAgents({
    page,
    limit,
    ...filters,
  });
  response.setHeader('X-Cache', cached.status);
  sendSuccess(response, 'Delivery agents retrieved.', cached.value);
};

export const exportAgentsController: RequestHandler = async (request, response) => {
  const filters = parseAgentFilters(request.query);
  const agents = await exportAgents(filters);
  const rows: string[][] = [
    ['Agent ID', 'Full Name', 'Phone', 'Email', 'Service Area', 'Status', 'Created At', 'Updated At'],
    ...agents.map((agent) => [
      agent.id,
      agent.fullName,
      agent.phone,
      agent.email,
      agent.serviceArea,
      agent.status,
      agent.createdAt.toISOString(),
      agent.updatedAt.toISOString(),
    ]),
  ];
  const csv = rows
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');

  response
    .status(200)
    .setHeader('Content-Type', 'text/csv; charset=utf-8')
    .setHeader('Content-Disposition', 'attachment; filename="delivery-agents.csv"')
    .send(`\uFEFF${csv}`);
};

export const listDeletedAgentsController: RequestHandler = async (_request, response) => {
  const cached = await listDeletedAgents();
  response.setHeader('X-Cache', cached.status);
  sendSuccess(response, 'Deleted delivery agents retrieved.', cached.value);
};

export const getAgentController: RequestHandler = async (request, response) => {
  const cached = await getAgent(parseAgentId(request.params.id));
  response.setHeader('X-Cache', cached.status);
  sendSuccess(response, 'Delivery agent retrieved.', cached.value);
};

export const getAgentHistoryController: RequestHandler = async (request, response) => {
  const history = await getAgentHistory(parseAgentId(request.params.id));
  sendSuccess(response, 'Agent modification history retrieved.', history);
};

export const updateAgentController: RequestHandler = async (request, response) => {
  const input = normalizeAgentInput(request.body, true);
  const agent = await updateAgent(parseAgentId(request.params.id), input);
  sendSuccess(response, 'Delivery agent updated.', agent);
};

export const deleteAgentController: RequestHandler = async (request, response) => {
  const id = parseAgentId(request.params.id);
  await deleteAgent(id);
  sendSuccess(response, 'Delivery agent moved to trash.', { id });
};

export const restoreAgentController: RequestHandler = async (request, response) => {
  const agent = await restoreAgent(parseAgentId(request.params.id));
  sendSuccess(response, 'Delivery agent restored.', agent);
};

function parseTextQuery(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be provided once as a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 200) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be 200 characters or fewer.`);
  }
  return trimmed;
}

function parsePositiveIntegerQuery(
  value: unknown,
  field: string,
  defaultValue: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `${field} must be no greater than ${maximum}.`,
    );
  }
  return parsed;
}

function parseStatusQuery(value: unknown): AgentStatus | undefined {
  if (value === undefined) return undefined;
  if (value === AgentStatus.ACTIVE || value === AgentStatus.INACTIVE) return value;
  throw new AppError(400, 'VALIDATION_ERROR', 'status must be ACTIVE or INACTIVE.');
}

function parseAgentFilters(query: Record<string, unknown>) {
  const search = parseTextQuery(query.search, 'search');
  const rawServiceArea = Array.isArray(query.serviceArea)
    ? query.serviceArea.join(',')
    : query.serviceArea;
  const serviceArea = [...new Set(
    (parseTextQuery(rawServiceArea, 'serviceArea') ?? '')
      .split(',')
      .map((area) => area.trim())
      .filter(Boolean),
  )].join(',');
  const status = parseStatusQuery(query.status);

  return {
    ...(search ? { search } : {}),
    ...(serviceArea ? { serviceArea } : {}),
    ...(status ? { status } : {}),
  };
}

function escapeCsvCell(value: string): string {
  const safeValue = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}
