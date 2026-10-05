export type AgentStatus = 'ACTIVE' | 'INACTIVE';

export interface DeliveryAgent {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  status: AgentStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentModification {
  id: string;
  agentId: string;
  modificationNumber: number;
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  modifiedAt: string;
}

export interface PaginatedAgents {
  agents: DeliveryAgent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AgentInput {
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  status: AgentStatus;
}
