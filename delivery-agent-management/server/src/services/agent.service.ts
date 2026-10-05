import { AgentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export interface CreateAgentInput {
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  status?: AgentStatus;
}

export type UpdateAgentInput = Partial<CreateAgentInput>;

function raiseAgentError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const targets = error.meta?.target;
      const target = Array.isArray(targets) ? targets.join(',') : String(targets ?? '');

      if (target.includes('email')) {
        throw new AppError(409, 'DUPLICATE_EMAIL', 'An agent with this email already exists.');
      }
      if (target.includes('phone')) {
        throw new AppError(409, 'DUPLICATE_PHONE', 'An agent with this phone number already exists.');
      }
      throw new AppError(409, 'DUPLICATE_AGENT_FIELD', 'An agent with one of these values already exists.');
    }

    if (error.code === 'P2025') {
      throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
    }
  }

  throw error;
}

export async function createAgent(input: CreateAgentInput) {
  try {
    return await prisma.deliveryAgent.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        serviceArea: input.serviceArea,
        ...(input.status ? { status: input.status } : {}),
      },
    });
  } catch (error) {
    return raiseAgentError(error);
  }
}

export async function listAgents() {
  return prisma.deliveryAgent.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAgent(id: string) {
  const agent = await prisma.deliveryAgent.findUnique({ where: { id } });
  if (!agent) {
    throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
  }
  return agent;
}

export async function updateAgent(id: string, input: UpdateAgentInput) {
  try {
    return await prisma.deliveryAgent.update({
      where: { id },
      data: input,
    });
  } catch (error) {
    return raiseAgentError(error);
  }
}

export async function deleteAgent(id: string): Promise<void> {
  try {
    await prisma.deliveryAgent.delete({ where: { id } });
  } catch (error) {
    return raiseAgentError(error);
  }
}
