import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './shared/infra/http/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security: Helmet for secure HTTP headers
  app.use(helmet());

  // Security: CORS configuration with whitelist
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 3600,
  });

  // Security: Global validation pipe with strict rules
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted values are present
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: false, // Prevent implicit type conversion
      },
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide error details in production
    }),
  );

  // Application configuration
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || 'localhost';

  await app.listen(port, host);

  logger.log(`🚀 Application is running on: http://${host}:${port}`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
  console.error('❌ Error during application bootstrap:', error);
  process.exit(1);
});
