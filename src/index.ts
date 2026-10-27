import { createApp } from './app.js';
import { config } from './config/index.js';
import { initDatabase, closeDatabase } from './db/connection.js';

async function bootstrap() {
  try {
    // Initialize Database schema and constraints
    console.log('Connecting to PostgreSQL and initializing schema...');
    await initDatabase();
    console.log('PostgreSQL database ready.');

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 Transaction Ledger API is live!`);
      console.log(`📡 Server running on: http://localhost:${config.port}`);
      console.log(`📚 Swagger Documentation: http://localhost:${config.port}/docs`);
      console.log(`📄 OpenAPI Specification: http://localhost:${config.port}/openapi.json`);
      console.log(`💚 Health Check: http://localhost:${config.port}/health`);
      console.log(`====================================================`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await closeDatabase();
        console.log('PostgreSQL connection pool closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
