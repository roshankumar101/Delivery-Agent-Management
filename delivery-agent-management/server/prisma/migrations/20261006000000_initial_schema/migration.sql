-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAgent" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "serviceArea" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentModification" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "modificationNumber" INTEGER NOT NULL,
    "changedFields" JSONB NOT NULL,
    "previousValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentModification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAgent_phone_key" ON "DeliveryAgent"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAgent_email_key" ON "DeliveryAgent"("email");

-- CreateIndex
CREATE INDEX "DeliveryAgent_status_idx" ON "DeliveryAgent"("status");

-- CreateIndex
CREATE INDEX "DeliveryAgent_serviceArea_idx" ON "DeliveryAgent"("serviceArea");

-- CreateIndex
CREATE INDEX "DeliveryAgent_deletedAt_idx" ON "DeliveryAgent"("deletedAt");

-- CreateIndex
CREATE INDEX "DeliveryAgent_createdAt_idx" ON "DeliveryAgent"("createdAt");

-- CreateIndex
CREATE INDEX "AgentModification_agentId_modifiedAt_idx" ON "AgentModification"("agentId", "modifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentModification_agentId_modificationNumber_key" ON "AgentModification"("agentId", "modificationNumber");

-- AddForeignKey
ALTER TABLE "AgentModification"
ADD CONSTRAINT "AgentModification_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "DeliveryAgent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
