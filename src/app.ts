import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import { openApiSpec } from './docs/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Core Middlewares
  app.use(cors());
  app.use(express.json());

  // Swagger UI Interactive API Documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Raw OpenAPI JSON specification
  app.get('/openapi.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Transaction Ledger API',
    });
  });

  // Welcome route with documentation links
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Welcome to the Transaction Ledger API',
      documentation: '/docs',
      openapi: '/openapi.json',
      health: '/health',
    });
  });

  // Mount Feature Routers
  app.use('/accounts', accountRoutes);
  app.use('/transactions', transactionRoutes);
  app.use('/transfers', transferRoutes);

  // 404 Route Catch-all
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
      },
    });
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
