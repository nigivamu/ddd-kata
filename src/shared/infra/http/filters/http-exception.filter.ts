import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Security: Log errors but don't expose sensitive information
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      message: exception instanceof Error ? exception.message : 'Unknown error',
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Log error for monitoring
    if (status >= 500) {
      this.logger.error('Internal server error', errorLog);
    } else if (status >= 400) {
      this.logger.warn('Client error', errorLog);
    }

    // Security: Send sanitized error response to client
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      // In production, don't expose internal error details
      message:
        process.env.NODE_ENV === 'production' && status >= 500
          ? 'Internal server error'
          : typeof message === 'string'
          ? message
          : (message as any).message || 'An error occurred',
      // Include detailed error info only in development
      ...(process.env.NODE_ENV === 'development' && {
        error: typeof message === 'object' ? message : undefined,
      }),
    };

    response.status(status).json(errorResponse);
  }
}
