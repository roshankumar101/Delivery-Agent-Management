import { AgentLifecycleAction, AgentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { getOrLoad } from './cache.service';

interface CountRow {
  month: string;
  count: string | number | bigint;
}

interface LifecycleCountRow {
  month: string;
  action: AgentLifecycleAction;
  count: string | number | bigint;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  deletedAgents: number;
  serviceAreaCount: number;
}

export interface AgentAnalytics {
  agentsByServiceArea: Array<{ serviceArea: string; count: number }>;
  statusDistribution: Array<{ status: AgentStatus; count: number }>;
  creationTrend: Array<{ month: string; count: number }>;
  modificationActivity: Array<{ month: string; count: number }>;
  lifecycleTrend: Array<{
    month: string;
    deleted: number;
    restored: number;
    permanentlyDeleted: number;
  }>;
  lifecycleTotals: {
    deleted: number;
    restored: number;
    permanentlyDeleted: number;
  };
}

const analyticsMonthCount = 12;

function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function makeMonthKeys(now: Date): string[] {
  const firstMonth = getMonthStart(now);
  return Array.from({ length: analyticsMonthCount }, (_value, index) => {
    const month = new Date(Date.UTC(
      firstMonth.getUTCFullYear(),
      firstMonth.getUTCMonth() - analyticsMonthCount + 1 + index,
      1,
    ));
    return monthKey(month);
  });
}

async function loadDashboardStats(): Promise<DashboardStats> {
  const activeWhere = { deletedAt: null };
  const [totalAgents, activeAgents, inactiveAgents, deletedAgents, serviceAreas] =
    await Promise.all([
      prisma.deliveryAgent.count({ where: activeWhere }),
      prisma.deliveryAgent.count({ where: { ...activeWhere, status: AgentStatus.ACTIVE } }),
      prisma.deliveryAgent.count({ where: { ...activeWhere, status: AgentStatus.INACTIVE } }),
      prisma.deliveryAgent.count({ where: { deletedAt: { not: null } } }),
      prisma.deliveryAgent.groupBy({
        by: ['serviceArea'],
        where: activeWhere,
      }),
    ]);

  return {
    totalAgents,
    activeAgents,
    inactiveAgents,
    deletedAgents,
    serviceAreaCount: serviceAreas.length,
  };
}

export async function getDashboardStats() {
  return getOrLoad('agents:stats', 30, loadDashboardStats);
}

async function loadAnalytics(now: Date): Promise<AgentAnalytics> {
  const firstMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - analyticsMonthCount + 1,
    1,
  ));

  const [serviceAreas, statuses, creationRows, modificationRows, lifecycleRows, lifecycleTotals] =
    await Promise.all([
      prisma.deliveryAgent.groupBy({
        by: ['serviceArea'],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { serviceArea: 'asc' },
      }),
      prisma.deliveryAgent.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS "month", COUNT(*) AS "count"
        FROM "DeliveryAgent"
        WHERE "createdAt" >= ${firstMonth}
        GROUP BY to_char(date_trunc('month', "createdAt"), 'YYYY-MM')
        ORDER BY "month"
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', "modifiedAt"), 'YYYY-MM') AS "month", COUNT(*) AS "count"
        FROM "AgentModification"
        WHERE "modifiedAt" >= ${firstMonth}
        GROUP BY to_char(date_trunc('month', "modifiedAt"), 'YYYY-MM')
        ORDER BY "month"
      `),
      prisma.$queryRaw<LifecycleCountRow[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', "occurredAt"), 'YYYY-MM') AS "month", "action", COUNT(*) AS "count"
        FROM "AgentLifecycleEvent"
        WHERE "occurredAt" >= ${firstMonth}
        GROUP BY to_char(date_trunc('month', "occurredAt"), 'YYYY-MM'), "action"
        ORDER BY "month"
      `),
      prisma.agentLifecycleEvent.groupBy({
        by: ['action'],
        _count: { _all: true },
      }),
    ]);

  const months = makeMonthKeys(now);
  const creationByMonth = new Map(creationRows.map((row) => [row.month, Number(row.count)]));
  const modificationsByMonth = new Map(
    modificationRows.map((row) => [row.month, Number(row.count)]),
  );
  const lifecycleByMonth = new Map<string, AgentAnalytics['lifecycleTrend'][number]>();

  for (const month of months) {
    lifecycleByMonth.set(month, {
      month,
      deleted: 0,
      restored: 0,
      permanentlyDeleted: 0,
    });
  }
  for (const row of lifecycleRows) {
    const values = lifecycleByMonth.get(row.month);
    if (!values) continue;
    if (row.action === AgentLifecycleAction.SOFT_DELETED) values.deleted = Number(row.count);
    if (row.action === AgentLifecycleAction.RESTORED) values.restored = Number(row.count);
    if (row.action === AgentLifecycleAction.PERMANENTLY_DELETED) {
      values.permanentlyDeleted = Number(row.count);
    }
  }

  const totals = {
    deleted: 0,
    restored: 0,
    permanentlyDeleted: 0,
  };
  for (const row of lifecycleTotals) {
    if (row.action === AgentLifecycleAction.SOFT_DELETED) totals.deleted = row._count._all;
    if (row.action === AgentLifecycleAction.RESTORED) totals.restored = row._count._all;
    if (row.action === AgentLifecycleAction.PERMANENTLY_DELETED) {
      totals.permanentlyDeleted = row._count._all;
    }
  }

  const statusCounts = new Map(statuses.map((row) => [row.status, row._count._all]));
  return {
    agentsByServiceArea: serviceAreas.map((row) => ({
      serviceArea: row.serviceArea,
      count: row._count._all,
    })),
    statusDistribution: [
      { status: AgentStatus.ACTIVE, count: statusCounts.get(AgentStatus.ACTIVE) ?? 0 },
      { status: AgentStatus.INACTIVE, count: statusCounts.get(AgentStatus.INACTIVE) ?? 0 },
    ],
    creationTrend: months.map((month) => ({ month, count: creationByMonth.get(month) ?? 0 })),
    modificationActivity: months.map((month) => ({
      month,
      count: modificationsByMonth.get(month) ?? 0,
    })),
    lifecycleTrend: months.map((month) => lifecycleByMonth.get(month) ?? {
      month,
      deleted: 0,
      restored: 0,
      permanentlyDeleted: 0,
    }),
    lifecycleTotals: totals,
  };
}

export async function getAgentAnalytics(now = new Date()) {
  const monthKeyNow = monthKey(getMonthStart(now));
  return getOrLoad(`agents:analytics:${monthKeyNow}`, 60, () => loadAnalytics(now));
}
