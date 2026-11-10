import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { REQUEST_BODY_LIMIT_MB } from './common/constants/request-limits.constant';
import { HttpExceptionFilter } from './common/filters';
import { ResponseInterceptor } from './common/interceptors';

/**
 * Application entry point. Creates the Nest app and installs all the global
 * cross-cutting concerns before listening for requests. Mirrors kalnostics-new
 * (same /api/v1 prefix, envelope, validation) so the shared frontend contract
 * and JWT behave identically across both services.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Raise body limits for rich-text / bulk-import payloads (DTOs still enforce
  // tighter per-field limits).
  app.useBodyParser('json', { limit: `${REQUEST_BODY_LIMIT_MB}mb` });
  app.useBodyParser('urlencoded', {
    limit: `${REQUEST_BODY_LIMIT_MB}mb`,
    extended: true,
  });

  // CORS — allow the inventory-frontend origin(s). Comma-separated list; '*' in dev.
  const rawOrigins = config.get<string>('CORS_ORIGIN', '*');
  const allowedOrigins =
    rawOrigins === '*' ? '*' : rawOrigins.split(',').map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  // All routes under /api/v1 (e.g. GET /api/v1/categories).
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3100);
  await app.listen(port);
}

void bootstrap();
