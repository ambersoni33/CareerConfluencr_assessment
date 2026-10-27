export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Transaction Ledger API',
    version: '1.0.0',
    description: `
A production-ready, ACID-compliant Transaction Ledger REST API built with Node.js, TypeScript, Express, and PostgreSQL.

### Key Capabilities:
- **Zero-Initial Balance**: Accounts strictly initialize with 0 balance; clients cannot specify starting balances.
- **ACID Atomicity**: Transactions execute atomically with exclusive locks and automated rollback on failure.
- **Strict Immutability**: Historical transactions cannot be updated or deleted.
- **Idempotency & Deduplication**: For a given account, \`reference_id\` must be unique. Duplicate attempts are rejected without altering balance.
- **Balance Invariant**: Enforced by database-level constraints (\`CHECK(balance >= 0.0)\`).
- **Paginated History**: Query transactions with type filtering (\`credit\` / \`debit\`), metadata (\`total_records\`, \`total_pages\`), and latest-first sorting.
- **Bonus Money Transfer**: Atomic transfer from account A to B with zero risk of partial debit or credit.
    `,
    contact: {
      name: 'Full Stack Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  paths: {
    '/accounts': {
      post: {
        summary: 'Create a new account',
        description: 'Creates a new ledger account. Initial balance is strictly initialized to 0.0 by the system.',
        tags: ['Accounts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {
                    type: 'string',
                    example: 'Alice Johnson',
                    description: 'Account holder name',
                  },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/Account' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error (e.g. empty name or attempt to pass initial balance)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/accounts/{accountId}': {
      get: {
        summary: 'Get account details',
        description: 'Retrieves an account by its unique identifier.',
        tags: ['Accounts'],
        parameters: [
          {
            name: 'accountId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique UUID of the account',
          },
        ],
        responses: {
          200: {
            description: 'Account retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/Account' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/accounts/{accountId}/balance': {
      get: {
        summary: 'Get account balance',
        description: 'Fetches the current verified balance of an account.',
        tags: ['Accounts'],
        parameters: [
          {
            name: 'accountId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique UUID of the account',
          },
        ],
        responses: {
          200: {
            description: 'Current balance fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        account_id: { type: 'string' },
                        balance: { type: 'number', example: 100.5 },
                        name: { type: 'string', example: 'Alice Johnson' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/accounts/{accountId}/transactions': {
      post: {
        summary: 'Add transaction to account',
        description: 'Executes an atomic credit or debit transaction on the account.',
        tags: ['Transactions'],
        parameters: [
          {
            name: 'accountId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Account ID to execute transaction on',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTransactionRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Transaction recorded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/Transaction' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error or Insufficient balance',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Duplicate reference_id for this account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        summary: 'Get transaction history',
        description: 'Retrieves all transactions for an account with optional type filtering and pagination. Results sorted latest-first.',
        tags: ['Transactions'],
        parameters: [
          {
            name: 'accountId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Account identifier',
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['credit', 'debit'] },
            description: 'Filter by transaction type. Returns both if omitted.',
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1, minimum: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            description: 'Number of items per page',
          },
        ],
        responses: {
          200: {
            description: 'Paginated transactions list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/PaginatedTransactions' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid filter or pagination query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/transactions': {
      post: {
        summary: 'Add transaction (Direct)',
        description: 'Direct transaction creation where account_id is supplied in the request body.',
        tags: ['Transactions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/CreateTransactionRequest' },
                  {
                    type: 'object',
                    required: ['account_id'],
                    properties: {
                      account_id: { type: 'string', description: 'Account ID' },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Transaction recorded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/Transaction' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error or Insufficient balance',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Duplicate reference_id for this account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/transfers': {
      post: {
        summary: 'Transfer money between accounts (Bonus)',
        description: 'Atomically debits source account and credits destination account. Fully rolls back if either operation fails.',
        tags: ['Transfers'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTransferRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Transfer executed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/Transfer' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error, self-transfer, or insufficient balance',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Source or destination account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Duplicate transfer reference_id',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Account: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '018f26a1-0000-7000-8000-000000000001' },
          name: { type: 'string', example: 'Alice Johnson' },
          balance: { type: 'number', example: 100.0 },
          created_at: { type: 'string', format: 'date-time', example: '2026-10-27T10:00:00.000Z' },
        },
      },
      CreateTransactionRequest: {
        type: 'object',
        required: ['type', 'amount', 'reference_id'],
        properties: {
          type: { type: 'string', enum: ['credit', 'debit'], example: 'credit' },
          amount: { type: 'number', minimum: 0.01, example: 50.0 },
          description: { type: 'string', example: 'Salary deposit' },
          reference_id: { type: 'string', example: 'PAY-10023' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '018f26a2-0000-7000-8000-000000000002' },
          account_id: { type: 'string', example: '018f26a1-0000-7000-8000-000000000001' },
          type: { type: 'string', enum: ['credit', 'debit'], example: 'credit' },
          amount: { type: 'number', example: 50.0 },
          description: { type: 'string', example: 'Salary deposit' },
          reference_id: { type: 'string', example: 'PAY-10023' },
          created_at: { type: 'string', format: 'date-time', example: '2026-10-27T10:05:00.000Z' },
        },
      },
      PaginatedTransactions: {
        type: 'object',
        properties: {
          current_page: { type: 'integer', example: 1 },
          page_size: { type: 'integer', example: 10 },
          total_records: { type: 'integer', example: 42 },
          total_pages: { type: 'integer', example: 5 },
          transactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Transaction' },
          },
        },
      },
      CreateTransferRequest: {
        type: 'object',
        required: ['source_account_id', 'destination_account_id', 'amount', 'reference_id'],
        properties: {
          source_account_id: { type: 'string', example: '018f26a1-0000-7000-8000-000000000001' },
          destination_account_id: { type: 'string', example: '018f26a1-0000-7000-8000-000000000002' },
          amount: { type: 'number', minimum: 0.01, example: 30.0 },
          reference_id: { type: 'string', example: 'XFER-99231' },
          description: { type: 'string', example: 'Monthly rent split' },
        },
      },
      Transfer: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '018f26a3-0000-7000-8000-000000000003' },
          source_account_id: { type: 'string', example: '018f26a1-0000-7000-8000-000000000001' },
          destination_account_id: { type: 'string', example: '018f26a1-0000-7000-8000-000000000002' },
          amount: { type: 'number', example: 30.0 },
          reference_id: { type: 'string', example: 'XFER-99231' },
          description: { type: 'string', example: 'Monthly rent split' },
          source_transaction_id: { type: 'string' },
          destination_transaction_id: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INSUFFICIENT_BALANCE' },
              message: { type: 'string', example: 'Insufficient balance.' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  },
};
