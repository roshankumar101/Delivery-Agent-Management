const success = {
  type: 'object',
  required: ['success', 'message', 'data'],
  properties: {
    success: { type: 'boolean', enum: [true] },
    message: { type: 'string' },
    data: {},
  },
} as const;

const error = {
  type: 'object',
  required: ['success', 'message', 'error'],
  properties: {
    success: { type: 'boolean', enum: [false] },
    message: { type: 'string' },
    error: {
      type: 'object',
      required: ['code'],
      properties: { code: { type: 'string' } },
    },
  },
} as const;

const apiErrorResponse = {
  description: 'Request failed.',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
} as const;

const apiSuccessResponse = {
  description: 'Request succeeded.',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
} as const;

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Delivery Agent Management API',
    version: '1.0.0',
    description: 'Admin API for delivery agents, modification history, analytics, and soft-delete recovery.',
  },
  servers: [{ url: 'http://localhost:5000', description: 'Local development server (default PORT)' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Agents' },
    { name: 'Analytics' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check server health',
        responses: {
          '200': {
            description: 'Server is available.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiSuccess' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: { status: { type: 'string', enum: ['ok'] } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in as an administrator',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiSuccess' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            token: { type: 'string' },
                            user: { $ref: '#/components/schemas/User' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': apiErrorResponse,
          '401': apiErrorResponse,
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the current administrator',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': apiSuccessResponse,
          '401': apiErrorResponse,
        },
      },
    },
    '/api/agents': {
      get: {
        tags: ['Agents'],
        summary: 'List agents with optional filters and pagination',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/AgentStatus' } },
          { name: 'serviceArea', in: 'query', schema: { type: 'string', maxLength: 200 } },
        ],
        responses: {
          '200': {
            description: 'Paginated agent list.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiSuccess' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/PaginatedAgents' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': apiErrorResponse,
          '401': apiErrorResponse,
        },
      },
      post: {
        tags: ['Agents'],
        summary: 'Create an agent',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentInput' } } },
        },
        responses: {
          '201': apiSuccessResponse,
          '400': apiErrorResponse,
          '401': apiErrorResponse,
          '409': apiErrorResponse,
        },
      },
    },
    '/api/agents/stats': {
      get: {
        tags: ['Analytics'],
        summary: 'Get dashboard agent totals',
        security: [{ bearerAuth: [] }],
        responses: { '200': apiSuccessResponse, '401': apiErrorResponse },
      },
    },
    '/api/agents/analytics': {
      get: {
        tags: ['Analytics'],
        summary: 'Get agent and lifecycle analytics',
        security: [{ bearerAuth: [] }],
        responses: { '200': apiSuccessResponse, '401': apiErrorResponse },
      },
    },
    '/api/agents/export': {
      get: {
        tags: ['Agents'],
        summary: 'Export matching agents as CSV',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/AgentStatus' } },
          { name: 'serviceArea', in: 'query', schema: { type: 'string', maxLength: 200 } },
        ],
        responses: {
          '200': {
            description: 'UTF-8 CSV file.',
            content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
          },
          '400': apiErrorResponse,
          '401': apiErrorResponse,
        },
      },
    },
    '/api/agents/trash': {
      get: {
        tags: ['Agents'],
        summary: 'List agents in trash',
        security: [{ bearerAuth: [] }],
        responses: { '200': apiSuccessResponse, '401': apiErrorResponse },
      },
    },
    '/api/agents/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Delivery agent identifier.',
          schema: { type: 'string', minLength: 1 },
        },
      ],
      get: {
        tags: ['Agents'],
        summary: 'Get an agent',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': apiSuccessResponse,
          '401': apiErrorResponse,
          '404': apiErrorResponse,
        },
      },
      patch: {
        tags: ['Agents'],
        summary: 'Update an agent and append a modification record',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentUpdate' } } },
        },
        responses: {
          '200': apiSuccessResponse,
          '400': apiErrorResponse,
          '401': apiErrorResponse,
          '404': apiErrorResponse,
          '409': apiErrorResponse,
        },
      },
      delete: {
        tags: ['Agents'],
        summary: 'Move an agent to trash',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': apiSuccessResponse,
          '401': apiErrorResponse,
          '404': apiErrorResponse,
          '409': apiErrorResponse,
        },
      },
    },
    '/api/agents/{id}/history': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Delivery agent identifier.',
          schema: { type: 'string', minLength: 1 },
        },
      ],
      get: {
        tags: ['Agents'],
        summary: 'Get the complete modification history',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': apiSuccessResponse,
          '401': apiErrorResponse,
          '404': apiErrorResponse,
        },
      },
    },
    '/api/agents/{id}/restore': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Delivery agent identifier.',
          schema: { type: 'string', minLength: 1 },
        },
      ],
      post: {
        tags: ['Agents'],
        summary: 'Restore an agent from trash',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': apiSuccessResponse,
          '401': apiErrorResponse,
          '404': apiErrorResponse,
          '409': apiErrorResponse,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiSuccess: success,
      ApiError: error,
      AgentStatus: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN'] },
        },
      },
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          serviceArea: { type: 'string' },
          status: { $ref: '#/components/schemas/AgentStatus' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AgentInput: {
        type: 'object',
        required: ['fullName', 'phone', 'email', 'serviceArea'],
        properties: {
          fullName: { type: 'string', minLength: 1 },
          phone: { type: 'string', minLength: 7, maxLength: 24 },
          email: { type: 'string', format: 'email' },
          serviceArea: { type: 'string', minLength: 1 },
          status: { $ref: '#/components/schemas/AgentStatus' },
        },
      },
      AgentUpdate: {
        type: 'object',
        description: 'Provide at least one supported agent field.',
        minProperties: 1,
        properties: {
          fullName: { type: 'string', minLength: 1 },
          phone: { type: 'string', minLength: 7, maxLength: 24 },
          email: { type: 'string', format: 'email' },
          serviceArea: { type: 'string', minLength: 1 },
          status: { $ref: '#/components/schemas/AgentStatus' },
        },
      },
      PaginatedAgents: {
        type: 'object',
        properties: {
          agents: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
} as const;

export { openApiDocument };
