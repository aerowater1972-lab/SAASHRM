import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = isHttp ? exception.getResponse() : null;
    // Jangan bocorkan detail DB/stack ke client di production.
    const message =
      status >= 500
        ? 'Internal server error'
        : typeof raw === 'string'
          ? raw
          : ((raw as any)?.message ?? 'Request failed');

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status}: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
