-- CreateEnum
CREATE TYPE "AgentLifecycleAction" AS ENUM ('SOFT_DELETED', 'RESTORED', 'PERMANENTLY_DELETED');

-- CreateTable
CREATE TABLE "AgentLifecycleEvent" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "action" "AgentLifecycleAction" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentLifecycleEvent_occurredAt_idx" ON "AgentLifecycleEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AgentLifecycleEvent_action_occurredAt_idx" ON "AgentLifecycleEvent"("action", "occurredAt");

-- CreateIndex
CREATE INDEX "AgentLifecycleEvent_agentId_occurredAt_idx" ON "AgentLifecycleEvent"("agentId", "occurredAt");
