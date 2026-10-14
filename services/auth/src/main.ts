import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from local and root .env
dotenv.config();
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getOpenApiDocumentation } from './common/swagger/openapi';
import { ValidationPipe } from '@nestjs/common';
import { ZodValidationPipe } from './validation/zod-validation.pipe';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dns from 'dns';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { apiReference } from '@scalar/express-api-reference';
import redoc from 'redoc-express';

// Configure DNS to Google Public DNS for better connectivity
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // Ignore DNS set errors if restricted in container/environment
}

const MAX_BODY_SIZE = '5mb';
const MIN_SECRET_LENGTH = 32;

function validateRequiredSecrets(): void {
  const required: string[] = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    const value = process.env[key];
    if (!value || value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `${key} must be set and at least ${MIN_SECRET_LENGTH} characters long`,
      );
    }
  }
}

async function bootstrap() {
  if (
    process.env.SENTRY_DSN &&
    !process.env.SENTRY_DSN.includes('placeholder')
  ) {
    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
      });
    } catch (e) {
      console.warn('Sentry initialization skipped:', e);
    }
  }

  validateRequiredSecrets();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');

  // Attach/inherit a request id and echo it back on the response for tracing.
  app.use((req, res, next) => {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length > 0
        ? incoming
        : randomUUID();
    (req as unknown as { id: string }).id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // Parse JSON / URL-encoded bodies with an explicit size limit to mitigate
  // large-payload abuse. (Nest's default body parser is disabled above.)
  app.use(json({ limit: MAX_BODY_SIZE }));
  app.use(urlencoded({ extended: true, limit: MAX_BODY_SIZE }));

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Cookie parser (required for HttpOnly cookie reading)
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
    new ZodValidationPipe(),
  );

  // CORS — allow all known frontends with credentials
  // Read from CORS_ALLOWED_ORIGINS env var (comma-separated), fallback to all 4 known local ports
  const localOrigins = [
    'http://localhost:3000', // agency-web
    'http://localhost:3001', // admin-dashboard
    'http://localhost:3002', // client-portal
    'http://localhost:3003', // auth-gateway
  ];
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];
  const allowedOrigins = [...localOrigins, ...envOrigins];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true, // Required for HttpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Swagger (OpenAPI 3.1)
  let openApiDocument: any;
  try {
    openApiDocument = getOpenApiDocumentation(app);
    SwaggerModule.setup('api/docs', app, openApiDocument);
  } catch (e) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Trifusion-Dynamics Auth Service')
      .setDescription('Auth API with HttpOnly cookie-based JWT authentication')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();
    const documentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    openApiDocument = documentFactory();
    SwaggerModule.setup('api/docs', app, documentFactory);
  }

  // Scalar API Reference (modern, fast alternative to Swagger UI)
  app.use(
    '/api/docs/scalar',
    apiReference({
      spec: {
        content: openApiDocument,
      },
      theme: 'kepler',
      layout: 'modern',
      hideDownloadButton: false,
      hideClientButton: false,
      defaultHttpClient: {
        targetKey: 'node',
        clientKey: 'axios',
      },
    }),
  );

  // Redoc UI (three-panel layout)
  app.use(
    '/api/docs/redoc',
    redoc({
      specUrl: '/api/docs-json',
      title: 'Auth Service API - Redoc',
      redocOptions: {
        theme: {
          colors: {
            primary: {
              main: '#1a73e8',
            },
          },
          typography: {
            fontFamily:
              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            code: {
              fontSize: '13px',
              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
            },
          },
          sidebar: {
            backgroundColor: '#f8f9fa',
          },
        },
        expandResponses: '200,201',
        hideDownloadButton: false,
        hideHostname: false,
        pathInMiddlePanel: true,
        requiredPropsFirst: true,
        scrollYOffset: 60,
        showExtensions: true,
      },
    }),
  );

  // Serve OpenAPI JSON spec for Redoc
  app.use('/api/docs-json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(openApiDocument, null, 2));
  });

  // Graceful shutdown: stop accepting new work, let in-flight requests finish,
  // then close database connections and exit.
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '8000', 10);
  await app.listen(port);
  console.log(`🚀 Auth API running on port ${port}`);
  console.log(`📚 API Documentation:`);
  console.log(`   Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`   Scalar UI:  http://localhost:${port}/api/docs/scalar`);
  console.log(`   Redoc UI:   http://localhost:${port}/api/docs/redoc`);

  const shutdown = async (signal: string) => {
    console.warn(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
bootstrap();
