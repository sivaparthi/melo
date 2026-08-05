import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      request.method,
    );
    const origin = request.get('origin');
    const allowedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
    if (mutating && origin && origin !== allowedOrigin) {
      response.status(403).json({ message: 'Request origin is not allowed.' });
      return;
    }
    next();
  });
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  if (process.env.NODE_ENV === 'production') {
    app.useStaticAssets(join(__dirname, '../../web/dist'));
  }
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
