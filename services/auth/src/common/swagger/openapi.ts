import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function getOpenApiDocumentation(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trifusion-Dynamics Auth Service')
    .setDescription('Auth API with HttpOnly cookie-based JWT authentication')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [],
    ignoreGlobalPrefix: false,
  });

  (document as any).openapi = '3.1.0';
  return document;
}
