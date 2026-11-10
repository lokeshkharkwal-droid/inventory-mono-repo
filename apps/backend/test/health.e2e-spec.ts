/**
 * Hermetic e2e smoke test. Boots the full Nest application with the same global
 * pipes/filters/interceptors as `main.ts`, but overrides PrismaService so no
 * database is required, and asserts the success envelope on the public health
 * route plus the error envelope + JWT protection on a guarded route.
 *
 * Required env is stubbed before AppModule is imported so Joi validation passes.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
process.env.KALNOSTICS_API_BASE_URL ??= 'http://localhost:4000/api/v1';
process.env.RLS_ENABLED = 'false';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters';
import { ResponseInterceptor } from '../src/common/interceptors';

describe('Inventory API (e2e smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Avoid a real DB connection: stub the lifecycle + a no-op client.
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
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
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  interface Envelope {
    success: boolean;
    data?: Record<string, unknown>;
    meta?: unknown;
    error?: unknown;
  }

  it('GET /api/v1/health → success envelope (public route)', async () => {
    const res = await request(app.getHttpServer() as never).get(
      '/api/v1/health',
    );
    const body = res.body as Envelope;
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: { status: 'ok', service: 'inventory-backend' },
    });
    expect(body.meta).toBeDefined();
  });

  it('GET /api/v1/products → 401 error envelope without a JWT', async () => {
    const res = await request(app.getHttpServer() as never).get(
      '/api/v1/products',
    );
    const body = res.body as Envelope;
    expect(res.status).toBe(401);
    expect(body).toMatchObject({ success: false });
    expect(body.error).toBeDefined();
  });
});
