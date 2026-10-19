import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`🏨 HotelPro API server listening on http://localhost:${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/health`);
  console.log(`📖 OpenAPI Spec: http://localhost:${config.port}/api/v1/openapi.json`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connections closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
