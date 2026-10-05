import { AgentStatus } from '@prisma/client';
import type { RequestHandler } from 'express';
import {
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
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

function parseAgentId(id: string | undefined): string {
  if (!id || !id.trim()) {
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
  const agents = await listAgents();
  sendSuccess(response, 'Delivery agents retrieved.', agents);
};

export const getAgentController: RequestHandler = async (request, response) => {
  const agent = await getAgent(parseAgentId(request.params.id));
  sendSuccess(response, 'Delivery agent retrieved.', agent);
};

export const updateAgentController: RequestHandler = async (request, response) => {
  const input = normalizeAgentInput(request.body, true);
  const agent = await updateAgent(parseAgentId(request.params.id), input);
  sendSuccess(response, 'Delivery agent updated.', agent);
};

export const deleteAgentController: RequestHandler = async (request, response) => {
  await deleteAgent(parseAgentId(request.params.id));
  sendSuccess(response, 'Delivery agent deleted.', { id: request.params.id });
};
