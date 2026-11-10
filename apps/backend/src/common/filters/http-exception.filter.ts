import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { KaltrosException } from '../exceptions/kaltros.exception';
import { REQUEST_BODY_LIMIT_MB } from '../constants/request-limits.constant';

/** The error envelope all failures are rendered into. */
interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string | string[] };
}

/**
 * Global exception filter — renders every thrown error as the standard error
 * envelope (CLAUDE.md rule #6), identical to kalnostics-new:
 *
 * ```json
 * { "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "…" } }
 * ```
 *
 * - `KaltrosException` passes through unchanged; its server-only `context` is logged.
 * - Other `HttpException`s (e.g. the ValidationPipe's BadRequestException) are
 *   wrapped, preserving status + message(s).
 * - An over-limit request body (the body parser throws before routing) becomes a 413.
 * - Anything unknown becomes a clean 500 with its stack logged.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.resolveStatus(exception);
    const body = this.resolveBody(exception);

    if (status >= 500) {
      const context =
        exception instanceof KaltrosException ? exception.context : undefined;
      this.logger.error(
        `${request.method} ${request.url} ${JSON.stringify(context ?? {})}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (this.isPayloadTooLarge(exception)) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveBody(exception: unknown): ErrorEnvelope {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      // Already in our envelope shape (KaltrosException) — pass through.
      if (
        typeof res === 'object' &&
        res !== null &&
        'success' in res &&
        'error' in res
      ) {
        return res as ErrorEnvelope;
      }

      const code = this.codeForStatus(exception.getStatus());
      let message: string | string[] = exception.message;
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as { message: string | string[] }).message;
      } else if (typeof res === 'string') {
        message = res;
      }
      return { success: false, error: { code, message } };
    }

    if (this.isPayloadTooLarge(exception)) {
      return {
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `The data you sent is too large (the limit is ${REQUEST_BODY_LIMIT_MB} MB per request). Shorten the text, or remove pasted images, and try again.`,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    };
  }

  private isPayloadTooLarge(exception: unknown): boolean {
    if (typeof exception !== 'object' || exception === null) return false;
    const e = exception as { type?: unknown; status?: unknown };
    return e.type === 'entity.too.large' || e.status === 413;
  }

  private codeForStatus(status: number): string {
    const byStatus: Partial<Record<number, string>> = {
      [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORISED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
    };
    return byStatus[status] ?? 'HTTP_ERROR';
  }
}
