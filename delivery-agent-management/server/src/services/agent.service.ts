import { AgentStatus, Prisma, type DeliveryAgent } from '@prisma/client';
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

export interface ListAgentsOptions {
  page: number;
  limit: number;
  search?: string;
  status?: AgentStatus;
  serviceArea?: string;
}

export interface PaginatedAgents {
  agents: DeliveryAgent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export async function listAgents(options: ListAgentsOptions): Promise<PaginatedAgents> {
  const where: Prisma.DeliveryAgentWhereInput = {
    deletedAt: null,
    ...(options.status ? { status: options.status } : {}),
    ...(options.serviceArea
      ? { serviceArea: { equals: options.serviceArea, mode: 'insensitive' } }
      : {}),
    ...(options.search
      ? {
          OR: [
            { fullName: { contains: options.search, mode: 'insensitive' } },
            { phone: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
            { serviceArea: { contains: options.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [agents, total] = await prisma.$transaction([
    prisma.deliveryAgent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    }),
    prisma.deliveryAgent.count({ where }),
  ]);

  return {
    agents,
    page: options.page,
    limit: options.limit,
    total,
    totalPages: Math.ceil(total / options.limit),
  };
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
    return await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "DeliveryAgent" WHERE "id" = ${id} FOR UPDATE`,
      );

      const current = await transaction.deliveryAgent.findUnique({ where: { id } });
      if (!current) {
        throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
      }

      const changedFields: string[] = [];
      const previousValues: Record<string, string> = {};
      const newValues: Record<string, string> = {};
      const fields = ['fullName', 'phone', 'email', 'serviceArea', 'status'] as const;

      for (const field of fields) {
        const nextValue = input[field];
        if (nextValue === undefined || current[field] === nextValue) continue;

        changedFields.push(field);
        previousValues[field] = current[field];
        newValues[field] = nextValue;
      }

      if (changedFields.length === 0) {
        return current;
      }

      const latestModification = await transaction.agentModification.findFirst({
        where: { agentId: id },
        orderBy: { modificationNumber: 'desc' },
        select: { modificationNumber: true },
      });
      const modificationNumber = (latestModification?.modificationNumber ?? 0) + 1;
      const updatedAgent = await transaction.deliveryAgent.update({
        where: { id },
        data: input,
      });

      await transaction.agentModification.create({
        data: {
          agentId: id,
          modificationNumber,
          changedFields,
          previousValues,
          newValues,
        },
      });

      return updatedAgent;
    });
  } catch (error) {
    return raiseAgentError(error);
  }
}

export async function getAgentHistory(id: string) {
  const agent = await prisma.deliveryAgent.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!agent) {
    throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
  }

  return prisma.agentModification.findMany({
    where: { agentId: id },
    orderBy: { modificationNumber: 'asc' },
  });
}

export async function deleteAgent(id: string): Promise<void> {
  try {
    await prisma.deliveryAgent.delete({ where: { id } });
  } catch (error) {
    return raiseAgentError(error);
  }
}
