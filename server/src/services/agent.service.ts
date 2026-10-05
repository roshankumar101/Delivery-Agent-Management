import { AgentStatus, Prisma, type DeliveryAgent } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  getOrLoad,
  hashCacheQuery,
  invalidateAgentCache,
  type CachedValue,
} from './cache.service';
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

export type AgentFilterOptions = Pick<ListAgentsOptions, 'search' | 'status' | 'serviceArea'>;

export interface PaginatedAgents {
  agents: DeliveryAgent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type DeletedAgent = Pick<
  DeliveryAgent,
  'id' | 'fullName' | 'phone' | 'email' | 'serviceArea' | 'status' | 'deletedAt'
>;

function buildAgentWhere(options: AgentFilterOptions): Prisma.DeliveryAgentWhereInput {
  return {
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
    const agent = await prisma.deliveryAgent.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        serviceArea: input.serviceArea,
        ...(input.status ? { status: input.status } : {}),
      },
    });
    await invalidateAgentCache(agent.id);
    return agent;
  } catch (error) {
    return raiseAgentError(error);
  }
}

export async function listAgents(options: ListAgentsOptions): Promise<CachedValue<PaginatedAgents>> {
  const key = `agents:list:${hashCacheQuery(options)}`;
  const where = buildAgentWhere(options);

  return getOrLoad(key, 30, async () => {
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
  });
}

export async function exportAgents(filters: AgentFilterOptions): Promise<DeliveryAgent[]> {
  return prisma.deliveryAgent.findMany({
    where: buildAgentWhere(filters),
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

export async function getAgent(id: string) {
  const cached = await getOrLoad(`agent:${id}`, 60, async () => {
    const agent = await prisma.deliveryAgent.findFirst({ where: { id, deletedAt: null } });
    if (!agent) {
      throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
    }
    return agent;
  });
  return cached;
}

export async function listDeletedAgents(): Promise<CachedValue<DeletedAgent[]>> {
  return getOrLoad('agents:trash', 30, () =>
    prisma.deliveryAgent.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        serviceArea: true,
        status: true,
        deletedAt: true,
      },
      orderBy: { deletedAt: 'desc' },
    }),
  );
}

export async function updateAgent(id: string, input: UpdateAgentInput) {
  try {
    const updatedAgent = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "DeliveryAgent" WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`,
      );

      const current = await transaction.deliveryAgent.findUnique({ where: { id } });
      if (!current) {
        throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
      }
      if (current.deletedAt) {
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
    await invalidateAgentCache(id);
    return updatedAgent;
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
  await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "DeliveryAgent" WHERE "id" = ${id} FOR UPDATE`,
    );

    const agent = await transaction.deliveryAgent.findUnique({ where: { id } });
    if (!agent) {
      throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
    }
    if (agent.deletedAt) {
      throw new AppError(409, 'AGENT_ALREADY_DELETED', 'Delivery agent is already in the trash.');
    }

    await transaction.deliveryAgent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await transaction.agentLifecycleEvent.create({
      data: { agentId: id, action: 'SOFT_DELETED' },
    });
  });
  await invalidateAgentCache(id);
}

export async function restoreAgent(id: string): Promise<DeliveryAgent> {
  const restoredAgent = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "DeliveryAgent" WHERE "id" = ${id} FOR UPDATE`,
    );

    const agent = await transaction.deliveryAgent.findUnique({ where: { id } });
    if (!agent) {
      throw new AppError(404, 'AGENT_NOT_FOUND', 'Delivery agent was not found.');
    }
    if (!agent.deletedAt) {
      throw new AppError(409, 'AGENT_NOT_DELETED', 'Delivery agent is not in the trash.');
    }

    const restored = await transaction.deliveryAgent.update({
      where: { id },
      data: { deletedAt: null },
    });
    await transaction.agentLifecycleEvent.create({
      data: { agentId: id, action: 'RESTORED' },
    });
    return restored;
  });
  await invalidateAgentCache(id);
  return restoredAgent;
}
