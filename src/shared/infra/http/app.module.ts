import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import * as Joi from 'joi';
import { AllExceptionsFilter } from './filters/http-exception.filter';

@Module({
  imports: [
    // Environment configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .default('development'),
        PORT: Joi.number().default(3000),
        HOST: Joi.string().default('localhost'),
        ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:3001'),
        THROTTLE_TTL: Joi.number().default(60),
        THROTTLE_LIMIT: Joi.number().default(10),
        LOG_LEVEL: Joi.string()
          .valid('error', 'warn', 'info', 'debug', 'verbose')
          .default('debug'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Rate limiting (DDoS protection)
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
    }]),
  ],
  controllers: [],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Apply global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
