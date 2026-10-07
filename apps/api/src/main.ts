import './opentelemetry';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  const rawOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3001');
  const origins = rawOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const isWildcard = origins.length === 0 || origins.includes('*');
  app.enableCors({
    origin: isWildcard ? false : origins.length === 1 ? origins[0] : origins,
    credentials: !isWildcard,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const port = configService.get<number>('PORT', 3000);

  const isProd = configService.get<string>('NODE_ENV') === 'production';
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Flexy HRMS API')
      .setDescription('Enterprise Human Resource Management SaaS API')
      .setVersion('1.0.0')
      .setContact('Flexy HRMS Team', 'https://flexy-hrms.example.com', 'support@flexy-hrms.example.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer(`http://localhost:${port}`, 'Local Development')
      .addBearerAuth(undefined, 'bearer')
      .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header', description: 'Tenant identifier for multi-tenant isolation' }, 'x-tenant-id')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    const fs = await import('fs');
    const path = await import('path');
    const outputPath = path.resolve(process.cwd(), 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    logger.log(`OpenAPI spec written to ${outputPath}`);
  }

  await app.listen(port);

  logger.log(`Application running on port ${port}`);
  if (!isProd) {
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
