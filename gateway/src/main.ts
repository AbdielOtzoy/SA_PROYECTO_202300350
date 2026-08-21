import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { existsSync, readFileSync } from 'node:fs';
import { AppModule } from './app.module';
import { AppConfig } from './common/config/app-config';
import { GrpcExceptionFilter } from './common/grpc/grpc-error';

async function bootstrap(): Promise<void> {
  const config = new AppConfig();
  const cert = config.tlsCertificateFile;
  const key = config.tlsKeyFile;
  if (!existsSync(cert) || !existsSync(key)) throw new Error('Falta certificado TLS');
  const app = await NestFactory.create(AppModule, {
    httpsOptions: { cert: readFileSync(cert), key: readFileSync(key) },
  });
  app.use(cookieParser());
  app.useGlobalFilters(new GrpcExceptionFilter());
  app.enableCors({ origin: config.frontendUrl, credentials: true });
  await app.listen(config.gatewayPort, '0.0.0.0');
}

void bootstrap();
